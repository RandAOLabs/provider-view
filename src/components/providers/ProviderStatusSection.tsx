import React from 'react'
import { FiPower } from 'react-icons/fi'
import { BiRefresh } from 'react-icons/bi'
import { GiTwoCoins } from 'react-icons/gi'
import { ProviderInfoAggregate } from 'ao-js-sdk'

interface ProviderStatusSectionProps {
  provider: ProviderInfoAggregate | null
  availableRandom: number | null
  isUpdatingRandom: boolean
  randomUpdateSuccess: boolean
  isClaimingRewards: boolean
  claimSuccess: boolean
  onUpdateAvailableRandom: (value: number) => void
  onClaimRewards: () => void
}

export const ProviderStatusSection: React.FC<ProviderStatusSectionProps> = ({
  provider,
  availableRandom,
  isUpdatingRandom,
  randomUpdateSuccess,
  isClaimingRewards,
  claimSuccess,
  onUpdateAvailableRandom,
  onClaimRewards
}) => {
  // Get message based on available random value
  const getRandomStatusMessage = () => {
    if (availableRandom === -1) {
      return {
        message: "Provider has been turned off by user",
        action: "Click here to turn back on",
        value: 0,
        className: "provider-status-user-off"
      };
    } else if (availableRandom === -2) {
      return {
        message: "Provider has been turned off by process",
        subMessage: "Your provider failed to meet requirements. Contact team for more info.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-process-off"
      };
    } else if (availableRandom === -3) {
      return {
        message: "Provider has been turned off by team",
        subMessage: "Contact team if you don't know why.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-team-off"
      };
    } else {
      return {
        message: `Provider is active`,
        subMessage: `${availableRandom !== null ? `Available random values: ${availableRandom}` : ''}`,
        action: "Turn off provider",
        value: -1,
        className: "provider-status-active"
      };
    }
  }

  return (
    <div className="detail-group provider-status-section">
      <label>Provider Status</label>
      {availableRandom !== null ? (
        <div className={`provider-status ${getRandomStatusMessage().className}`}>
          <div className="status-message">
            <div>
              <p><strong>{getRandomStatusMessage().message}</strong></p>
              {getRandomStatusMessage().subMessage && (
                <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                  {getRandomStatusMessage().subMessage}
                </p>
              )}
              <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '10px' }}>
                <strong>Claimable rewards:</strong> {provider?.providerActivity?.fulfillment_rewards ? (provider.providerActivity.fulfillment_rewards/1000000000).toLocaleString() + " Test RNG": "0 Test RNG"}
              </p>
            </div>
            <div className="status-actions">
              <button 
                className="status-action-btn"
                onClick={() => onUpdateAvailableRandom(getRandomStatusMessage().value)}
                disabled={isUpdatingRandom}
              >
                {isUpdatingRandom ? (
                  <span className="loading-spinner"><BiRefresh className="spin" /></span>
                ) : (
                  <>
                    <FiPower /> {getRandomStatusMessage().action}
                  </>
                )}
              </button>
              <button 
                className="status-action-btn"
                onClick={onClaimRewards}
                disabled={isClaimingRewards}
                style={{ marginTop: '8px' }}
              >
                {isClaimingRewards ? (
                  <span className="loading-spinner"><BiRefresh className="spin" /></span>
                ) : (
                  <>
                    <GiTwoCoins /> Claim Rewards
                  </>
                )}
              </button>
            </div>
            {randomUpdateSuccess && (
              <div className="success-message">Provider status updated successfully!</div>
            )}
            {claimSuccess && (
              <div className="success-message">Rewards claimed successfully!</div>
            )}
          </div>
        </div>
      ) : (
        <div className="detail-value">Loading status...</div>
      )}
    </div>
  )
}
