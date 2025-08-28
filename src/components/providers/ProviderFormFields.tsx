import React, { useState } from 'react';
import { FiChevronDown, FiCheck, FiCopy } from 'react-icons/fi';

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
  joinDate
}) => {
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const isEditMode = isEditing || isRegisterMode || showStakingForm;

  return (
    <>
      {/* Required Fields */}
      <div className="required-fields">
        <div className="detail-group">
          <label>Provider ID / Actor ID *</label>
          {isEditMode ? (
            <>
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
                This ID is used both for provider identification and as the actor ID for staking operations.
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

        <div className="detail-group">
          <label>Join Date</label>
          <div className="detail-value">
            {joinDate || 'N/A'}
          </div>
        </div>
      </div>

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
