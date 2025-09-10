import React, { useState, useEffect, useRef } from 'react'
import { FiEdit, FiMonitor, FiKey } from 'react-icons/fi'
import { ProviderDetails } from '../providers/ProviderDetails'
import { getAddressFromMnemonic, jwkFromMnemonic, generateSeedPhrase } from '../../utils/walletUtils'
import { useProviders } from '../../contexts/ProviderContext'
import PortalIntegration, { PortalConfig, WalletJson } from '../../utils/portalIntegration'
import WalletGenerationSection from './WalletGenerationSection'
import SimpleTabs from './SimpleTabs'

interface ProviderManagementTabsProps {
  walletAddress: string
  walletBalance: string | null
  deviceIp?: string
  onProviderUpdated?: () => void
}

interface AddressInfo {
  address: string
  isGenerating: boolean
  error: string | null
}

interface WalletInfo {
  walletJson: WalletJson | null
  isGenerating: boolean
  error: string | null
}

interface ExistingConfigStatus {
  seedPhrase: boolean
  providerId: boolean
  walletJson: boolean
}

interface ExistingConfigData {
  SEED_PHRASE?: string
  PROVIDER_ID?: string
  WALLET_JSON?: string
  LOG_CONSOLE_LEVEL?: string
  NETWORK_IP?: string
  NETWORK_MODE?: string
}

type TabType = 'provider' | 'wallet' | 'device'

