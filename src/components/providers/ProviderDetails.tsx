import React, { useState, useMemo, useEffect } from 'react'
import { FiEdit2, FiGlobe, FiPower, FiLoader, FiCheck, FiCopy } from 'react-icons/fi'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { BiRefresh } from 'react-icons/bi'
import { aoHelpers } from '../../utils/ao-helpers'
import { ProviderInfoAggregate, ProviderInfo, ProviderActivity } from 'ao-process-clients'
import './ProviderDetails.css'

interface ProviderDetailsProps {
  provider: ProviderInfoAggregate;
  isEditing?: boolean;
  onSave?: (formData: any) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export const ProviderDetails: React.FC<ProviderDetailsProps> = ({ 
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
  const [availableRandom, setAvailableRandom] = useState<number | null>(null)
  const [isUpdatingRandom, setIsUpdatingRandom] = useState(false)
  const [randomUpdateSuccess, setRandomUpdateSuccess] = useState(false)
  const [activeRequests, setActiveRequests] = useState<{ challengeRequests: string[], outputRequests: string[] } | null>(null)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  // Fetch available random values and active requests
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (provider && provider.providerId) {
          // Get random balance from provider activity
          const randomValue = provider.providerActivity?.random_balance;
          console.log('Available random value:', randomValue);
          // Convert undefined to null for state
          setAvailableRandom(randomValue !== undefined ? randomValue : null);
          
          // Fetch active requests
          fetchActiveRequests();
        }
      } catch (err) {
        console.error('Error fetching provider data:', err);
        // Default to 0 if there's an error
        setAvailableRandom(0);
      }
    };

