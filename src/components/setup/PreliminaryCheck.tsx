import React, { useEffect, useState } from 'react'
import { FiDownload, FiKey, FiDollarSign } from 'react-icons/fi'
import { TOKEN_DECIMALS, aoHelpers } from '../../utils/ao-helpers'
import { ConnectWallet } from '../common/ConnectWallet'
import SimpleTabs from './SimpleTabs'
import StepCard from './StepCard'
import './Setup.css'


interface PreliminaryCheckProps {
  walletAddress: string | null
  walletBalance: string | null
  isProviderOwner: boolean
  onProceedToSetup: () => void
  onCopyAddress: () => void
  addressCopied: boolean
  onBalanceRefresh?: () => void
}

type TabType = 'wander' | 'wallet' | 'tokens'

export default function PreliminaryCheck({
  walletAddress,
  walletBalance,
  isProviderOwner,
  onProceedToSetup,
  onCopyAddress,
  addressCopied,
  onBalanceRefresh
}: PreliminaryCheckProps) {
  
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('wander')
  const [tokenVerificationCode, setTokenVerificationCode] = useState('')
  const [hasVerifiedTokens, setHasVerifiedTokens] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redemptionError, setRedemptionError] = useState<string | null>(null)
  
  // Auto-verify tokens if balance is sufficient
  useEffect(() => {
    if (getTokenBalance() >= 10000 && !hasVerifiedTokens) {
      console.log('PreliminaryCheck: Auto-verifying tokens - balance sufficient:', getTokenBalance())
      setHasVerifiedTokens(true)
    }
  }, [walletBalance, hasVerifiedTokens])
  
  const getTokenBalance = (): number => {
    if (!walletBalance) return 0
    return parseFloat(walletBalance) / Math.pow(10, TOKEN_DECIMALS)
  }

  // Use useEffect to handle state changes that need to trigger parent updates
  useEffect(() => {
    console.log('PreliminaryCheck useEffect:', {
      walletAddress: !!walletAddress,
      isProviderOwner,
      hasVerifiedTokens,
      allComplete: walletAddress && hasVerifiedTokens
    })
    
    // Only proceed if we have a wallet address
    if (!walletAddress) {
      console.log('PreliminaryCheck: Early return - no wallet address')
      return
    }
    
    // Skip if already a provider owner (they shouldn't see this component)
    if (isProviderOwner) {
      console.log('PreliminaryCheck: User is provider owner, component should not be shown')
      return
    }

    // Call parent callback when all steps are complete
    if (walletAddress && hasVerifiedTokens) {
      console.log('PreliminaryCheck: All steps complete, calling onProceedToSetup')
      onProceedToSetup()
    }
  }, [walletAddress, isProviderOwner, hasVerifiedTokens, onProceedToSetup])

  // Provider owner should not see this component (handled by parent)
  if (isProviderOwner) {
    console.log('PreliminaryCheck: Provider owner detected, returning null')
    return (
      <div className="preliminary-check">
        <div className="setup-header">
          <h2>Provider Already Configured</h2>
          <p>You already have a provider set up. Go to the management page to configure it.</p>
        </div>
      </div>
    )
  }

  const hasWander = true // Assume they have Wander if they got this far
  const hasWallet = !!walletAddress
  const hasTokens = hasVerifiedTokens

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
        title: 'Verify Tokens',
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

  const handleTokenVerification = async () => {
    console.log('PreliminaryCheck: Token verification clicked')
    setIsRedeeming(true)
    setRedemptionError(null)
    
    try {
      // Use the new redeemTokens function from aoHelpers
      const result = await aoHelpers.redeemTokens(tokenVerificationCode)
      console.log('PreliminaryCheck: Token redemption result:', result)
      
      // Wait 10 seconds before rechecking balance
      console.log('PreliminaryCheck: Waiting 10 seconds before rechecking balance...')
      setTimeout(async () => {
        try {
          // Refresh the balance if callback is provided
          if (onBalanceRefresh) {
            await onBalanceRefresh()
          }
          
          // Check if balance is now sufficient
          if (getTokenBalance() >= 10000) {
            setHasVerifiedTokens(true)
            console.log('PreliminaryCheck: Token verification successful - balance now sufficient')
          } else {
            setRedemptionError('Redemption completed but balance is still insufficient. Please check your wallet.')
          }
        } catch (error) {
          console.error('Error refreshing balance:', error)
          setRedemptionError('Error refreshing balance after redemption')
        } finally {
          setIsRedeeming(false)
        }
      }, 10000)
      
    } catch (error) {
      console.error('PreliminaryCheck: Token redemption failed:', error)
      setRedemptionError(error instanceof Error ? error.message : 'Failed to redeem tokens')
      setIsRedeeming(false)
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
                      <div className="address-header">
                        <span className="address-label">Connected Address:</span>
                        {/* Copy button commented out per user request
                        <button 
                          onClick={onCopyAddress}
                          className="copy-button"
                          title="Copy address"
                        >
                          {addressCopied ? 'Copied!' : 'Copy'}
                        </button>
                        */}
                      </div>
                      <div className="address-value">{walletAddress}</div>
                    </div>
                  </div>
                  <p>Excellent! Your wallet is connected. Now let's verify your token balance.</p>
                </div>
              </div>
            )}
          </StepCard>
        )

      case 'tokens':
        return (
          <StepCard icon={FiDollarSign} title="Verify Token Balance">
            {!hasTokens ? (
              <div className="step-content">
                <p>You need at least 10,000 tokens to become a provider.</p>
                <div className="balance-info">
                  <p>Current Balance: {getTokenBalance().toLocaleString()} tokens</p>
                  {getTokenBalance() < 10000 ? (
                    <>
                      <p className="insufficient-balance">⚠️ Insufficient balance. You need at least 10,000 tokens.</p>
                      <div className="token-verification">
                        <label htmlFor="tokenCode">Redemption Code (paste your code to redeem tokens):</label>
                        <div className="verification-input">
                          <input
                            id="tokenCode"
                            type="text"
                            value={tokenVerificationCode}
                            onChange={(e) => setTokenVerificationCode(e.target.value)}
                            placeholder="Enter redemption code..."
                            className="verification-textbox"
                            disabled={isRedeeming}
                          />
                          <button 
                            onClick={handleTokenVerification}
                            className="verify-button"
                            disabled={!tokenVerificationCode.trim() || isRedeeming}
                          >
                            {isRedeeming ? 'Redeeming...' : 'Redeem'}
                          </button>
                        </div>
                        {isRedeeming && (
                          <p className="redemption-status">
                            🔄 Redeeming tokens... This will take about 10 seconds.
                          </p>
                        )}
                        {redemptionError && (
                          <p className="redemption-error">
                            ❌ {redemptionError}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="sufficient-balance">✅ Sufficient balance detected! Automatically verified.</p>
                  )}
                </div>
                {getTokenBalance() < 10000 && !isRedeeming && (
                  <p className="step-instruction">
                    Enter your redemption code above to add tokens to your wallet.
                  </p>
                )}
              </div>
            ) : (
              <div className="step-content">
                <div className="success-message">
                  <p className="success-text">✓ Token balance verified</p>
                  <div className="balance-info">
                    <p>Verified Balance: {getTokenBalance().toLocaleString()} tokens</p>
                  </div>
                  <p>Perfect! You have sufficient tokens to become a provider. Ready to proceed with setup.</p>
                </div>
              </div>
            )}
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
      {hasWallet && hasTokens && (
        <div className="progress-summary">
          <div className="all-complete">
            <p>🎉 All requirements met! Proceeding to provider setup...</p>
          </div>
        </div>
      )}
    </div>
  )
}
