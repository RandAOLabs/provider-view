import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { GiTwoCoins } from 'react-icons/gi';

interface StakeSectionProps {
  isRegisterMode: boolean;
  showStakingForm: boolean;
  isViewMode: boolean;
  isEditMode: boolean;
  provider?: any;
  formatTokenAmount: (amount: string) => string;
  isBelowMinimumStake: boolean;
  increaseStakeAmount: string;
  setIncreaseStakeAmount: (amount: string) => void;
  handleIncreaseStake: () => void;
  isIncreasingStake: boolean;
  displayStakeAmount: string;
  setDisplayStakeAmount: (amount: string) => void;
  stakeAmount: string;
  setStakeAmount: (amount: string) => void;
  walletBalance: string | null;
  rawToDisplayValue: (value: string) => string;
  displayToRawValue: (value: string) => string;
  MINIMUM_STAKE_AMOUNT: string;
  TOKEN_DECIMALS: number;
  formatTimeAgo: (timestamp: number) => string;
}

export const StakeSection: React.FC<StakeSectionProps> = ({
  isRegisterMode,
  showStakingForm,
  isViewMode,
  isEditMode,
  provider,
  formatTokenAmount,
  isBelowMinimumStake,
  increaseStakeAmount,
  setIncreaseStakeAmount,
  handleIncreaseStake,
  isIncreasingStake,
  displayStakeAmount,
  setDisplayStakeAmount,
  stakeAmount,
  setStakeAmount,
  walletBalance,
  rawToDisplayValue,
  displayToRawValue,
  MINIMUM_STAKE_AMOUNT,
  TOKEN_DECIMALS,
  formatTimeAgo
}) => {
  return (
    <>
      {/* Only show Total Staked for existing providers, not in register mode */}
      {!isRegisterMode && !showStakingForm && (
        <div className="detail-group">
          <label>Stake Amount *</label>
          <div className="stake-group">
            <div className="detail-value">
              {formatTokenAmount(provider?.providerInfo?.stake?.amount || "0")}
            </div>
            {walletBalance !== null && (
              <div className="available-balance-inline">
                <small>Available: {(parseFloat(walletBalance || "0") / Math.pow(10, TOKEN_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 2 })} tokens</small>
              </div>
            )}
            {provider?.providerInfo?.stake && (
              <div className="stake-status staked">
                Staked
                {provider.providerInfo.stake.timestamp && (
                  <span className="stake-timestamp">
                    {' - '}{formatTimeAgo(provider.providerInfo.stake.timestamp)}
                  </span>
                )}
              </div>
            )}
            {isBelowMinimumStake && (
              <div className="stake-alert">
                <FiAlertTriangle className="stake-alert-icon" />
                <span>Your stake is below the minimum required amount. You are no longer active as a provider.</span>
              </div>
            )}
            
            {/* Increase stake section - only show in edit mode */}
            {isEditMode && (
              <div className="increase-stake-section">
                <label>Increase Stake:</label>
                <div className="increase-stake-controls">
                  <button 
                    className="increase-stake-btn" 
                    onClick={() => {
                      const current = parseFloat(increaseStakeAmount);
                      if (current >= 2000) {
                        setIncreaseStakeAmount((current - 1000).toString());
                      }
                    }}
                    disabled={parseFloat(increaseStakeAmount) <= 1000}
                  >
                    ▼
                  </button>
                  <div className="increase-stake-value">{increaseStakeAmount} tokens</div>
                  <button 
                    className="increase-stake-btn" 
                    onClick={() => {
                      const current = parseFloat(increaseStakeAmount);
                      setIncreaseStakeAmount((current + 1000).toString());
                    }}
                  >
                    ▲
                  </button>
                </div>
                <button 
                  className="increase-stake-submit" 
                  onClick={handleIncreaseStake}
                  disabled={isIncreasingStake}
                >
                  {isIncreasingStake ? 'Processing...' : `Increase Stake by ${increaseStakeAmount} tokens`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show staking input for register mode or staking form */}
      {(isRegisterMode || showStakingForm) && (
        <div className="detail-group">
          <div className="staking-input-container">
            <div className="stake-amount-input">
              <label>Stake Amount *</label>
              <div className="stake-input-wrapper">
                <input 
                  type="number" 
                  value={displayStakeAmount} 
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const parsed = parseFloat(newValue);
                    if (!isNaN(parsed)) {
                      setDisplayStakeAmount(newValue);
                      const rawValue = displayToRawValue(newValue);
                      const minRaw = parseInt(MINIMUM_STAKE_AMOUNT.toString(), 10);
                      
                      if (parseInt(rawValue, 10) >= minRaw) {
                        setStakeAmount(rawValue);
                      } else {
                        setStakeAmount(MINIMUM_STAKE_AMOUNT.toString());
                      }
                    } else if (newValue === '') {
                      setDisplayStakeAmount('');
                      setStakeAmount('');
                    } else {
                      setDisplayStakeAmount(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString()));
                      setStakeAmount(MINIMUM_STAKE_AMOUNT.toString());
                    }
                  }} 
                  min={parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString()))}
                  step="0.1"
                  className="edit-input"
                  placeholder="Enter amount to stake"
                />
                <button 
                  type="button"
                  className="max-stake-btn"
                  onClick={() => {
                    if (walletBalance) {
                      setStakeAmount(walletBalance);
                      setDisplayStakeAmount(rawToDisplayValue(walletBalance));
                    }
                  }}
                >
                  MAX
                </button>
              </div>
              {walletBalance !== null && (
                <div className="available-balance-inline">
                  <small>Available: {(parseFloat(walletBalance || "0") / Math.pow(10, TOKEN_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 2 })} tokens</small>
                </div>
              )}
              <p className="staking-info-note">Minimum {parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString())).toLocaleString()} tokens required to become a provider</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
