import React from 'react'
import { FiPower, FiInfo, FiCircle } from 'react-icons/fi'
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
  // New props for edit mode integration
  isEditMode?: boolean
  providerStatus?: string
  onStatusChange?: (status: string) => void
}

export const ProviderStatusSection: React.FC<ProviderStatusSectionProps> = ({
  provider,
  availableRandom,
  isUpdatingRandom,
  randomUpdateSuccess,
  isClaimingRewards,
  claimSuccess,
  onUpdateAvailableRandom,
  onClaimRewards,
  // New props for edit mode integration
  isEditMode = false,
  providerStatus,
  onStatusChange
}) => {
  // Status logic for provider random_balance values (same as ProviderTable)
  const getProviderStatus = (randomBalance: number | undefined) => {
    const balance = randomBalance || 0;
    
    if (balance > 0) {
      return {
        color: 'ready', // Green
        label: 'Ready for Requests',
        description: 'Provider software is active and ready to fulfill random requests'
      };
    } else if (balance === 0) {
      return {
        color: 'inactive', // Yellow
        label: 'Inactive',
        description: 'No issues but provider software is not up and active'
      };
    } else if (balance === -1) {
      return {
        color: 'turned-off', // Purple
        label: 'Turned Off',
        description: 'Provider owner has turned the provider off at contract level'
      };
    } else if (balance === -2) {
      return {
        color: 'slashed', // Red
        label: 'Recently Slashed',
        description: 'Provider was recently slashed due to policy violations'
      };
    } else if (balance === -3) {
      return {
        color: 'team-disabled', // Purple
        label: 'Team Disabled',
        description: 'Team has disabled this provider - contact support'
      };
    } else if (balance === -4) {
      return {
        color: 'inactive', // Yellow - treat stale as inactive
        label: 'Stale (Inactive)',
        description: 'Device has become stale and is considered inactive - can be reactivated'
      };
    } else {
      return {
        color: 'unknown', // Gray
        label: 'Unknown Status',
        description: 'Provider status is unknown'
      };
    }
  };

  // Status legend for tooltip (same as ProviderTable)
  const statusLegend = [
    { color: 'ready', label: 'Ready', description: '>0: Active & fulfilling requests' },
    { color: 'inactive', label: 'Inactive', description: '0: Software not running' },
    { color: 'turned-off', label: 'Turned Off', description: '-1: Owner disabled' },
    { color: 'slashed', label: 'Slashed', description: '-2: Recently penalized' },
    { color: 'team-disabled', label: 'Team Disabled', description: '-3: Contact support' },
    { color: 'inactive', label: 'Stale', description: '-4: Device stale, can reactivate' }
  ];
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
    } else if (availableRandom === -4) {
      return {
        message: "Provider device has become stale",
        subMessage: "Device is inactive and detached. Can be reactivated.",
        action: "Reactivate device",
        value: 0,
        className: "provider-status-stale"
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

  // In edit mode, use the actual provider random_balance to determine current status
  const currentStatus = isEditMode ? provider?.providerActivity?.random_balance : availableRandom;
  const statusInfo = getProviderStatus(currentStatus ?? undefined);

  return (
    <div className="detail-group provider-status-section">
      <label>
        <div className="status-header">
          Provider Status
          <div className="status-info-container">
            <FiInfo className="status-info-icon" />
            <div className="status-tooltip">
              <div className="status-legend">
                <h4>Status Colors</h4>
                {statusLegend.map((status, index) => (
                  <div key={index} className="legend-item">
                    <FiCircle className={`legend-indicator status-indicator status-${status.color}`} />
                    <div className="legend-text">
                      <strong>{status.label}</strong>
                      <span>{status.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </label>
      {isEditMode ? (
        // Edit mode: Show status selector and controls
        <div className="provider-status-edit-mode">
          <div className="status-display-row">
            <FiCircle 
              className={`status-indicator status-${statusInfo.color}`}
              title={`${statusInfo.label}: ${statusInfo.description}`}
            />
            <span className="status-label">{statusInfo.label}</span>
            <span className="current-status-text">Current Status</span>
          </div>
          
          <div className="status-controls">
            <select
              value={(() => {
                // If user has made a selection, use that
                if (providerStatus !== undefined) {
                  return providerStatus;
                }
                // Otherwise, determine from current balance
                const balance = provider?.providerActivity?.random_balance ?? 0;
                if (balance >= 0) return '0';
                if (balance === -1) return '-1';
                if (balance === -2) return '-2';
                if (balance === -3) return '-3';
                if (balance === -4) return '-4';
                return balance.toString();
              })()}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="edit-input status-select"
              disabled={(() => {
                const balance = provider?.providerActivity?.random_balance ?? 0;
                // Only disable editing for team disabled (-3) status
                return balance === -3;
              })()}
            >
              <option value="0">Active (0)</option>
              <option value="-1">Turned Off (-1)</option>
              <option value="-2">Slashed (-2)</option>
              <option value="-4">Stale (-4)</option>
              {(() => {
                const balance = provider?.providerActivity?.random_balance ?? 0;
                if (balance === -3) return <option value="-3">Team Disabled (-3)</option>;
                return null;
              })()}
            </select>
            <small className="form-help">
              Changes to provider status will be applied when you save your changes.
            </small>
          </div>
          
          <div className="rewards-info">
            <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '10px' }}>
              <strong>Claimable rewards:</strong> {provider?.providerActivity?.fulfillment_rewards ? (provider.providerActivity.fulfillment_rewards/1000000000).toLocaleString() + " Test RNG": "0 Test RNG"}
            </p>
          </div>
        </div>
      ) : (
        // View mode: Show minimal read-only status (just color, name, and info icon)
        <div className="detail-value">
          {provider ? (
            (() => {
              const status = getProviderStatus(provider.providerActivity?.random_balance);
              return (
                <div className="status-indicator-row">
                  <FiCircle 
                    className={`status-indicator status-${status.color}`}
                    title={`${status.label}: ${status.description}`}
                  />
                  <span className="status-label">{status.label}</span>
                </div>
              );
            })()
          ) : (
            'Loading status...'
          )}
        </div>
      )}
    </div>
  )
}
