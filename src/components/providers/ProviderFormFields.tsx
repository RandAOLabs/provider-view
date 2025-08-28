import React from 'react';

interface ProviderFormFieldsProps {
  isEditing: boolean;
  isRegisterMode: boolean;
  showStakingForm: boolean;
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  parsedDetails: any;
}

export const ProviderFormFields: React.FC<ProviderFormFieldsProps> = ({
  isEditing,
  isRegisterMode,
  showStakingForm,
  formData,
  handleInputChange,
  parsedDetails
}) => {
  return (
    <>
      <div className="detail-group">
        <label>Name *</label>
        {isEditing || isRegisterMode || showStakingForm ? (
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
        <label>Delegation Fee *</label>
        {isEditing || isRegisterMode || showStakingForm ? (
          <input
            type="number"
            name="delegationFee"
            value={formData.delegationFee}
            onChange={handleInputChange}
            min="0"
            max="100"
            className="edit-input"
            placeholder="Enter fee percentage (required)"
            required
          />
        ) : (
          <div className="detail-value">
            {parsedDetails.commission !== undefined ? `${parsedDetails.commission}%` : 'N/A'}
          </div>
        )}
      </div>

      <div className="detail-group description-group">
        <label>Description</label>
        {isEditing || isRegisterMode || showStakingForm ? (
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

      <div className="detail-group">
        <label>Twitter</label>
        {isEditing || isRegisterMode || showStakingForm ? (
          <input
            type="text"
            name="twitter"
            value={formData.twitter}
            onChange={handleInputChange}
            className="edit-input"
            placeholder="@username"
          />
        ) : (
          <div className="detail-value">
            {parsedDetails.twitter || 'N/A'}
          </div>
        )}
      </div>

      <div className="detail-group">
        <label>Discord</label>
        {isEditing || isRegisterMode || showStakingForm ? (
          <input
            type="text"
            name="discord"
            value={formData.discord}
            onChange={handleInputChange}
            className="edit-input"
            placeholder="username#0000"
          />
        ) : (
          <div className="detail-value">
            {parsedDetails.discord || 'N/A'}
          </div>
        )}
      </div>

      <div className="detail-group">
        <label>Telegram</label>
        {isEditing || isRegisterMode || showStakingForm ? (
          <input
            type="text"
            name="telegram"
            value={formData.telegram}
            onChange={handleInputChange}
            className="edit-input"
            placeholder="@username"
          />
        ) : (
          <div className="detail-value">
            {parsedDetails.telegram || 'N/A'}
          </div>
        )}
      </div>

      <div className="detail-group">
        <label>Website Domain</label>
        {isEditing || isRegisterMode || showStakingForm ? (
          <input
            type="text"
            name="domain"
            value={formData.domain}
            onChange={handleInputChange}
            className="edit-input"
            placeholder="example.com"
          />
        ) : (
          <div className="detail-value">
            {parsedDetails.domain || 'N/A'}
          </div>
        )}
      </div>
    </>
  );
};
