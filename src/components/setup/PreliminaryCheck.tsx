import React, { useEffect } from 'react'
import { FiExternalLink, FiCopy } from 'react-icons/fi'
import { TOKEN_DECIMALS } from '../../utils/ao-helpers'
import './PreliminaryCheck.css'

interface PreliminaryCheckProps {
  walletAddress: string | null
  walletBalance: string | null
  isProviderOwner: boolean
  onProceedToSetup: () => void
  onCopyAddress: () => void
  addressCopied: boolean
}

export default function PreliminaryCheck({
  walletAddress,
  walletBalance,
  isProviderOwner,
  onProceedToSetup,
  onCopyAddress,
  addressCopied
}: PreliminaryCheckProps) {
  
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

  // Check 1: Wallet not connected
  if (!walletAddress) {
    return (
      <div className="preliminary-check">
        <div className="error-card">
          <h3>Connect Your Wallet</h3>
          <p>You need to connect your Wander wallet to continue.</p>
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
      </div>
    )
  }

  // Check 2: Provider owner should not see this component (handled by parent)
  if (isProviderOwner) {
    return null
  }

  // Check 3: Wallet connected + no provider + insufficient tokens
  if (walletBalance && getTokenBalance() < 10000) {
    return (
      <div className="preliminary-check">
        <div className="error-card">
          <h3>Insufficient Token Balance</h3>
          <p>You need 10,000 tokens to become a provider.</p>
          <div className="balance-info">
            <p>Current balance: {getTokenBalance().toLocaleString()} tokens</p>
            <p>Required: 10,000 tokens</p>
          </div>
          <div className="address-section">
            <h4>Your wallet address:</h4>
            <div className="address-container">
              <span className="address-value">{walletAddress}</span>
              <button 
                onClick={onCopyAddress}
                className="copy-button"
                title="Copy address"
              >
                <FiCopy />
                {addressCopied ? 'Copied!' : 'Copy'}
              </button>
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
  }

  // Still loading balance or sufficient tokens (useEffect will handle transition)
  return (
    <div className="preliminary-check">
      <div className="loading-card">
        <p>Checking your token balance...</p>
      </div>
    </div>
  )
}
