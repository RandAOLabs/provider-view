import React, { useState, useEffect } from 'react'
import { FiKey, FiDatabase, FiCopy, FiExternalLink, FiSettings, FiMonitor, FiEdit } from 'react-icons/fi'
import { ConnectWallet } from '../../components/common/ConnectWallet'
import { Spinner } from '../../components/common/Spinner'
import { ProviderDetails } from '../../components/providers/ProviderDetails'
import { TOKEN_DECIMALS } from '../../utils/ao-helpers'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import DeviceSetup from '../../components/setup/DeviceSetup'
import './Setup.css'

type SetupMode = 'checking_owner' | 'no_wallet' | 'insufficient_tokens' | 'device_setup' | 'provider_management'

export default function Setup() {
  const { address: walletAddress } = useWallet()
  const { providers, currentProvider, refreshProviders, loading } = useProviders()
  const [setupMode, setSetupMode] = useState<SetupMode>('checking_owner')
  const [addressCopied, setAddressCopied] = useState(false)
  const [walletBalance, setWalletBalance] = useState<string | null>(null)
  const [showDeviceSetup, setShowDeviceSetup] = useState(false)
  const [showProviderEdit, setShowProviderEdit] = useState(false)

  // Determine setup mode based on wallet connection, provider ownership, and balance
  useEffect(() => {
    // If no wallet connected, assume not owner
    if (!walletAddress) {
      setSetupMode('no_wallet')
      return
    }

    // If still loading provider data, show checking state
    if (loading) {
      setSetupMode('checking_owner')
      return
    }

    // Check if user is a provider owner
    const isProviderOwner = currentProvider !== undefined
    
    if (isProviderOwner) {
      // Owner path: bypass wallet/token checks, go straight to management
      setSetupMode('provider_management')
      return
    }

    // Non-owner path: check token balance
    if (walletBalance) {
      const balanceNum = parseFloat(walletBalance) / Math.pow(10, TOKEN_DECIMALS)
      if (balanceNum < 10000) {
        setSetupMode('insufficient_tokens')
      } else {
        setSetupMode('device_setup')
      }
    }
  }, [walletAddress, currentProvider, walletBalance, loading])

  // Fetch wallet balance when wallet is connected
  useEffect(() => {
    if (walletAddress && !walletBalance) {
      const fetchBalance = async () => {
        try {
          const aoHelpers = await import('../../utils/ao-helpers')
          const balance = await aoHelpers.aoHelpers.getWalletBalance(walletAddress)
          setWalletBalance(balance)
        } catch (err) {
          console.error('Error fetching wallet balance:', err)
        }
      }
      fetchBalance()
    }
  }, [walletAddress, walletBalance])

  const copyAddress = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress)
        setAddressCopied(true)
        setTimeout(() => setAddressCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  const handleProviderCreated = () => {
    // Refresh providers and switch to management mode
    refreshProviders()
    setSetupMode('provider_management')
  }

  const renderContent = () => {
    switch (setupMode) {
      case 'checking_owner':
        return (
          <div className="loading-container">
            <Spinner text="Checking provider ownership..." />
          </div>
        )
      case 'no_wallet':
        return (
          <div className="setup-card">
            <div className="card-header">
              <FiKey />
              <h3>Connect Your Wallet</h3>
            </div>
            <div className="card-content">
              <div className="instructions">
                <h4>Before setting up your provider, you need:</h4>
                <ol>
                  <li>Install and connect your Wander wallet</li>
                  <li>Have at least 10,000 tokens in your wallet</li>
                </ol>
                <p>Don't have Wander wallet yet?</p>
                <a 
                  href="https://www.wander.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="download-link"
                >
                  <FiExternalLink />
                  Download Wander Wallet
                </a>
              </div>
              <div className="wallet-status">
                <p>Please connect your wallet to continue.</p>
              </div>
            </div>
          </div>
        )

      case 'insufficient_tokens':
        return (
          <div className="setup-card">
            <div className="card-header">
              <FiDatabase />
              <h3>Token Balance Required</h3>
            </div>
            <div className="card-content">
              <div className="instructions">
                <h4>You need 10,000 tokens to become a provider</h4>
                <div className="balance-info">
                  <p>Current balance: {walletBalance ? `${(parseFloat(walletBalance) / Math.pow(10, TOKEN_DECIMALS)).toLocaleString()} tokens` : 'Loading...'}</p>
                  <p>Required: 10,000 tokens</p>
                </div>
                <div className="address-section">
                  <h4>Your wallet address:</h4>
                  <div className="address-container">
                    <span className="address-value">{walletAddress}</span>
                    <button 
                      onClick={copyAddress}
                      className="copy-button"
                      title="Copy address"
                    >
                      <FiCopy />
                      {addressCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="token-options">
                  <p><strong>To get tokens:</strong></p>
                  <ul>
                    <li>If you have AO tokens, visit the faucet to convert them</li>
                    <li>Or contact our team with your address above for tokens</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'device_setup':
        return (
          <DeviceSetup 
            walletAddress={walletAddress!}
            walletBalance={walletBalance}
            onProviderCreated={handleProviderCreated}
          />
        )

      case 'provider_management':
        return (
          <div className="management-container">
            <div className="management-header">
              <div className="header-content">
                <h2>Welcome back, Provider Owner!</h2>
                <p>Manage your provider configuration or set up additional devices.</p>
              </div>
              <div className="management-actions">
                <button 
                  onClick={() => setShowProviderEdit(!showProviderEdit)}
                  className="toggle-button"
                >
                  <FiEdit />
                  {showProviderEdit ? 'Hide Provider Edit' : 'Edit Provider'}
                </button>
                <button 
                  onClick={() => setShowDeviceSetup(!showDeviceSetup)}
                  className="toggle-button"
                >
                  <FiMonitor />
                  {showDeviceSetup ? 'Hide Device Setup' : 'Device Setup'}
                </button>
              </div>
            </div>

            {/* Provider Edit Card */}
            {showProviderEdit && (
              <div className="setup-card">
                <div className="card-header">
                  <FiEdit />
                  <h3>Edit Provider Details</h3>
                </div>
                <div className="card-content">
                  <ProviderDetails
                    currentProvider={currentProvider}
                    mode="setup"
                    onSave={async () => {
                      await refreshProviders()
                      setShowProviderEdit(false)
                    }}
                    submitLabel="Update Provider"
                    isSubmitting={false}
                    walletBalance={walletBalance}
                  />
                </div>
              </div>
            )}

            {/* Device Configuration Card */}
            {showDeviceSetup && (
              <div className="setup-card">
                <div className="card-header">
                  <FiMonitor />
                  <h3>Device Configuration</h3>
                </div>
                <div className="card-content">
                  <p>Configure a new device or update existing device settings.</p>
                  <DeviceSetup 
                    walletAddress={walletAddress!}
                    walletBalance={walletBalance}
                    onProviderCreated={handleProviderCreated}
                  />
                </div>
              </div>
            )}

            {/* Default Provider Info Card */}
            {!showProviderEdit && !showDeviceSetup && (
              <div className="setup-card">
                <div className="card-header">
                  <FiDatabase />
                  <h3>Your Provider Information</h3>
                </div>
                <div className="card-content">
                  <ProviderDetails
                    currentProvider={currentProvider}
                    mode="view"
                    onSave={() => refreshProviders()}
                    submitLabel="Update Provider"
                    isSubmitting={false}
                    walletBalance={walletBalance}
                  />
                  <div className="management-hint">
                    <p>Use the buttons above to edit your provider details or configure devices.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="setup-page">
      <ConnectWallet />
      <main>
        <div className="hero-section">
          <div className="hero-content">
            <h1>{setupMode === 'provider_management' ? 'Provider Management' : 'Provider Setup'}</h1>
            <p>
              {setupMode === 'provider_management' 
                ? 'Manage your provider configuration and device settings.'
                : 'Set up your RNG miner to become a provider on the network.'}
            </p>
          </div>
          <div className="setup-icon">
            <FiMonitor size={40} />
          </div>
        </div>

        <section className="setup-section">
          <div className="setup-container">
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  )
}
