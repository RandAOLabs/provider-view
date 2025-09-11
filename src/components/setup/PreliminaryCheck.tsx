import React, { useEffect, useState } from 'react'
import { FiDownload, FiKey, FiDollarSign } from 'react-icons/fi'
import { TOKEN_DECIMALS } from '../../utils/ao-helpers'
import './PreliminaryCheck.css'
import { ConnectWallet } from '../common/ConnectWallet'
import SimpleTabs from './SimpleTabs'
import StepCard from './StepCard'

interface PreliminaryCheckProps {
  walletAddress: string | null
  walletBalance: string | null
  isProviderOwner: boolean
  onProceedToSetup: () => void
  onCopyAddress: () => void
  addressCopied: boolean
}

type TabType = 'wander' | 'wallet' | 'tokens'

export default function PreliminaryCheck({
  walletAddress,
  walletBalance,
  isProviderOwner,
  onProceedToSetup,
  onCopyAddress,
  addressCopied
}: PreliminaryCheckProps) {
  
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('wander')
  
  const getTokenBalance = (): number => {
    if (!walletBalance) return 0
    return parseFloat(walletBalance) / Math.pow(10, TOKEN_DECIMALS)
  }

  // Use useEffect to handle state changes that need to trigger parent updates
  useEffect(() => {
    // Only proceed if we have a wallet address and this isn't a provider owner
    if (!walletAddress || isProviderOwner) return

    // If we have sufficient balance, proceed to setup
    if (walletBalance && getTokenBalance() >= 10000) {
      onProceedToSetup()
    }
  }, [walletAddress, walletBalance, isProviderOwner, onProceedToSetup])

  // Provider owner should not see this component (handled by parent)
  if (isProviderOwner) {
    return null
  }

  const hasWander = true // Assume they have Wander if they got this far
  const hasWallet = !!walletAddress
  const hasTokens = !!(walletBalance && getTokenBalance() >= 10000)
  const isLoadingBalance = walletAddress && !walletBalance

  const handleCodeSubmit = () => {
    // TODO: Add logic to handle code submission
    console.log('Code submitted:', code)
  }

  // Check if each step is complete
  const isWanderStepComplete = () => hasWander
  const isWalletStepComplete = () => hasWallet
  const isTokensStepComplete = () => hasTokens

  // Get steps configuration for tabs (ordered flow)
  const getSteps = () => {
    const wanderComplete = isWanderStepComplete()
    const walletComplete = isWalletStepComplete()
    const tokensComplete = isTokensStepComplete()

    return [
      {
        id: 'wander',
        title: 'Wander Wallet',
        icon: FiDownload,
        isCompleted: wanderComplete,
        isEnabled: true // Always enabled as first step
      },
      {
        id: 'wallet',
        title: 'Connect Wallet',
        icon: FiKey,
        isCompleted: walletComplete,
        isEnabled: wanderComplete // Can only access if wander step is complete
      },
      {
        id: 'tokens',
        title: 'Token Balance',
        icon: FiDollarSign,
        isCompleted: tokensComplete,
        isEnabled: walletComplete // Can only access if wallet step is complete
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'wander':
        return (
          <StepCard icon={FiDownload} title="Ensure You Have Wander Wallet">
            {!hasWander ? (
              <div className="step-content">
                <p>Download and install the Wander wallet to continue.</p>
                <a 
                  href="https://www.wander.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="download-link"
                >
                  <FiDownload />
                  Download Wander Wallet
                </a>
                <p className="step-instruction">
                  After installing Wander wallet, return here and proceed to the next step.
                </p>
              </div>
            ) : (
              <div className="step-content">
                <div className="success-message">
                  <p className="success-text">✓ Wander wallet detected</p>
                  <p>Great! You have Wander wallet installed. You can now proceed to connect your wallet.</p>
                </div>
              </div>
            )}
          </StepCard>
        )

      case 'wallet':
        return (
          <StepCard icon={FiKey} title="Connect Your Wallet">
            {!hasWallet ? (
              <div className="step-content">
                <p>Please connect your Wander wallet to continue with the provider setup.</p>
                <div className="connect-section">
                  <ConnectWallet oneWayOnly={true} />
                </div>
                <p className="step-instruction">
                  Click the "Connect Wallet" button above to link your Wander wallet.
                </p>
              </div>
            ) : (
              <div className="step-content">
                <div className="success-message">
                  <p className="success-text">✓ Wallet connected successfully</p>
                  <div className="wallet-info">
                    <div className="address-container">
                      <span className="address-label">Connected Address:</span>
                      <span className="address-value">{walletAddress}</span>
                      <button 
                        onClick={onCopyAddress}
                        className="copy-button"
                        title="Copy address"
                      >
                        {addressCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <p>Excellent! Your wallet is connected. Now let's check your token balance.</p>
                </div>
              </div>
            )}
          </StepCard>
        )

      case 'tokens':
        return (
          <StepCard icon={FiDollarSign} title="Ensure You Have Tokens">
            <div className="step-content">
              {isLoadingBalance ? (
                <div className="loading-message">
                  <p>Checking your token balance...</p>
                </div>
              ) : hasTokens ? (
                <div className="success-message">
                  <p className="success-text">✓ Sufficient tokens available</p>
                  <div className="balance-display">
                    <p><strong>Current Balance:</strong> {getTokenBalance().toLocaleString()} tokens</p>
                    <p><strong>Required:</strong> 10,000 tokens</p>
                  </div>
                  <p>Perfect! You have enough tokens to become a provider. The setup will continue automatically.</p>
                </div>
              ) : (
                <div className="insufficient-tokens">
                  <p>You need 10,000 tokens to become a provider.</p>
                  <div className="balance-info">
                    <p><strong>Current Balance:</strong> {getTokenBalance().toLocaleString()} tokens</p>
                    <p><strong>Required:</strong> 10,000 tokens</p>
                    <p><strong>Needed:</strong> {(10000 - getTokenBalance()).toLocaleString()} more tokens</p>
                  </div>
                  
                  <div className="token-acquisition">
                    <h4>How to get tokens:</h4>
                    <ul>
                      <li>If you have AO tokens, visit the faucet to convert them</li>
                      <li>Contact our team with your wallet address for tokens</li>
                      <li>Enter a provider code if you have one (see below)</li>
                    </ul>
                  </div>
                  
                  <div className="code-entry">
                    <h4>Have a Provider Code?</h4>
                    <p>If you received a special provider code, enter it here:</p>
                    <div className="code-input-container">
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter your provider code"
                        className="code-input"
                      />
                      <button
                        onClick={handleCodeSubmit}
                        disabled={!code.trim()}
                        className="code-submit-button"
                      >
                        Submit Code
                      </button>
                    </div>
                  </div>

                  <div className="wallet-address-section">
                    <h4>Your Wallet Address:</h4>
                    <p>Share this address when requesting tokens:</p>
                    <div className="address-container">
                      <span className="address-value">{walletAddress}</span>
                      <button 
                        onClick={onCopyAddress}
                        className="copy-button"
                        title="Copy address"
                      >
                        {addressCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </StepCard>
        )

      default:
        return null
    }
  }

  return (
    <div className="preliminary-check">
      <div className="setup-header">
        <h2>Provider Setup Requirements</h2>
        <p>Complete these three steps to become a provider:</p>
      </div>

      <SimpleTabs
        tabs={getSteps()}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        mode="gated"
      >
        {renderTabContent()}
      </SimpleTabs>

      {/* Progress Summary */}
      {hasWallet && (
        <div className="progress-summary">
          {hasTokens ? (
            <div className="all-complete">
              <p>🎉 All requirements met! Proceeding to provider setup...</p>
            </div>
          ) : (
            <div className="pending-completion">
              <p>Complete the token balance step to continue with provider setup.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
