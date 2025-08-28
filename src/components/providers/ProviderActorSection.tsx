import React from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';

interface ProviderActorSectionProps {
  isEditing: boolean;
  isRegisterMode: boolean;
  showStakingForm: boolean;
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  provider?: any;
  walletAddress?: string;
  copiedAddress?: string | null;
  copyToClipboard: (address: string) => void;
  truncateAddress: (address: string) => string;
  isSetupMode?: boolean;
}

export const ProviderActorSection: React.FC<ProviderActorSectionProps> = ({
  isEditing,
  isRegisterMode,
  showStakingForm,
  formData,
  handleInputChange,
  provider,
  walletAddress,
  copiedAddress,
  copyToClipboard,
  truncateAddress,
  isSetupMode = false
}) => {
  return (
    <div className="detail-group">
      <label>Provider ID / Actor ID</label>
      {isEditing || isRegisterMode || showStakingForm || isSetupMode ? (
        <>
          <input
            type="text"
            name="providerId"
            value={(formData as any).providerId || ''}
            onChange={handleInputChange}
            className="edit-input"
            placeholder="Enter custom provider ID (optional)"
          />
          <small className="form-help">
            If provided, this will be used as the actor ID for staking and updates. 
            Leave empty to use your wallet address as the provider ID.
          </small>
        </>
      ) : (
        <div 
          className="detail-value monospace clickable"
          onClick={() => copyToClipboard(provider?.providerId || walletAddress || '')}
          title="Click to copy address"
        >
          {truncateAddress(provider?.providerId || walletAddress || '')}
          {copiedAddress === (provider?.providerId || walletAddress) ? (
            <FiCheck className="copy-icon success" />
          ) : (
            <FiCopy className="copy-icon" />
          )}
        </div>
      )}
    </div>
  );
};
