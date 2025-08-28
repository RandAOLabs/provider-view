import React from 'react'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { FiGlobe } from 'react-icons/fi'

interface SocialLinksSectionProps {
  isEditing: boolean
  formData: {
    twitter: string
    discord: string
    telegram: string
    domain: string
  }
  parsedDetails: {
    twitter?: string
    discord?: string
    telegram?: string
    domain?: string
  }
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const SocialLinksSection: React.FC<SocialLinksSectionProps> = ({
  isEditing,
  formData,
  parsedDetails,
  onInputChange
}) => {
  return (
    <div className="social-group">
      <div className="social-item">
        <FaTwitter />
        {isEditing ? (
          <input
            type="text"
            name="twitter"
            value={formData.twitter}
            onChange={onInputChange}
            placeholder="@username (optional)"
            className="edit-input"
          />
        ) : (
          <span>{parsedDetails.twitter || 'N/A'}</span>
        )}
      </div>

      <div className="social-item">
        <FaDiscord />
        {isEditing ? (
          <input
            type="text"
            name="discord"
            value={formData.discord}
            onChange={onInputChange}
            placeholder="username#0000 (optional)"
            className="edit-input"
          />
        ) : (
          <span>{parsedDetails.discord || 'N/A'}</span>
        )}
      </div>

      <div className="social-item">
        <FaTelegram />
        {isEditing ? (
          <input
            type="text"
            name="telegram"
            value={formData.telegram}
            onChange={onInputChange}
            placeholder="@username (optional)"
            className="edit-input"
          />
        ) : (
          <span>{parsedDetails.telegram || 'N/A'}</span>
        )}
      </div>

      <div className="social-item">
        <FiGlobe />
        {isEditing ? (
          <input
            type="text"
            name="domain"
            value={formData.domain}
            onChange={onInputChange}
            placeholder="example.com (optional)"
            className="edit-input"
          />
        ) : (
          <span>{parsedDetails.domain || 'N/A'}</span>
        )}
      </div>
    </div>
  )
}