export default function ProviderManagementTabs({ 
  walletAddress, 
  walletBalance, 
  deviceIp = '192.168.4.1',
  onProviderUpdated 
}: ProviderManagementTabsProps) {
  const { currentProvider, refreshProviders } = useProviders()
  const [activeTab, setActiveTab] = useState<TabType>('provider')
  const [addressInfo, setAddressInfo] = useState<AddressInfo>({ address: '', isGenerating: false, error: null })
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({ walletJson: null, isGenerating: false, error: null })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string | null>(null)
  const [showSeedPhrase, setShowSeedPhrase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingConfigStatus, setExistingConfigStatus] = useState<ExistingConfigStatus | null>(null)
  const [existingConfigData, setExistingConfigData] = useState<ExistingConfigData | null>(null)
  const [isCheckingExisting, setIsCheckingExisting] = useState(false)
  const portalRef = useRef<PortalIntegration | null>(null)

  // Initialize portal integration on mount
  useEffect(() => {
    portalRef.current = new PortalIntegration(`http://${deviceIp}`)
    checkExistingConfiguration()
  }, [deviceIp])

  // Check if there's already configuration stored on the device
  const checkExistingConfiguration = async () => {
    setIsCheckingExisting(true)
    try {
      // Check status first
      const statusResponse = await fetch(`http://${deviceIp}/api/status`)
      const status: ExistingConfigStatus = await statusResponse.json()
      setExistingConfigStatus(status)
      
      // If any data exists, fetch the actual values
      if (status.seedPhrase || status.providerId || status.walletJson) {
        const dataResponse = await fetch(`http://${deviceIp}/api/env-vars`)
        const data: ExistingConfigData = await dataResponse.json()
        setExistingConfigData(data)
        
        // Pre-populate the UI with existing data
        if (data.SEED_PHRASE && data.PROVIDER_ID && data.WALLET_JSON) {
          setGeneratedSeedPhrase(data.SEED_PHRASE)
          
          // Parse wallet JSON to get address
          try {
            const walletJson: WalletJson = {
              address: data.PROVIDER_ID,
              privateKey: data.WALLET_JSON
            }
            setWalletInfo({ walletJson, isGenerating: false, error: null })
            setAddressInfo({ address: data.PROVIDER_ID, isGenerating: false, error: null })
          } catch (parseError) {
            console.error('Error parsing existing wallet data:', parseError)
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing configuration:', error)
      // Don't show error to user, just continue with normal flow
    } finally {
      setIsCheckingExisting(false)
    }
  }


  // Generate 12-word seed phrase and inject into RNG miner
  const handleGenerateAndInject = async (forceOverwrite = false) => {

    setIsGenerating(true)
    setError(null)
    setGenerationStep('')
    
    try {
      setGenerationStep('Generating 12-word seed phrase...')
      // Generate a new seed phrase
      const newSeedPhrase = await generateSeedPhrase()
      setGeneratedSeedPhrase(newSeedPhrase)
      console.log('Generated seed phrase:', newSeedPhrase)
      
      setGenerationStep('Creating JWK wallet from seed phrase...')
      // Generate wallet from the new seed phrase
      const wallet = await jwkFromMnemonic(newSeedPhrase)
      console.log('Generated JWK wallet')
      
      setGenerationStep('Deriving provider address...')
      const address = await getAddressFromMnemonic(newSeedPhrase)
      console.log('Generated address:', address)
      
      const walletJson: WalletJson = {
        address,
        privateKey: JSON.stringify(wallet)
      }
      
      setGenerationStep('Injecting into RNG miner...')
      
      // Update local state
      setWalletInfo({ walletJson, isGenerating: false, error: null })
      setAddressInfo({ address, isGenerating: false, error: null })
      
      // Inject all data into iframe - only inject JWK for wallet_json
      const config: PortalConfig = {
        seed_phrase: newSeedPhrase,
        provider_id: address,
        wallet_json: JSON.stringify(wallet)
      }
      
      if (!portalRef.current) {
        throw new Error('Portal integration not initialized. Please refresh and try again.')
      }
      
      await portalRef.current.setAllConfig(config)
      setGenerationStep('Complete!')
      console.log('Successfully generated and injected all data into RNG miner')
      
      // Clear step after a moment
      setTimeout(() => setGenerationStep(''), 2000)
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate and inject data'
      setError(`Generation/Injection failed: ${errorMsg}`)
      console.error('Generation/Injection error:', error)
      
      // Reset wallet state on error
      setWalletInfo({ walletJson: null, isGenerating: false, error: errorMsg })
      setAddressInfo({ address: '', isGenerating: false, error: errorMsg })
      setGeneratedSeedPhrase('')
    } finally {
      setIsGenerating(false)
      setGenerationStep('')
    }
  }

  const handleProviderSave = async (details: any) => {
    try {
      await refreshProviders()
      onProviderUpdated?.()
    } catch (error) {
      console.error('Error updating provider:', error)
    }
  }

  // Get tabs configuration (ungated mode - free navigation)
  const getTabs = () => {
    return [
      {
        id: 'provider',
        title: 'Provider Details',
        icon: FiEdit
      },
      {
        id: 'wallet',
        title: 'Device Wallet Generation',
        icon: FiKey
      },
      {
        id: 'device',
        title: 'Device Iframe',
        icon: FiMonitor
      }
    ]
  }

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'provider':
        return (
          <ProviderDetails
            currentProvider={currentProvider}
            mode="setup"
            onSave={handleProviderSave}
            submitLabel="Update Provider"
            isSubmitting={false}
            walletBalance={walletBalance}
          />
        )

      case 'wallet':
        return (
          <div className="wallet-content">
            <div className="info-section">
              <WalletGenerationSection
                walletInfo={walletInfo}
                isCheckingExisting={isCheckingExisting}
                isGenerating={isGenerating}
                generationStep={generationStep}
                error={error}
                generatedSeedPhrase={generatedSeedPhrase}
                showSeedPhrase={showSeedPhrase}
                existingConfigStatus={existingConfigStatus}
                onGenerateAndInject={handleGenerateAndInject}
                onToggleShowSeedPhrase={() => setShowSeedPhrase(!showSeedPhrase)}
              />
            </div>
          </div>
        )

      case 'device':
        return (
          <div className="device-content">
            <div className="device-ip">
              <span>Device IP: </span>
              <code>{deviceIp}</code>
            </div>
            <div className="device-iframe-wrapper">
              <iframe
                src={`http://${deviceIp}/2`}
                title="Device Management"
                className="device-iframe"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="provider-management-tabs">
      <SimpleTabs
        tabs={getTabs()}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        mode="ungated"
      >
        {renderTabContent()}
      </SimpleTabs>

    </div>
  )
}
