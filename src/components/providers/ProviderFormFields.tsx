import React, { useState } from 'react';
import { FiChevronDown, FiCheck, FiCopy } from 'react-icons/fi';
import { StakeComponent } from './StakeComponent';
import { ProviderStatusSection } from './ProviderStatusSection';
import { ClaimableRewards } from './ClaimableRewards';

// Add interface for profile client
interface ProfileClient {
  updateDetails: (details: any) => Promise<any>;
}

// Declare providerprofileclient as available
declare const providerprofileclient: ProfileClient;

interface ProviderFormFieldsProps {
  isEditing: boolean;
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  parsedDetails: any;
  provider?: any;
  walletAddress?: string;
  copiedAddress?: string | null;
  copyToClipboard: (address: string) => void;
  truncateAddress: (address: string) => string;
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
  // Provider status props
  providerStatus?: string;
  onStatusChange?: (status: string) => void;
  // ProviderStatusSection props
  availableRandom?: number | null;
  isUpdatingRandom?: boolean;
  randomUpdateSuccess?: boolean;
  isClaimingRewards?: boolean;
  claimSuccess?: boolean;
  onUpdateAvailableRandom?: (value: number) => void;
  onClaimRewards?: () => void;
  onError?: (error: string) => void;
}

export const ProviderFormFields: React.FC<ProviderFormFieldsProps> = ({
  isEditing,
  formData,
  handleInputChange,
  parsedDetails,
  provider,
  walletAddress,
  copiedAddress,
  copyToClipboard,
  truncateAddress,
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
  TOKEN_DECIMALS,
  // Provider status props
  providerStatus,
  onStatusChange,
  // ProviderStatusSection props
  availableRandom,
  isUpdatingRandom,
  randomUpdateSuccess,
  isClaimingRewards,
  claimSuccess,
  onUpdateAvailableRandom,
  onClaimRewards,
  onError
}) => {
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  return (
    <>
      {/* Required Fields */}
      <div className="required-fields">
        {/* Only show Owner and Join Date in view mode */}
        {!isEditing && (
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
        {isEditing && (
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
          </div>
        )}

        <div className="detail-group">
          <label>Name *</label>
          {isEditing ? (
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

        {/* Provider Status Section - show for existing providers */}
        {provider && (
          <ProviderStatusSection
            provider={provider}
            availableRandom={availableRandom || provider.providerActivity?.random_balance || null}
            isUpdatingRandom={isUpdatingRandom || false}
            randomUpdateSuccess={randomUpdateSuccess || false}
            isClaimingRewards={isClaimingRewards || false}
            claimSuccess={claimSuccess || false}
            onUpdateAvailableRandom={onUpdateAvailableRandom || (() => {})}
            onClaimRewards={onClaimRewards || (() => {})}
            isEditing={isEditing}
            providerStatus={providerStatus}
            onStatusChange={onStatusChange}
          />
        )}

        {/* Claimable Rewards Section - show only in edit mode for existing providers */}
        {provider && isEditing && (
          <ClaimableRewards
            provider={provider}
            isEditing={isEditing}
            onError={onError}
          />
        )}
      </div>

      {/* Stake Section */}
      {isEditing && (
        <div className="detail-group">
          <StakeComponent
            currentStake={provider?.providerInfo?.stake?.amount || '0'}
            walletBalance={walletBalance}
            isEditing={isEditing}
            onStakeChange={(newAmount) => {
              if (setStakeAmount) {
                setStakeAmount(newAmount);
              }
              if (setDisplayStakeAmount && rawToDisplayValue) {
                setDisplayStakeAmount(rawToDisplayValue(newAmount));
              }
            }}
            className="provider-stake"
          />
        </div>
      )}

      {/* Optional Fields Toggle */}
      {isEditing && (
        <div 
          className={`optional-fields-toggle ${showOptionalFields ? 'expanded' : ''}`}
          onClick={() => setShowOptionalFields(!showOptionalFields)}
        >
          <span>Optional Fields</span>
          <FiChevronDown className="toggle-icon" />
        </div>
      )}

      {/* Optional Fields */}
      <div className={`optional-fields ${!showOptionalFields && isEditing ? 'collapsed' : ''}`}>
        <div className="detail-group description-group">
          <label>Description</label>
          {isEditing ? (
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
