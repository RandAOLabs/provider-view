import React from 'react'

interface ProviderDescriptionProps {
  isEditing: boolean
  formData: {
    description: string
  }
  parsedDetails: {
    description?: string
  }
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export const ProviderDescription: React.FC<ProviderDescriptionProps> = ({
  isEditing,
  formData,
  parsedDetails,
  onInputChange
}) => {
  return (
    <div className="detail-group description-group">
      <label>Description *</label>
      {isEditing ? (
        <textarea
          name="description"
          value={formData.description}
          onChange={onInputChange}
          className="edit-input"
          placeholder="Enter description (required)"
          required
        />
      ) : (
        <div className="detail-value description">
          {parsedDetails.description || 'N/A'}
        </div>
      )}
    </div>
  )
}
