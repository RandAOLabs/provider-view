import React, { useState, useMemo, useEffect } from 'react'
import { FiEdit2, FiGlobe } from 'react-icons/fi'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { aoHelpers } from '../../utils/ao-helpers'
import './ProviderDetails.css'

export const ProviderDetails = ({ 
  provider, 
  isEditing: defaultIsEditing,
  onSave,
  isSubmitting,
  submitLabel = 'Save Changes'
}) => {
  const [isEditing, setIsEditing] = useState(defaultIsEditing || false)
  const [showUnstakeWarning, setShowUnstakeWarning] = useState(false)
  const [changes, setChanges] = useState({})
  const [error, setError] = useState('')

  // Parse provider details once and memoize
  const parsedDetails = useMemo(() => {
    try {
      return provider.provider_details ? JSON.parse(provider.provider_details) : {};
    } catch (err) {
      console.error('Error parsing provider details:', err);
      return {};
    }
  }, [provider.provider_details]);

  const [formData, setFormData] = useState(() => ({
    name: parsedDetails.name || '',
    delegationFee: parsedDetails.commission || '',
    description: parsedDetails.description || '',
    twitter: parsedDetails.twitter || '',
    discord: parsedDetails.discord || '',
    telegram: parsedDetails.telegram || '',
    domain: parsedDetails.domain || ''
  }));

  // Track changes
  useEffect(() => {
    const newChanges = {};
    Object.keys(formData).forEach(key => {
      const originalValue = parsedDetails[key === 'delegationFee' ? 'commission' : key] || '';
      if (formData[key] !== originalValue) {
        newChanges[key] = true;
      }
    });
    setChanges(newChanges);
  }, [formData, parsedDetails]);

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('') // Clear any previous error
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name?.trim()) {
      setError('Name is required')
      return
    }
    if (!formData.delegationFee) {
      setError('Delegation Fee is required')
      return
    }
    if (!formData.description?.trim()) {
      setError('Description is required')
      return
    }

    if (onSave) {
      await onSave(formData)
    } else {
      try {
        await aoHelpers.updateProviderDetails(formData)
        setIsEditing(false)
        setError('')
      } catch (error) {
        console.error('Error updating provider details:', error)
        setError('Failed to update provider details')
      }
    }
  }

  const handleUnstake = async () => {
    try {
      await aoHelpers.unstakeTokens(provider.provider_id)
      window.location.reload() // Refresh to show updated state
    } catch (err) {
      console.error('Error unstaking:', err)
    }
  }

  const changeCount = Object.keys(changes).length;

  return (
    <div className="provider-details">
      <div className="provider-details-header">
        <h2>Provider Details</h2>
        {!defaultIsEditing && (
          <button className="edit-btn" onClick={() => setIsEditing(!isEditing)}>
            <FiEdit2 /> {isEditing ? 'Cancel Edit' : 'Edit Provider'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="provider-details-content">
        <div className="provider-grid">
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

          <div className="detail-group">
            <label>Provider ID</label>
            <div 
              className="detail-value monospace clickable"
              onClick={() => {
                navigator.clipboard.writeText(provider.provider_id);
              }}
              title="Click to copy address"
            >
              {`${provider.provider_id.slice(0, 4)}...${provider.provider_id.slice(-4)}`}
            </div>
          </div>

          <div className="detail-group">
            <label>Status</label>
            <div className={`status-badge ${provider.active === 1 ? 'active' : 'inactive'}`}>
              {provider.active === 1 ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="detail-group">
            <label>Join Date</label>
            <div className="detail-value">
              {provider.created_at ? new Date(provider.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A'}
            </div>
          </div>

          <div className="detail-group">
            <label>Total Staked</label>
            <div className="stake-group">
              <div className="detail-value">
                {provider.stake ? (parseFloat(JSON.parse(provider.stake).amount || 0) / Math.pow(10, 18)).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6
                }) : '0'}
              </div>
              {isEditing && provider.active === 1 && (
                <button 
                  className="unstake-btn-small"
                  onClick={() => setShowUnstakeWarning(true)}
                >
                  <GiTwoCoins /> Unstake
                </button>
              )}
            </div>
          </div>

          <div className="detail-group">
            <label>Delegation Fee *</label>
            {isEditing ? (
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
        </div>

        <div className="detail-group">
          <label>Description *</label>
          {isEditing ? (
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
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

        <div className="social-group">
          <div className="social-item">
            <FaTwitter />
            {isEditing ? (
              <input
                type="text"
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
                placeholder="example.com (optional)"
                className="edit-input"
              />
            ) : (
              <span>{parsedDetails.domain || 'N/A'}</span>
            )}
          </div>
        </div>

        {isEditing && changeCount > 0 && (
          <button 
            type="button" 
            className="save-btn" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {submitLabel} ({changeCount} change{changeCount !== 1 ? 's' : ''})
          </button>
        )}
      </div>

      {showUnstakeWarning && (
        <div className="warning-modal">
          <div className="warning-content">
            <h3>Warning: Unstake Provider</h3>
            <p>Are you sure you want to unstake and leave the network? This action cannot be undone.</p>
            <div className="warning-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowUnstakeWarning(false)}
              >
                Cancel
              </button>
              <button 
                className="unstake-btn"
                onClick={handleUnstake}
              >
                Unstake and Leave Network
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
