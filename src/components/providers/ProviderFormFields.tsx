import React, { useState } from 'react';
import { FiChevronDown, FiCheck, FiCopy, FiMinus, FiPlus } from 'react-icons/fi';

interface ProviderFormFieldsProps {
  isEditing: boolean;
  isRegisterMode: boolean;
  showStakingForm: boolean;
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  parsedDetails: any;
  provider?: any;
  walletAddress?: string;
  copiedAddress?: string | null;
  copyToClipboard: (address: string) => void;
  truncateAddress: (address: string) => string;
  isSetupMode?: boolean;
  joinDate?: string;
  // Stake-related props
  displayStakeAmount?: string;
  setDisplayStakeAmount?: (amount: string) => void;
  stakeAmount?: string;
  setStakeAmount?: (amount: string) => void;
  walletBalance?: string | null;
  rawToDisplayValue?: (value: string) => string;
  displayToRawValue?: (value: string) => string;
  MINIMUM_STAKE_AMOUNT?: string;
  TOKEN_DECIMALS?: number;
}

export const ProviderFormFields: React.FC<ProviderFormFieldsProps> = ({
  isEditing,
  isRegisterMode,
  showStakingForm,
  formData,
  handleInputChange,
  parsedDetails,
  provider,
  walletAddress,
  copiedAddress,
  copyToClipboard,
  truncateAddress,
  isSetupMode = false,
  joinDate,
  // Stake-related props
  displayStakeAmount,
  setDisplayStakeAmount,
  stakeAmount,
  setStakeAmount,
  walletBalance,
  rawToDisplayValue,
  displayToRawValue,
  MINIMUM_STAKE_AMOUNT,
  TOKEN_DECIMALS
}) => {
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const isEditMode = isEditing || isRegisterMode || showStakingForm;

  return (
    <>
      {/* Required Fields */}
      <div className="required-fields">
        {/* Only show Owner and Join Date in view mode */}
        {!isEditMode && (
          <>
            <div className="detail-group">
              <label>Owner Address</label>
              <div className="address-display-group">
                <div 
                  className="detail-value monospace clickable"
                  onClick={() => copyToClipboard(provider?.owner || walletAddress || '')}
                  title="Click to copy owner address"
                >
                  <strong>Owner:</strong> {truncateAddress(provider?.owner || walletAddress || '')}
                  {copiedAddress === (provider?.owner || walletAddress) ? (
                    <FiCheck className="copy-icon success" />
                  ) : (
                    <FiCopy className="copy-icon" />
                  )}
                </div>
                {provider?.providerId && (
                  <div 
                    className="detail-value monospace clickable secondary-address"
                    onClick={() => copyToClipboard(provider.providerId)}
                    title="Click to copy provider ID"
                  >
                    <strong>Provider ID:</strong> {truncateAddress(provider.providerId)}
                    {copiedAddress === provider.providerId ? (
                      <FiCheck className="copy-icon success" />
                    ) : (
                      <FiCopy className="copy-icon" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="detail-group">
              <label>Join Date</label>
              <div className="detail-value">
                {joinDate || 'N/A'}
              </div>
            </div>
          </>
        )}

        {/* Provider ID field - only in edit mode */}
        {isEditMode && (
          <div className="detail-group">
            <label>Provider ID / Actor ID *</label>
            <input
              type="text"
              name="providerId"
              value={(formData as any).providerId || ''}
              onChange={handleInputChange}
              className="edit-input"
              placeholder="Enter provider ID (will be used as actor ID)"
              required
            />
            <small className="form-help">
              This ID is used for provider identification and as the actor ID for random generation.
            </small>
          </div>
        )}

        <div className="detail-group">
          <label>Name *</label>
          {isEditMode ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="edit-input"
              placeholder="Enter name (required)"
              required
            />
          ) : (
            <div className="detail-value">
              {parsedDetails.name || 'N/A'}
            </div>
          )}
        </div>
      </div>

      {/* Redesigned Stake Management Section */}
      {isEditMode && (
        <div className="detail-group stake-management">
          <label>Stake Management *</label>
          <div className="stake-overview">
            {/* Current Stake Display */}
            <div className="stake-info-card">
              <div className="stake-info-header">
                <h4>Current Stake</h4>
                <div className="current-stake-amount">
                  {provider?.providerInfo?.stake?.amount 
                    ? (parseFloat(provider.providerInfo.stake.amount) / Math.pow(10, TOKEN_DECIMALS || 12)).toLocaleString()
                    : '0'
                  } tokens
                </div>
              </div>
              <div className="stake-status">
                {provider?.providerInfo?.stake?.amount 
                  ? (parseFloat(provider.providerInfo.stake.amount) >= parseFloat(MINIMUM_STAKE_AMOUNT || '0') 
                      ? '✅ Active Provider' 
                      : '⚠️ Below Minimum')
                  : '🔄 Not Staked'
                }
              </div>
            </div>

            {/* Available Balance */}
            <div className="balance-info-card">
              <div className="balance-info-header">
                <h4>Available Balance</h4>
                <div className="available-balance-amount">
                  {walletBalance && TOKEN_DECIMALS
                    ? (parseFloat(walletBalance) / Math.pow(10, TOKEN_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 2 })
                    : '0'
                  } tokens
                </div>
              </div>
            </div>
          </div>

          {/* Stake Action Controls */}
          {(isRegisterMode || showStakingForm) && (
            <div className="stake-controls">
              <div className="stake-action-header">
                <h4>Stake Amount to Add</h4>
                <p>Enter the amount you want to stake to become a provider</p>
              </div>
              
              <div className="stake-input-section">
                <div className="stake-amount-controls">
                  <button 
                    type="button"
                    className="stake-adjust-btn decrease"
                    onClick={() => {
                      if (setDisplayStakeAmount && displayStakeAmount && MINIMUM_STAKE_AMOUNT && rawToDisplayValue) {
                        const current = parseFloat(displayStakeAmount);
                        const minimum = parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString()));
                        const newAmount = Math.max(minimum, current - 1000);
                        setDisplayStakeAmount(newAmount.toString());
                        if (setStakeAmount && displayToRawValue) {
                          setStakeAmount(displayToRawValue(newAmount.toString()));
                        }
                      }
                    }}
                    disabled={!displayStakeAmount || parseFloat(displayStakeAmount) <= (MINIMUM_STAKE_AMOUNT && rawToDisplayValue ? parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString())) : 10000)}
                  >
                    -1,000
                  </button>
                  
                  <div className="stake-amount-display">
                    <input 
                      type="number" 
                      value={displayStakeAmount || ''} 
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const parsed = parseFloat(newValue);
                        if (!isNaN(parsed) && setDisplayStakeAmount && setStakeAmount && displayToRawValue && MINIMUM_STAKE_AMOUNT) {
                          setDisplayStakeAmount(newValue);
                          const rawValue = displayToRawValue(newValue);
                          const minRaw = parseInt(MINIMUM_STAKE_AMOUNT.toString(), 10);
                          
                          if (parseInt(rawValue, 10) >= minRaw) {
                            setStakeAmount(rawValue);
                          } else {
                            setStakeAmount(MINIMUM_STAKE_AMOUNT.toString());
                          }
                        } else if (newValue === '' && setDisplayStakeAmount && setStakeAmount) {
                          setDisplayStakeAmount('');
                          setStakeAmount('');
                        }
                      }} 
                      min={MINIMUM_STAKE_AMOUNT && rawToDisplayValue ? parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString())) : 10000}
                      step="1000"
                      className="stake-amount-input"
                      placeholder="10,000"
                      required
                    />
                    <span className="token-label">tokens</span>
                  </div>
                  
                  <button 
                    type="button"
                    className="stake-adjust-btn increase"
                    onClick={() => {
                      if (setDisplayStakeAmount && displayStakeAmount) {
                        const current = parseFloat(displayStakeAmount) || 0;
                        const newAmount = current + 1000;
                        setDisplayStakeAmount(newAmount.toString());
                        if (setStakeAmount && displayToRawValue) {
                          setStakeAmount(displayToRawValue(newAmount.toString()));
                        }
                      }
                    }}
                  >
                    +1,000
                  </button>
                </div>
                
                <div className="stake-quick-actions">
                  <button 
                    type="button"
                    className="quick-stake-btn minimum"
                    onClick={() => {
                      if (setDisplayStakeAmount && setStakeAmount && rawToDisplayValue && MINIMUM_STAKE_AMOUNT) {
                        const minAmount = rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString());
                        setDisplayStakeAmount(minAmount);
                        setStakeAmount(MINIMUM_STAKE_AMOUNT.toString());
                      }
                    }}
                  >
                    Minimum (10,000)
                  </button>
                  
                  <button 
                    type="button"
                    className="quick-stake-btn max"
                    onClick={() => {
                      if (walletBalance && setStakeAmount && setDisplayStakeAmount && rawToDisplayValue) {
                        setStakeAmount(walletBalance);
                        setDisplayStakeAmount(rawToDisplayValue(walletBalance));
                      }
                    }}
                    disabled={!walletBalance}
                  >
                    All Available
                  </button>
                </div>
              </div>
              
              <div className="stake-requirements">
                <p className="requirement-text">
                  💡 <strong>Minimum:</strong> {MINIMUM_STAKE_AMOUNT && rawToDisplayValue ? parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString())).toLocaleString() : '10,000'} tokens required to become a provider
                </p>
                {displayStakeAmount && parseFloat(displayStakeAmount) > 0 && (
                  <p className="stake-preview">
                    🎯 <strong>After staking:</strong> You will have {(
                      (provider?.providerInfo?.stake?.amount ? parseFloat(provider.providerInfo.stake.amount) / Math.pow(10, TOKEN_DECIMALS || 12) : 0) +
                      parseFloat(displayStakeAmount)
                    ).toLocaleString()} tokens staked
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optional Fields Toggle */}
      {isEditMode && (
        <div 
          className={`optional-fields-toggle ${showOptionalFields ? 'expanded' : ''}`}
          onClick={() => setShowOptionalFields(!showOptionalFields)}
        >
          <span>Optional Fields</span>
          <FiChevronDown className="toggle-icon" />
        </div>
      )}

      {/* Optional Fields */}
      <div className={`optional-fields ${!showOptionalFields && isEditMode ? 'collapsed' : ''}`}>
        <div className="detail-group description-group">
          <label>Description</label>
          {isEditMode ? (
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="edit-input"
              rows={3}
              placeholder="Describe your provider service"
            />
          ) : (
            <div className="detail-value description">
              {parsedDetails.description || 'No description available'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
