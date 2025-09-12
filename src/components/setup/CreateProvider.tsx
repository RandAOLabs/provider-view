import React, { useState } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import { aoHelpers, TOKEN_DECIMALS } from '../../utils/ao-helpers'
import '../providers/ProviderDetails.css'

interface CreateProviderProps {
  providerId?: string
  onProviderCreated?: (details: { name: string; providerId: string; isStaked: boolean }) => void
  walletBalance?: string | null
}

export const CreateProvider: React.FC<CreateProviderProps> = ({
  providerId: initialProviderId,
  onProviderCreated,
  walletBalance
}) => {
  const { address: walletAddress } = useWallet()
  const [name, setName] = useState('')
  const [providerId, setProviderId] = useState(initialProviderId || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Provider name is required')
      return
    }

    if (!walletAddress) {
      setError('Wallet not connected')
      return
    }

    if (!providerId.trim()) {
      setError('Provider ID is required - please paste your provider ID')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Stake 10,000 tokens
      const stakeAmount = '10000000000000' // 10k tokens with 12 decimals
      
      console.log('Staking tokens for provider:', {
        providerId,
        stakeAmount,
        walletAddress
      })

      // Create provider details object
      const providerDetails = {
        name: name.trim(),
        description: `Provider ${name.trim()}`
      }
      
      // First stake with details
      await aoHelpers.stakeWithDetails(stakeAmount, providerDetails, providerId)
      //TODO add a 30 second wait here
      await new Promise(resolve => setTimeout(resolve, 30000));
      // Then update provider actor
      await aoHelpers.updateProviderActor(walletAddress, providerId)
      
      setSuccess('Provider created successfully! Tokens staked and actor updated.')
      
      // Notify parent component that provider was created
      if (onProviderCreated) {
        onProviderCreated({
          name: name.trim(),
          providerId,
          isStaked: true
        })
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create provider'
      setError(`Failed to create provider: ${errorMessage}`)
      console.error('Provider creation error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatBalance = (balance: string | null | undefined): string => {
    if (!balance) return '0'
    const balanceNum = parseFloat(balance)
    return (balanceNum / Math.pow(10, TOKEN_DECIMALS)).toLocaleString()
  }

  return (
    <div className="provider-details">
      <div className="provider-details-header">
        <h2>Create Provider</h2>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="provider-details-content">
        <form onSubmit={handleSubmit}>
          <div className="provider-grid">
            {/* Provider ID Input */}
            <div className="detail-group">
              <label>Provider ID *</label>
              <input
                type="text"
                className="edit-input monospace"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder="Paste provider id here"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Provider Name Input */}
            <div className="detail-group">
              <label>Provider Name *</label>
              <input
                type="text"
                className="edit-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter provider name"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Wallet Balance Display */}
            <div className="detail-group">
              <label>Available Balance</label>
              <div className="detail-value">
                {formatBalance(walletBalance)} tokens
              </div>
            </div>

            {/* Stake Amount Display */}
            <div className="detail-group">
              <label>Stake Amount</label>
              <div className="staking-info-compact">
                <div className="staking-info-icon">
                  <span className="stake-icon">🪙</span>
                </div>
                <div className="staking-info-content">
                  <div className="staking-info-value">10,000 tokens</div>
                </div>
              </div>
              <div className="staking-info-note">
                Required minimum stake to become a provider
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="provider-actions">
            <button 
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || !name.trim() || !providerId.trim()}
            >
              {isSubmitting ? 'Creating Provider...' : 'Create Provider & Stake Tokens'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
