import React, { useState } from 'react'
import { GiTwoCoins } from 'react-icons/gi'
import { BiRefresh } from 'react-icons/bi'
import { ProviderInfoAggregate } from 'ao-js-sdk'
import { aoHelpers } from '../../utils/ao-helpers'

interface ClaimableRewardsProps {
  provider: ProviderInfoAggregate | null
  isEditMode?: boolean
  onError?: (error: string) => void
}

export const ClaimableRewards: React.FC<ClaimableRewardsProps> = ({
  provider,
  isEditMode = false,
  onError
}) => {
  const [isClaimingRewards, setIsClaimingRewards] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)

  const handleClaimRewards = async () => {
    setIsClaimingRewards(true)
    setClaimSuccess(false)
    
    try {
      await aoHelpers.claimRandomRewards()
      setClaimSuccess(true)
      setTimeout(() => setClaimSuccess(false), 3000)
    } catch (err) {
      console.error('Error claiming rewards:', err)
      if (onError) {
        onError('Failed to claim rewards')
      }
    } finally {
      setIsClaimingRewards(false)
    }
  }
  const rewardAmount = provider?.providerActivity?.fulfillment_rewards || 0
  const formattedRewards = (rewardAmount / 1000000000).toLocaleString()
  const hasRewards = rewardAmount > 0

  if (!hasRewards) {
    return null
  }

  return (
    <div className="detail-group claimable-rewards-section">
      <label>
        <div className="rewards-header">
          <GiTwoCoins className="rewards-icon" />
          Claimable Rewards
        </div>
      </label>
      
      <div className="rewards-content">
        <button
          onClick={handleClaimRewards}
          disabled={isClaimingRewards}
          className={`claim-rewards-btn small ${isClaimingRewards ? 'claiming' : ''} ${claimSuccess ? 'success' : ''}`}
          title="Claim your accumulated rewards"
        >
          {isClaimingRewards ? (
            <>
              <BiRefresh className="loading-icon" />
              Claiming...
            </>
          ) : claimSuccess ? (
            <>
              <GiTwoCoins />
              Claimed!
            </>
          ) : (
            <>
              <GiTwoCoins />
              Claim {formattedRewards}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