    fetchData();
  }, [provider]);
  
  const fetchActiveRequests = async () => {
    if (!provider || !provider.providerId) return;
    
    setLoadingRequests(true);
    try {
      console.log(`Fetching active requests for provider: ${provider.providerId}`);
      const response = await aoHelpers.getOpenRandomRequests(provider.providerId);
      console.log('Processing active requests response:', {
        providerId: provider.providerId,
        hasResponse: !!response,
        hasChallengeRequests: !!response?.activeChallengeRequests,
        hasOutputRequests: !!response?.activeOutputRequests
      });
      
      if (!response?.activeChallengeRequests?.request_ids || !response?.activeOutputRequests?.request_ids) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response structure from getOpenRandomRequests');
      }

      setActiveRequests({
        challengeRequests: response.activeChallengeRequests.request_ids,
        outputRequests: response.activeOutputRequests.request_ids
      });
      console.log('Successfully updated active requests state');
    } catch (error) {
      console.error('Error fetching active requests:', error);
      // Set empty requests on error
      setActiveRequests({
        challengeRequests: [],
        outputRequests: []
      });
    } finally {
      setLoadingRequests(false);
    }
  };
  
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };
  
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Parse provider details once and memoize
  const parsedDetails = useMemo(() => {
    try {
      // Access provider details from the new structure
      return provider.providerInfo?.provider_details || {};
    } catch (err) {
      console.error('Error parsing provider details:', err);
      return {};
    }
  }, [provider.providerInfo?.provider_details]);

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
        // Convert delegationFee to string if it's a number
        const updatedFormData = {
          ...formData,
          delegationFee: String(formData.delegationFee)
        };
        await aoHelpers.updateProviderDetails(updatedFormData)
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
      await aoHelpers.unstakeTokens(provider.providerId)
      window.location.reload() // Refresh to show updated state
    } catch (err) {
      console.error('Error unstaking:', err)
    }
  }

  const handleUpdateAvailableRandom = async (value: number) => {
    setIsUpdatingRandom(true);
    setRandomUpdateSuccess(false);
    try {
      const result = await aoHelpers.updateProviderAvalibleRandom(value);
      if (result) {
        setAvailableRandom(value);
        setRandomUpdateSuccess(true);
        setTimeout(() => setRandomUpdateSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error updating available random:', err);
      setError('Failed to update provider status');
    } finally {
      setIsUpdatingRandom(false);
    }
  }

  // Get message based on available random value
  const getRandomStatusMessage = () => {
    if (availableRandom === -1) {
      return {
        message: "Provider has been turned off by user",
        action: "Click here to turn back on",
        value: 0,
        className: "provider-status-user-off"
      };
    } else if (availableRandom === -2) {
      return {
        message: "Provider has been turned off by random process",
        subMessage: "Your provider failed to meet requirements. Contact team for more info.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-process-off"
      };
    } else if (availableRandom === -3) {
      return {
        message: "Provider has been turned off by team",
        subMessage: "Contact team if you don't know why.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-team-off"
      };
    } else {
      return {
        message: `Provider is active`,
        subMessage: `${availableRandom !== null ? `Available random values: ${availableRandom}` : ''}`,
        action: "Turn off provider",
        value: -1,
        className: "provider-status-active"
      };
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
              onClick={() => copyToClipboard(provider.providerId)}
              title="Click to copy address"
            >
              {truncateAddress(provider.providerId)}
              {copiedAddress === provider.providerId ? (
                <FiCheck className="copy-icon success" />
              ) : (
                <FiCopy className="copy-icon" />
              )}
            </div>
          </div>

          <div className="detail-group">
            <label>Join Date</label>
            <div className="detail-value">
              {provider.providerInfo?.created_at ? new Date(provider.providerInfo.created_at).toLocaleDateString('en-US', {
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
                {provider.providerInfo?.stake ? (parseFloat(provider.providerInfo.stake.amount || "0") / Math.pow(10, 18)).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6
                }) : '0'}
              </div>
              {isEditing && (
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
          
          <div className="detail-group">
            <label>Random Available</label>
            <div className="detail-value">
              {provider.providerActivity?.random_balance !== undefined ? 
                provider.providerActivity.random_balance : 'N/A'}
            </div>
          </div>
          
          <div className="detail-group">
            <label>Random Provided</label>
            <div className="detail-value">
              {provider.totalFullfullilled !== undefined ? 
                provider.totalFullfullilled : '0'}
            </div>
          </div>
          
          <div className="detail-group">
            <label>Random Value Fee</label>
            <div className="detail-value">
              0
            </div>
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

        {/* Provider Status Section */}
        <div className="detail-group provider-status-section">
          <label>Provider Status</label>
          {availableRandom !== null ? (
            <div className={`provider-status ${getRandomStatusMessage().className}`}>
              <div className="status-message">
                <div>
                  <p><strong>{getRandomStatusMessage().message}</strong></p>
                  {getRandomStatusMessage().subMessage && (
                    <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                      {getRandomStatusMessage().subMessage}
                    </p>
                  )}
                </div>
                <button 
                  className="status-action-btn"
                  onClick={() => handleUpdateAvailableRandom(getRandomStatusMessage().value)}
                  disabled={isUpdatingRandom}
                >
                  {isUpdatingRandom ? (
                    <span className="loading-spinner"><BiRefresh className="spin" /></span>
                  ) : (
                    <>
                      <FiPower /> {getRandomStatusMessage().action}
                    </>
                  )}
                </button>
                {randomUpdateSuccess && (
                  <div className="success-message">Provider status updated successfully!</div>
                )}
              </div>
            </div>
          ) : (
            <div className="detail-value">Loading status...</div>
          )}
        </div>

        {/* Active Requests Section */}
        <div className="detail-group active-requests-section">
          <div className="active-requests-header">
            <label>Active Requests</label>
            <button
              className={`refresh-button${loadingRequests ? ' loading' : ''}`}
              onClick={fetchActiveRequests}
              disabled={loadingRequests}
            >
              {loadingRequests ? (
                <FiLoader className="animate-spin" size={16} />
              ) : (
                <svg className="refresh-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              )}
            </button>
          </div>
          
          {activeRequests ? (
            <div className="requests-container">
              <div className="request-group">
                <h4>Challenge Requests ({activeRequests.challengeRequests.length})</h4>
                <div className="request-list">
                  {activeRequests.challengeRequests.length > 0 ? (
                    activeRequests.challengeRequests.map((requestId, index) => (
                      <div key={index} className="request-item">
                        {truncateAddress(requestId)}
                      </div>
                    ))
                  ) : (
                    <div>No active challenge requests</div>
                  )}
                </div>
              </div>
              <div className="request-group">
                <h4>Output Requests ({activeRequests.outputRequests.length})</h4>
                <div className="request-list">
                  {activeRequests.outputRequests.length > 0 ? (
                    activeRequests.outputRequests.map((requestId, index) => (
                      <div key={index} className="request-item">
                        {truncateAddress(requestId)}
                      </div>
                    ))
                  ) : (
                    <div>No active output requests</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="loading-spinner">
              <FiLoader className="animate-spin" size={24} />
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
