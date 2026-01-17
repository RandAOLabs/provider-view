import React from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';

interface ProviderActorSectionProps {
  isEditing: boolean;
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  provider?: any;
  walletAddress?: string;
  copiedAddress?: string | null;
  copyToClipboard: (address: string) => void;
  truncateAddress: (address: string) => string;
}

export const ProviderActorSection: React.FC<ProviderActorSectionProps> = ({
  isEditing,
  formData,
  handleInputChange,
  provider,
  walletAddress,
  copiedAddress,
  copyToClipboard,
  truncateAddress
}) => {
  return (
    <div className="detail-group">
      <label>Provider ID / Actor ID</label>
      {isEditing ? (
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
            Optional custom actor ID. Leave empty to use wallet address.
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
