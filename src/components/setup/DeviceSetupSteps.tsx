import React, { useState, useEffect, useRef } from 'react'
import { FiKey, FiEdit, FiMonitor, FiRefreshCw } from 'react-icons/fi'
import { getAddressFromMnemonic, jwkFromMnemonic, generateSeedPhrase } from '../../utils/walletUtils'
import { CreateProvider } from './CreateProvider'
import { useProviders } from '../../contexts/ProviderContext'
import PortalIntegration, { PortalConfig, WalletJson } from '../../utils/portalIntegration'
import StepCard from './StepCard'
import WalletGenerationSection from './WalletGenerationSection'
import SimpleTabs from './SimpleTabs'

interface DeviceSetupStepsProps {
  walletAddress: string
  walletBalance: string | null
  onProviderCreated?: () => void
  deviceIp?: string
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

interface ProviderDetailsState {
  id: string
  name: string
  description: string
  isStaked: boolean
}

type TabType = 'wallet' | 'provider' | 'device'

export default function DeviceSetupSteps({ 
  walletAddress, 
  walletBalance, 
  deviceIp = '192.168.4.1',
  onProviderCreated 
}: DeviceSetupStepsProps) {
  const { currentProvider, refreshProviders } = useProviders()
  const [showPreChecklist, setShowPreChecklist] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('wallet')
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
  const [connectionError, setConnectionError] = useState(false)
  const [providerDetails, setProviderDetails] = useState<ProviderDetailsState>({
    id: '',
    name: '',
    description: '',
    isStaked: false
  })
  const portalRef = useRef<PortalIntegration | null>(null)

  // Initialize portal integration and check existing config - only after pre-checklist
  useEffect(() => {
    if (!showPreChecklist) {
      portalRef.current = new PortalIntegration(`http://${deviceIp}`)
      checkExistingConfiguration()
    }
  }, [deviceIp, showPreChecklist])

  // Check if there's already configuration stored on the device
  const checkExistingConfiguration = async () => {
    setIsCheckingExisting(true)
    setConnectionError(false)
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
            setProviderDetails(prev => ({ ...prev, id: data.PROVIDER_ID || '' }))
            
            // Cache the provider ID
            localStorage.setItem('generatedProviderId', data.PROVIDER_ID)
          } catch (parseError) {
            console.error('Error parsing existing wallet data:', parseError)
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing configuration:', error)
      // Check if it's a connection error (timeout, network error, etc.)
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
        setConnectionError(true)
      }
    } finally {
      setIsCheckingExisting(false)
    }
  }

  // Handle retry connection
  const handleRetryConnection = () => {
    checkExistingConfiguration()
  }

  // Check if wallet step is complete
  const isWalletStepComplete = () => {
    return walletInfo.walletJson !== null && addressInfo.address !== ''
  }

  // Check if provider step is complete
  const isProviderStepComplete = () => {
    return providerDetails.isStaked
  }

  const isDeviceStepComplete = () => {
    // Device step is always accessible once provider is complete
    return true
  }

  // Get steps configuration for tabs (ordered flow)
  const getSteps = () => {
    const walletComplete = isWalletStepComplete()
    const providerComplete = isProviderStepComplete()

    return [
      {
        id: 'wallet',
        title: 'Device Wallet Generation',
        icon: FiKey,
        isCompleted: walletComplete,
        isEnabled: true // Always enabled as first step
      },
      {
        id: 'provider',
        title: 'Provider Details',
        icon: FiEdit,
        isCompleted: providerComplete,
        isEnabled: walletComplete // Can only access if wallet step is complete
      },
      {
        id: 'device',
        title: 'Device Iframe',
        icon: FiMonitor,
        isCompleted: false, // Never marked as "complete"
        isEnabled: providerComplete // Can only access if provider step is complete
      }
    ]
  }

  // Handle tab change with validation (ordered flow)
  const handleTabChange = (stepId: string) => {
    const steps = getSteps()
    const targetStep = steps.find(step => step.id === stepId)
    
    if (targetStep && targetStep.isEnabled) {
      setActiveTab(stepId as TabType)
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
      setProviderDetails(prev => ({ ...prev, id: address }))
      
      // Cache the provider ID
      localStorage.setItem('generatedProviderId', address)
      
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

  // Handle provider form submission with staking
  const handleProviderSave = async (details: any) => {
    try {
      // Update provider details state
      setProviderDetails(prev => ({ 
        ...prev, 
        name: details.name,
        description: details.description,
        isStaked: details.isStaked || false
      }))

    //   // If this creates a new provider, notify parent
    //   if (details.isStaked && onProviderCreated) {
    //     await refreshProviders()
    //     onProviderCreated()
    //   }
    } catch (error) {
      console.error('Error saving provider:', error)
    }
  }

  const renderTabContent = () => {
    // Don't render any content if pre-checklist hasn't been acknowledged
    if (showPreChecklist) {
      return null
    }

    switch (activeTab) {
      case 'wallet':
        return (
          <StepCard icon={FiKey} title="Device Wallet Generation">
            {connectionError ? (
              <div className="connection-error">
                <div className="error-card">
                  <h3>⚠️ Not Connected to Device Network</h3>
                  <p>Connect to your device's "DeviceSetup" WiFi network and try again.</p>
                  
                  <div className="connection-actions">
                    <button 
                      onClick={handleRetryConnection}
                      className="retry-button"
                      disabled={isCheckingExisting}
                    >
                      <FiRefreshCw className={isCheckingExisting ? 'spinning' : ''} />
                      {isCheckingExisting ? 'Checking...' : 'Retry Connection'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </StepCard>
        )

      case 'provider':
        return (
          <StepCard icon={FiEdit} title="Provider Details">
            <CreateProvider
              providerId={providerDetails.id}
              onProviderCreated={handleProviderSave}
              walletBalance={walletBalance}
            />
          </StepCard>
        )

      case 'device':
        return (
          <StepCard icon={FiMonitor} title="Device Iframe">
            <div className="iframe-container">
              <iframe
                src={`http://${deviceIp}/2`}
                title="Device Configuration"
                className="device-iframe"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
            <div className="iframe-info">
              <p>
                <FiMonitor />
                Device management interface for IP: {deviceIp}
              </p>
            </div>
          </StepCard>
        )

      default:
        return null
    }
  }

  return (
    <div className="device-setup-steps">
      {/* Pre-checklist Modal */}
      {showPreChecklist && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#0c4a6e', margin: 0 }}>📱 Device Setup Pre-Checklist</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
                Before proceeding with the setup, please complete these steps:
              </p>
              <ol style={{ paddingLeft: '20px', lineHeight: '1.8', marginBottom: '20px' }}>
                <li><strong>Plug in your device</strong> and wait 60 seconds for it to boot up</li>
                <li><strong>Connect your computer's WiFi</strong> to the "DeviceSetup" network</li>
                <li><strong>Ensure you have a stable connection</strong> to the device</li>
              </ol>
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #dc2626',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '13px'
              }}>
                <strong>⚠️ IMPORTANT:</strong> DO NOT refresh this page or close your browser during the setup process!
              </div>
              <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                Once you click "OK", you'll see the three setup steps and can proceed with the configuration.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowPreChecklist(false)}
                className="confirm-button"
                style={{ width: '100%', padding: '12px' }}
              >
                OK - I'm Ready to Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main setup content - only show after pre-checklist is acknowledged */}
      {!showPreChecklist && (
        <>
          {/* General setup warning message */}
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#dc2626',
            fontWeight: 'bold',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ⚠️ IMPORTANT: DO NOT refresh this page or close your browser during the setup process!
            <br />
            Please be patient and complete each step. Once finished with one step, click on the next unlocked step.
          </div>

          <SimpleTabs
            tabs={getSteps()}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            mode="gated"
          >
            {renderTabContent()}
          </SimpleTabs>
        </>
      )}

    </div>
  )
}
