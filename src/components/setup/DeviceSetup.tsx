import React, { useState, useEffect, useRef } from 'react'
import { FiWifi, FiMonitor, FiCheckCircle, FiDatabase, FiKey, FiPlus, FiEye, FiEyeOff, FiRefreshCw, FiPower } from 'react-icons/fi'
import { getAddressFromMnemonic, jwkFromMnemonic, generateSeedPhrase } from '../../utils/walletUtils'
import { ProviderDetails } from '../providers/ProviderDetails'
import { aoHelpers, MINIMUM_STAKE_AMOUNT } from '../../utils/ao-helpers'
import { useProviders } from '../../contexts/ProviderContext'
import PortalIntegration, { PortalConfig, WalletJson } from '../../utils/portalIntegration'
import './DeviceSetup.css'

interface DeviceSetupProps {
  walletAddress: string
  walletBalance: string | null
  onProviderCreated?: () => void
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

interface ProviderDetails {
  id: string
  isEditing: boolean
  isStaked: boolean
}

export default function DeviceSetup({ walletAddress, walletBalance, onProviderCreated }: DeviceSetupProps) {
  const { currentProvider, refreshProviders } = useProviders()
  const [setupStep, setSetupStep] = useState<'device' | 'wifi' | 'ready'>('device')
  const [showSeedPhrase, setShowSeedPhrase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressInfo, setAddressInfo] = useState<AddressInfo>({ address: '', isGenerating: false, error: null })
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({ walletJson: null, isGenerating: false, error: null })
  const [providerDetails, setProviderDetails] = useState<ProviderDetails>({ id: '', isEditing: false, isStaked: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string | null>(null)
  const [existingConfigStatus, setExistingConfigStatus] = useState<ExistingConfigStatus | null>(null)
  const [existingConfigData, setExistingConfigData] = useState<ExistingConfigData | null>(null)
  const [isCheckingExisting, setIsCheckingExisting] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const portalRef = useRef<PortalIntegration | null>(null)
  const iframeId = 'device-setup-iframe'

  // Load cached provider ID from localStorage on mount
  useEffect(() => {
    const cachedProviderId = localStorage.getItem('generatedProviderId')
    if (cachedProviderId) {
      setProviderDetails(prev => ({ ...prev, id: cachedProviderId }))
    }
  }, [])

  const handleShowInterface = async () => {
    // Initialize portal integration
    portalRef.current = new PortalIntegration('http://192.168.4.1')
    
    // Check for existing configuration
    await checkExistingConfiguration()
  }

  const handleReadyToSetup = () => {
    setSetupStep('ready')
    handleShowInterface()
  }

  // Check if there's already configuration stored on the device
  const checkExistingConfiguration = async () => {
    setIsCheckingExisting(true)
    try {
      // Check status first
      const statusResponse = await fetch('http://192.168.4.1/api/status')
      const status: ExistingConfigStatus = await statusResponse.json()
      setExistingConfigStatus(status)
      
      // If any data exists, fetch the actual values
      if (status.seedPhrase || status.providerId || status.walletJson) {
        const dataResponse = await fetch('http://192.168.4.1/api/env-vars')
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
      // Don't show error to user, just continue with normal flow
    } finally {
      setIsCheckingExisting(false)
    }
  }

  // Handle overwrite confirmation
  const handleOverwriteConfirm = () => {
    setShowOverwriteConfirm(false)
    handleGenerateAndInject(true)
  }

  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false)
  }

  // Generate 12-word seed phrase and inject into RNG miner
  const handleGenerateAndInject = async (forceOverwrite = false) => {
    // Check if data already exists and we're not forcing overwrite
    if (!forceOverwrite && existingConfigStatus && 
        (existingConfigStatus.seedPhrase || existingConfigStatus.providerId || existingConfigStatus.walletJson)) {
      setShowOverwriteConfirm(true)
      return
    }

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
      
      // Cache the generated provider ID
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
  const handleProviderSubmit = async (details: any) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      console.log('Provider submit details:', details)
      
      // Validate required fields
      if (!details.name?.trim()) {
        throw new Error('Provider name is required')
      }
      if (!details.description?.trim()) {
        throw new Error('Provider description is required')
      }
      
      // Check if we have a provider ID (generated address)
      const providerId = details.providerId || addressInfo.address || providerDetails.id
      if (!providerId) {
        throw new Error('No provider ID available. Please refresh to generate an address first.')
      }
      
      // Check if provider already exists (update mode)
      const existingProvider = currentProvider
      
      if (existingProvider) {
        // Update existing provider
        console.log('Updating existing provider:', providerId)
        
        // Prepare provider details for update
        const providerDetailsForUpdate = {
          name: details.name,
          description: details.description || '',
          twitter: details.twitter || '',
          discord: details.discord || '',
          telegram: details.telegram || '',
          domain: details.domain || ''
        }
        
        // Check if there's a provider ID override to use as actor ID
        if (details.providerId && existingProvider.providerId) {
          await aoHelpers.updateProviderActor(existingProvider.providerId, details.providerId)
        }
        
        await aoHelpers.updateProviderDetails(providerDetailsForUpdate)
        
        // Update provider details state
        setProviderDetails(prev => ({ ...prev, id: providerId, isStaked: true }))
        
        console.log('Successfully updated provider details!')
        
        // Refresh providers to get updated data
        await refreshProviders()
        
      } else {
        // New provider - stake and register
        console.log('Creating new provider:', providerId)
        
        // Check wallet balance
        if (!walletBalance) {
          throw new Error('Unable to fetch wallet balance. Please try again.')
        }
        
        // Convert minimum stake amount for display
        const minStakeDisplay = parseFloat(walletBalance) / Math.pow(10, 12)
        const minRequiredDisplay = parseFloat(MINIMUM_STAKE_AMOUNT) / Math.pow(10, 12)
        
        if (minStakeDisplay < minRequiredDisplay) {
          throw new Error(`Insufficient balance. You need at least ${minRequiredDisplay.toLocaleString()} tokens to become a provider.`)
        }
        
        // Prepare provider details for staking
        const providerDetailsForStaking = {
          name: details.name,
          description: details.description,
          twitter: details.twitter || '',
          discord: details.discord || '',
          telegram: details.telegram || '',
          domain: details.domain || ''
        }
        
        console.log('Staking with details:', providerDetailsForStaking)
        console.log('Using provider ID:', providerId)
        console.log('Stake amount:', MINIMUM_STAKE_AMOUNT)
        
        // Call the staking function with provider details and actor ID
        const result = await aoHelpers.stakeTokens(
          MINIMUM_STAKE_AMOUNT, 
          providerDetailsForStaking, 
          providerId // Pass provider ID as actor
        )
        
        if (!result) {
          throw new Error('Staking transaction failed')
        }
        
        // Update provider details state
        setProviderDetails(prev => ({ ...prev, id: providerId, isStaked: true }))
        
        // Cache the staked provider ID
        localStorage.setItem('stakedProviderId', providerId)
        
        console.log('Successfully staked and registered as provider!')
        
        // Refresh providers to get updated data
        await refreshProviders()
        
        // Notify parent component
        onProviderCreated?.()
      }
      
      // Clear error on success
      setError(null)
      
    } catch (err) {
      console.error('Error submitting provider details:', err)
      setError(err instanceof Error ? err.message : 'Failed to process provider details')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="device-setup">
      {/* Step 1: Device Power */}
      {setupStep === 'device' && (
        <div className="setup-card">
          <div className="card-header">
            <FiPower />
            <h3>Step 1: Power On Your RNG Miner</h3>
          </div>
          <div className="card-content">
            <div className="instructions">
              <h4>Device Setup Instructions:</h4>
              <ol>
                <li>Plug your RNG miner into power</li>
                <li>Wait for the device to boot up (about 3 minutes)</li>
                <li>The device will create a WiFi access point called "DeviceSetup"</li>
              </ol>
              <button onClick={() => setSetupStep('wifi')} className="power-button">
                <FiPower />
                I've Plugged In My Device - Continue to WiFi Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: WiFi Connection */}
      {setupStep === 'wifi' && (
        <div className="setup-card">
          <div className="card-header">
            <FiWifi />
            <h3>Step 2: Connect to Device WiFi</h3>
          </div>
          <div className="card-content">
            <div className="instructions">
              <h4>Connect to your device:</h4>
              <ol>
                <li>Open your device's WiFi settings</li>
                <li>Look for a network named <strong>"DeviceSetup"</strong></li>
                <li>Connect to the DeviceSetup network</li>
                <li>Click the button below when connected</li>
              </ol>
            </div>
            <button onClick={handleReadyToSetup} className="connect-button">
              <FiCheckCircle />
              I Have Connected and Am Ready to Setup Provider
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Main Setup Interface */}
      {setupStep === 'ready' && (
        <div className="setup-card iframe-card">
          <div className="card-header">
            <FiMonitor />
            <h3>Device Configuration Interface</h3>
          </div>
          <div className="card-content">
            
            {/* Wallet Generation Section */}
            <div className="env-vars-section">
              <div className="env-vars-header">
                <div className="env-vars-title">
                  <FiKey />
                  <h4>Step 1: Inject Wallet into RNG Miner</h4>
                </div>
                <div className="env-vars-controls">
                  {!walletInfo.walletJson && !isCheckingExisting && (
                    <button 
                      onClick={() => handleGenerateAndInject(false)}
                      className="generate-button"
                      disabled={isGenerating}
                      title="Generate wallet and inject into RNG miner"
                    >
                      <FiPlus />
                      {isGenerating ? 'Generating...' : 'Generate Wallet and Inject into RNG Miner'}
                    </button>
                  )}
                  {walletInfo.walletJson && (
                    <button 
                      onClick={() => setShowOverwriteConfirm(true)}
                      className="overwrite-button"
                      disabled={isGenerating}
                      title="Generate new seed phrase and overwrite existing data"
                    >
                      <FiRefreshCw />
                      Make New Seed Phrase and Overwrite Old
                    </button>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="env-vars-error">
                  <p>{error}</p>
                </div>
              )}
              
              <div className="env-vars-content">
                <div className="wallet-display">
                  {isCheckingExisting ? (
                    <div className="wallet-loading">
                      <FiRefreshCw className="spinning" />
                      Checking for existing configuration...
                    </div>
                  ) : (walletInfo.isGenerating || isGenerating) ? (
                    <div className="wallet-loading">
                      <FiRefreshCw className="spinning" />
                      {generationStep || 'Generating wallet...'}
                    </div>
                  ) : walletInfo.error ? (
                    <div className="wallet-error">
                      <p>{walletInfo.error}</p>
                      <small>Click refresh to try again</small>
                    </div>
                  ) : walletInfo.walletJson ? (
                    <div className="wallet-success">
                      <div className="wallet-item">
                        <label>Provider ID:</label>
                        <span className="address-value">
                          {walletInfo.walletJson.address}
                        </span>
                      </div>
                      {generatedSeedPhrase && (
                        <div className="wallet-item">
                          <label>Seed Phrase:</label>
                          <div className="seed-phrase-container">
                            <span className="address-value" style={{fontSize: '0.85rem', wordBreak: 'break-word', filter: showSeedPhrase ? 'none' : 'blur(4px)'}}>
                              {generatedSeedPhrase}
                            </span>
                            <button 
                              onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                              className="eye-button"
                              title={showSeedPhrase ? 'Hide seed phrase' : 'Show seed phrase'}
                            >
                              {showSeedPhrase ? <FiEyeOff /> : <FiEye />}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="wallet-item">
                        <label>Status:</label>
                        <span className="json-value">
                          ✓ Injected into RNG Miner
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="wallet-placeholder">
                      <p>Click "Generate Wallet and Inject into RNG Miner" to create a new wallet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Provider Details Section - Now Step 2 */}
            {(walletInfo.walletJson?.address || addressInfo.address || providerDetails.id) && (
              <div className="provider-details-section">
                <div className="provider-header">
                  <div className="provider-title">
                    <FiDatabase />
                    <h4>Step 2: Provider Configuration</h4>
                  </div>
                  <div className="provider-status">
                    <span className="status-badge not-staked">{providerDetails.isStaked ? 'Provider Configured' : 'Ready to Configure'}</span>
                  </div>
                </div>
                
                <div className="provider-content">
                  <ProviderDetails
                    currentProvider={currentProvider}
                    mode="setup"
                    onSave={handleProviderSubmit}
                    isSubmitting={isSubmitting}
                    walletBalance={walletBalance}
                    initialProviderId={walletInfo.walletJson?.address || addressInfo.address || providerDetails.id}
                  />
                </div>
              </div>
            )}

            {/* WiFi Configuration Section - Now Step 3 */}
            <div className="wifi-config-section">
              <div className="wifi-header">
                <div className="wifi-title">
                  <FiWifi />
                  <h4>Step 3: Configure Device WiFi</h4>
                </div>
              </div>
              <p>Configure your device using the interface below:</p>
              <div className="iframe-container">
                <iframe
                  id={iframeId}
                  src="http://192.168.4.1/2"
                  title="Device Setup Interface"
                  className="device-iframe"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
              <div className="iframe-info">
                <p>
                  <FiWifi />
                  If the interface doesn't load, ensure you're connected to the "DeviceSetup" network 
                  and the device is powered on.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚠️ Warning: Overwrite Existing Data</h3>
            </div>
            <div className="modal-body">
              <p>This will overwrite the existing seed phrase, provider ID, and wallet data stored on your device.</p>
              <p><strong>This action cannot be undone.</strong></p>
              <p>Are you sure you want to continue?</p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={handleOverwriteCancel}
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                onClick={handleOverwriteConfirm}
                className="confirm-button"
                disabled={isGenerating}
              >
                Yes, Overwrite Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
