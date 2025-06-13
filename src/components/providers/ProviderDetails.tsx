import React, { useState, useMemo, useEffect } from 'react'
import { FiEdit2, FiGlobe, FiPower, FiCheck, FiCopy, FiChevronUp, FiChevronDown, FiAlertTriangle } from 'react-icons/fi'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { BiRefresh } from 'react-icons/bi'
import { aoHelpers, MINIMUM_STAKE_AMOUNT, TOKEN_DECIMALS } from '../../utils/ao-helpers'
import { ProviderInfoAggregate } from 'ao-js-sdk'
import { ActiveRequests } from './ActiveRequests'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import './ProviderDetails.css'

// Modal component for confirmation dialogs
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          {message}
        </div>
        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onCancel}>{cancelText}</button>
          <button className="modal-confirm-btn" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

// Define provider mode type outside the component to ensure consistent type checking
type ProviderMode = 'view' | 'edit' | 'register';

// Add CSS for stake status display
const stakeStatusStyles = `
/* Alert styles */
.stake-alert {
  display: flex;
  align-items: center;
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
  font-size: 14px;
}

.stake-alert-icon {
  margin-right: 8px;
  color: #856404;
}

/* Increase stake styles */
.increase-stake-section {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.increase-stake-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.increase-stake-value {
  font-size: 15px;
  font-weight: 500;
  flex-grow: 1;
  padding: 5px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #f8f9fa;
  text-align: center;
}

.increase-stake-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: 4px;
  background-color: #f1f1f1;
  border: 1px solid #ddd;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.increase-stake-btn:hover {
  background-color: #e0e0e0;
}

.increase-stake-submit {
  background-color: #2a6dc9;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: 500;
  margin-top: 8px;
}

.increase-stake-submit:hover {
  background-color: #1c54a8;
}

.increase-stake-submit:disabled {
  background-color: #b0c9e8;
  cursor: not-allowed;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.modal-header {
  margin-bottom: 15px;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.modal-body {
  margin-bottom: 20px;
  line-height: 1.5;
}

.modal-body ul {
  padding-left: 20px;
  margin: 10px 0;
}

.modal-body li {
  margin-bottom: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-cancel-btn {
  background-color: #f1f1f1;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
}

.modal-confirm-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
}

.modal-cancel-btn:hover {
  background-color: #e0e0e0;
}

.modal-confirm-btn:hover {
  background-color: #c82333;
}

.provider-status-section {
  grid-column: 3 / -1;
  width: 100%;
}

.stake-status {
  font-size: 12px;
  margin-top: 5px;
  padding: 3px 6px;
  border-radius: 4px;
  display: inline-block;
  text-transform: capitalize;
}

.stake-status.unstaking {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}

.stake-status.staked {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.stake-timestamp {
  font-style: italic;
  font-weight: normal;
}

.staking-input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stake-amount-input {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stake-amount-input label {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}

.stake-amount-input .staking-info-note {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.stake-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.max-stake-btn {
  background-color: #2a6dc9;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  height: 32px;
  margin-top: 18px;
}

.max-stake-btn:hover {
  background-color: #1c54a8;
}

.description-group {
  grid-column: 1 / 3;
  width: 100%;
}

.status-message {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.status-actions {
  display: flex;
  flex-direction: column;
}
`;

// Insert the styles into the document
const styleElement = document.createElement('style');
styleElement.textContent = stakeStatusStyles;
document.head.appendChild(styleElement);

interface ProviderDetailsProps {
  currentProvider?: ProviderInfoAggregate;
  isEditing?: boolean;
  onSave?: (formData: any) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  walletBalance?: string | null;
  onCancel?: () => void;
}

export const ProviderDetails: React.FC<ProviderDetailsProps> = ({ 
  currentProvider: externalCurrentProvider, 
  isEditing: defaultIsEditing,
  onSave,
  isSubmitting: externalIsSubmitting,
  submitLabel = 'Save Changes',
  walletBalance: externalWalletBalance,
  onCancel: externalOnCancel
}) => {
  const { address: walletAddress } = useWallet()
  const { providers, loading: providersLoading, error: providersError, refreshProviders } = useProviders()
  const [mode, setMode] = useState<ProviderMode>('view')
  const [provider, setProvider] = useState<ProviderInfoAggregate | null>(null)
  const [error, setError] = useState<string | null>(providersError)
  const [success, setSuccess] = useState('')
  const isLoading = providersLoading
  const [walletBalance, setWalletBalance] = useState<string | null>(externalWalletBalance || null)
  const [isSubmitting, setIsSubmitting] = useState(externalIsSubmitting || false)
  const [isEditing, setIsEditing] = useState(defaultIsEditing || false)
  const [showUnstakeWarning, setShowUnstakeWarning] = useState(false)
  const [changes, setChanges] = useState({})
  const [isBelowMinimumStake, setIsBelowMinimumStake] = useState(false)
  const [increaseStakeAmount, setIncreaseStakeAmount] = useState<string>('1000')
  const [isIncreasingStake, setIsIncreasingStake] = useState(false)
  const [availableRandom, setAvailableRandom] = useState<number | null>(null)
  const [isUpdatingRandom, setIsUpdatingRandom] = useState(false)
  const [randomUpdateSuccess, setRandomUpdateSuccess] = useState(false)
  const [isClaimingRewards, setIsClaimingRewards] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [activeRequests, setActiveRequests] = useState<{ challengeRequests: string[], outputRequests: string[] } | null>(null)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [showStakingForm, setShowStakingForm] = useState(false)
  const [showTurnOffModal, setShowTurnOffModal] = useState(false)
  const [showUnstakeModal, setShowUnstakeModal] = useState(false)
  // Convert between display value (human readable) and raw value (with decimals)
  const rawToDisplayValue = (raw: string): string => {
    const rawNum = parseFloat(raw);
    return (rawNum / Math.pow(10, TOKEN_DECIMALS)).toString();
  };

  const displayToRawValue = (display: string): string => {
    const displayNum = parseFloat(display);
    return Math.floor(displayNum * Math.pow(10, TOKEN_DECIMALS)).toString();
  };

  // Initialize with minimum stake amount in raw format
  const [stakeAmount, setStakeAmount] = useState<string>(MINIMUM_STAKE_AMOUNT.toString());
  // Separate display value for the input field
  const [displayStakeAmount, setDisplayStakeAmount] = useState<string>(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString()))

  // Initialize provider data
  useEffect(() => {
    // If external provider was passed directly, use it
    if (externalCurrentProvider) {
      setProvider(externalCurrentProvider);
      
      // Check if provider's stake is below minimum required amount
      const stakeAmount = externalCurrentProvider?.providerInfo?.stake?.amount || '0';
      if (parseFloat(stakeAmount) < parseFloat(MINIMUM_STAKE_AMOUNT)) {
        setIsBelowMinimumStake(true);
      } else {
        setIsBelowMinimumStake(false);
      }
      
      // If this is a provider, also fetch wallet balance if not externally provided
      if (!externalWalletBalance && !providersLoading) {
        (async () => {
          try {
            const balance = await aoHelpers.getWalletBalance(externalCurrentProvider.providerId);
            setWalletBalance(balance);
          } catch (err) {
            console.error('Error fetching wallet balance:', err);
          }
        })();
      }
      
      // Get random balance from provider activity
      const randomValue = externalCurrentProvider.providerActivity?.random_balance;
      console.log('Available random value:', randomValue);
      // Convert undefined to null for state
      setAvailableRandom(randomValue !== undefined ? randomValue : null);
      
      // Determine the appropriate mode
      if (defaultIsEditing) {
        setMode('edit');
      } else {
        setMode('view');
      }
    } 
    // Otherwise, if we have a wallet address and providers loaded, try to find the provider
    else if (walletAddress && !providersLoading && providers.length > 0) {
      // Find provider that matches the wallet address
      const foundProvider = providers.find(p => p.providerId === walletAddress);
      
      if (foundProvider) {
        setProvider(foundProvider);
        
        // Get random balance from provider activity
        const randomValue = foundProvider.providerActivity?.random_balance;
        console.log('Available random value:', randomValue);
        // Convert undefined to null for state
        setAvailableRandom(randomValue !== undefined ? randomValue : null);
        
        // Determine mode based on editing state
        setMode(defaultIsEditing ? 'edit' : 'view');
      } else if (walletAddress) {
        // User is connected but not a provider - show registration form
        setMode('register');
      }
    } else if (walletAddress) {
      // If we don't have providers data yet but have wallet address, assume registration mode for now
      setMode('register');
    }
  }, [externalCurrentProvider, walletAddress, defaultIsEditing, externalWalletBalance, providers, providersLoading]);
  
  // Fetch wallet balance if showing the staking form
  useEffect(() => {
    if ((mode === 'register' || showStakingForm) && walletAddress && !walletBalance) {
      const fetchBalance = async () => {
        try {
          console.log('Fetching wallet balance for:', walletAddress);
          const balance = await aoHelpers.getWalletBalance(walletAddress);
          console.log('Wallet balance received:', balance);
          setWalletBalance(balance);
        } catch (err) {
          console.error('Error fetching wallet balance:', err);
        }
      };
      fetchBalance();
    }
  }, [mode, showStakingForm, walletAddress, walletBalance]);
  
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
      return provider?.providerInfo?.provider_details || {};
    } catch (err) {
      console.error('Error parsing provider details:', err);
      return {};
    }
  }, [provider?.providerInfo?.provider_details]);

  // Format timestamp to show how long ago it was
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    
    // Convert to seconds, minutes, hours, days
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffHrs > 0) {
      return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  };

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
  
  // Determine if this is a new provider setup (no stake)
  const isNewProviderSetup = mode === 'register' || (defaultIsEditing && 
    (!provider?.providerInfo?.stake || parseFloat(provider?.providerInfo?.stake?.amount || '0') === 0));

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('') // Clear any previous error
  }

  // Handle staking to become a provider
  const handleStake = async (details) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess('');

    try {
      // Use the user-defined stake amount - already in raw format with decimals
      await aoHelpers.stakeTokens(stakeAmount, details);
      setSuccess('Successfully staked and registered as a provider!');
      
      // Refresh provider details using the context
      await refreshProviders();
      
      // After refresh, the providers list should include the new provider
      // Find the provider that matches the wallet address
      if (walletAddress) {
        const updatedProvider = providers.find(p => p.providerId === walletAddress);
        if (updatedProvider) {
          setProvider(updatedProvider);
          setMode('view');
        }
      }
      
      // Hide staking form after success
      setShowStakingForm(false);
    } catch (err) {
      console.error('Error staking tokens:', err);
      setError('Failed to stake tokens. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    
    // Validate staking amount when in register mode
    if (isRegisterMode(mode) || showStakingForm) {
      if (!stakeAmount || stakeAmount === '') {
        setError('Staking amount is required')
        return
      }
      
      const stakeAmountNum = parseInt(stakeAmount, 10)
      const minAmount = parseInt(MINIMUM_STAKE_AMOUNT.toString(), 10)
      
      if (stakeAmountNum < minAmount) {
        setError(`Minimum staking amount is ${parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString())).toLocaleString()} tokens`)
        return
      }
      
      if (walletBalance && stakeAmountNum > parseInt(walletBalance, 10)) {
        setError(`Staking amount exceeds your available balance of ${parseFloat(rawToDisplayValue(walletBalance)).toLocaleString()} tokens`)
        return
      }
    }
    
    // For registration mode, handle staking
    if (isRegisterMode(mode)) {
      await handleStake(formData);
      return;
    }

    // For edit mode with external handler
    if (onSave) {
      await onSave(formData)
      return;
    }
    
    // Regular edit mode without external handler
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

  const handleUnstake = async () => {
    try {
      if (provider?.providerId) {
        setShowUnstakeModal(false) // Close modal
        await aoHelpers.unstakeTokens(provider.providerId)
        window.location.reload() // Refresh to show updated state
      }
    } catch (err) {
      console.error('Error unstaking:', err)
      setError('Error unstaking tokens. Please try again.')
    }
  }

  const handleUpdateAvailableRandom = async (value: number) => {
    // If turning off provider, show confirmation modal
    if (value === -1) {
      setShowTurnOffModal(true);
      return;
    }
    
    // Otherwise proceed with update
    await updateProviderStatus(value);
  }
  
  const updateProviderStatus = async (value: number) => {
    setIsUpdatingRandom(true);
    setRandomUpdateSuccess(false);
    setShowTurnOffModal(false); // Close modal if open
    
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

  const handleClaimRewards = async () => {
    setIsClaimingRewards(true);
    setClaimSuccess(false);
    setError(null);
    try {
      await aoHelpers.claimRandomRewards();
      setClaimSuccess(true);
      setTimeout(() => setClaimSuccess(false), 3000);
    } catch (err) {
      console.error('Error claiming rewards:', err);
      setError('Failed to claim rewards');
    } finally {
      setIsClaimingRewards(false);
    }
  }
  
  // Handle increasing stake
  const handleIncreaseStake = async () => {
    if (!provider?.providerId) {
      setError('Provider ID not found');
      return;
    }
    
    setIsIncreasingStake(true);
    setError(null);
    setSuccess('');
    
    try {
      // Convert display value (e.g., 1000) to raw value with decimals
      const rawIncreaseAmount = displayToRawValue(increaseStakeAmount);
      
      // Call stakeTokens function from ao-helpers
      await aoHelpers.stakeTokens(rawIncreaseAmount);
      
      setSuccess(`Successfully increased stake by ${increaseStakeAmount} tokens!`);
      
      // Refresh providers to get updated stake amount
      await refreshProviders();
      
      // Reset the increase amount to default
      setIncreaseStakeAmount('1000');
      
      // Check if we're now above the minimum stake
      if (isBelowMinimumStake) {
        // Get the updated provider
        if (walletAddress) {
          const updatedProvider = providers.find(p => p.providerId === walletAddress);
          if (updatedProvider) {
            const stakeAmount = updatedProvider?.providerInfo?.stake?.amount || '0';
            if (parseFloat(stakeAmount) >= parseFloat(MINIMUM_STAKE_AMOUNT)) {
              setIsBelowMinimumStake(false);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error increasing stake:', err);
      setError('Failed to increase stake. Please try again.');
    } finally {
      setIsIncreasingStake(false);
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

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Show nothing on error
  if (error && !showStakingForm && mode !== 'register') {
    return null;
  }

  // Define a helper type guard function to check the mode type
  const isRegisterMode = (m: ProviderMode): m is 'register' => m === 'register';
  const isViewMode = (m: ProviderMode): m is 'view' => m === 'view';
  const isEditMode = (m: ProviderMode): m is 'edit' => m === 'edit';

  // Show 'Become a Provider' UI if the user is not connected or not ready to register
  if (isRegisterMode(mode) && !showStakingForm) {
    return (
      <div className="add-provider">
        <h2>Become a Provider</h2>
        <p>By running a provider, you become a contributor to the ecosystem and can earn rewards.</p>
        <button className="start-btn" onClick={() => setShowStakingForm(true)}>Become a Provider →</button>
      </div>
    );
  }

  return (
    <div className="provider-details">
      <div className="provider-details-header">
        <h2>{isRegisterMode(mode) ? 'Register as Provider' : 'Provider Details'}</h2>
        {isViewMode(mode) && (
          <button className="edit-btn" onClick={() => setIsEditing(!isEditing)}>
            <FiEdit2 /> {isEditing ? 'Cancel Edit' : 'Edit Provider'}
          </button>
        )}
        {isEditing && externalOnCancel && (
          <button className="edit-btn" onClick={externalOnCancel}>
            <FiEdit2 /> Cancel
          </button>
        )}
        {showStakingForm && (
          <button className="edit-btn" onClick={() => setShowStakingForm(false)}>
            <FiEdit2 /> Cancel
          </button>
        )}
      </div>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="provider-details-content">
        <div className="provider-grid">
          <div className="detail-group">
            <label>Name *</label>
            {isEditing || isRegisterMode(mode) || showStakingForm ? (
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
          </div>

          <div className="detail-group">
            <label>Join Date</label>
            <div className="detail-value">
              {provider?.providerInfo?.created_at ? new Date(provider.providerInfo.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : (mode === 'register' ? new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A')}
            </div>
          </div>

          {/* Only show Total Staked for existing providers, not in register mode */}
          {!isRegisterMode(mode) && !showStakingForm && (
            <div className="detail-group">
              <label>Total Staked</label>
              <div className="stake-group">
                <div className="detail-value">
                  {provider?.providerInfo?.stake ? (parseFloat(provider.providerInfo.stake.amount || "0") / Math.pow(10, TOKEN_DECIMALS)).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 6
                  }) : '0'}
                  {walletBalance && (
                    <div className="wallet-balance">
                      Available Balance: {parseFloat(rawToDisplayValue(walletBalance)).toLocaleString()} tokens
                    </div>
                  )}
                  {provider?.providerInfo?.stake?.status && (
                    <div className={`stake-status ${provider.providerInfo.stake.status}`}>
                      {provider.providerInfo.stake.status}
                      {provider.providerInfo.stake.timestamp && (
                        <span className="stake-timestamp">
                          {' - '}{formatTimeAgo(provider.providerInfo.stake.timestamp)}
                        </span>
                      )}
                    </div>
                  )}
                  {isBelowMinimumStake && (
                    <div className="stake-alert">
                      <FiAlertTriangle className="stake-alert-icon" />
                      <span>Your stake is below the minimum required amount. You are no longer active as a provider.</span>
                    </div>
                  )}
                  
                  {/* Increase stake section */}
                  {(isViewMode(mode) || isEditMode(mode)) && (
                    <div className="increase-stake-section">
                      <label>Increase Stake:</label>
                      <div className="increase-stake-controls">
                        <button 
                          className="increase-stake-btn" 
                          onClick={() => {
                            const current = parseFloat(increaseStakeAmount);
                            if (current >= 2000) {
                              setIncreaseStakeAmount((current - 1000).toString());
                            }
                          }}
                          disabled={parseFloat(increaseStakeAmount) <= 1000}
                        >
                          ▼
                        </button>
                        <div className="increase-stake-value">{increaseStakeAmount} tokens</div>
                        <button 
                          className="increase-stake-btn" 
                          onClick={() => {
                            const current = parseFloat(increaseStakeAmount);
                            setIncreaseStakeAmount((current + 1000).toString());
                          }}
                        >
                          ▲
                        </button>
                      </div>
                      <button 
                        className="increase-stake-submit" 
                        onClick={handleIncreaseStake}
                        disabled={isIncreasingStake}
                      >
                        {isIncreasingStake ? 'Processing...' : 'Increase Stake'}
                      </button>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button 
                    className="unstake-btn-small"
                    onClick={() => setShowUnstakeModal(true)}
                  >
                    <GiTwoCoins /> Unstake
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Show staking input for registration, wallet balance info for existing providers */}
          {(isNewProviderSetup || isRegisterMode(mode) || showStakingForm) && (
            <div className="detail-group wallet-status">
              <label>{isRegisterMode(mode) || showStakingForm ? "Staking Amount" : "Staking Information"}</label>
              {(isRegisterMode(mode) || showStakingForm) ? (
                <div className="staking-input-container">
                  <div className="staking-info-compact">
                    <div className="staking-info-icon">
                      <GiTwoCoins className="stake-icon" />
                    </div>
                    <div className="staking-info-content">
                      <span className="staking-info-value">
                        Available: {walletBalance !== null ? 
                          `${parseFloat(rawToDisplayValue(walletBalance || "0")).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 
                          "0"} tokens
                      </span>
                    </div>
                  </div>
                  <div className="stake-amount-input">
                    <label>Amount to Stake:</label>
                    <div className="stake-input-wrapper">
                      <input 
                        type="number" 
                        value={displayStakeAmount} 
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const parsed = parseFloat(newValue);
                          if (!isNaN(parsed)) {
                            // Update display value
                            setDisplayStakeAmount(newValue);
                            
                            // Convert to raw value with decimals
                            const rawValue = displayToRawValue(newValue);
                            const minRaw = parseInt(MINIMUM_STAKE_AMOUNT.toString(), 10);
                            
                            // Ensure minimum stake amount
                            if (parseInt(rawValue, 10) >= minRaw) {
                              setStakeAmount(rawValue);
                            } else {
                              setStakeAmount(MINIMUM_STAKE_AMOUNT.toString());
                            }
                          } else if (newValue === '') {
                            setDisplayStakeAmount('');
                            setStakeAmount('');
                          } else {
                            setDisplayStakeAmount(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString()));
                            setStakeAmount(MINIMUM_STAKE_AMOUNT.toString());
                          }
                        }} 
                        min={parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString()))}
                        step="0.1"
                        className="edit-input"
                        placeholder="Enter amount to stake"
                      />
                      <button 
                        type="button"
                        className="max-stake-btn"
                        onClick={() => {
                          if (walletBalance) {
                            // Set to maximum available balance
                            setStakeAmount(walletBalance);
                            setDisplayStakeAmount(rawToDisplayValue(walletBalance));
                          }
                        }}
                      >
                        MAX
                      </button>
                    </div>
                    <p className="staking-info-note">Minimum {parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString())).toLocaleString()} tokens required to become a provider</p>
                  </div>
                </div>
              ) : (
                <div className="staking-info-compact">
                  <div className="staking-info-icon">
                    <GiTwoCoins className="stake-icon" />
                  </div>
                  <div className="staking-info-content">
                    <span className="staking-info-value">
                      {walletBalance !== null ? 
                        `${(parseFloat(walletBalance || "0") / Math.pow(10, TOKEN_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 
                        "0"} tokens
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="detail-group">
            <label>Delegation Fee *</label>
            {isEditing || isRegisterMode(mode) || showStakingForm ? (
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
          
          {/* Only show provider-specific metrics if not in setup/register mode */}
          {!isNewProviderSetup && !isRegisterMode(mode) && (
            <>
              <div className="detail-group">
                <label>Random Available</label>
                <div className="detail-value">
                  {provider?.providerActivity?.random_balance !== undefined ? 
                    provider.providerActivity.random_balance : 'N/A'}
                </div>
              </div>
              
              <div className="detail-group">
                <label>Random Provided</label>
                <div className="detail-value">
                  {provider?.totalFullfullilled !== undefined ? 
                    provider.totalFullfullilled : '0'}
                </div>
              </div>
              
              <div className="detail-group">
                <label>Random Value Fee</label>
                <div className="detail-value">
                  0
                </div>
              </div>
            </>
          )}
          
          {/* Description moved next to random value fee */}
          <div className="detail-group description-group">
            <label>Description *</label>
            {isEditing || isRegisterMode(mode) || showStakingForm ? (
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
          
          {/* Provider Status Section - Only shown for existing providers */}
          {!isNewProviderSetup && !isRegisterMode(mode) && (
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
                      <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '10px' }}>
                        <strong>Claimable rewards:</strong> {provider?.providerActivity?.fulfillment_rewards ? (provider.providerActivity.fulfillment_rewards/1000000000).toLocaleString() + " Test RNG": "0 Test RNG"}
                      </p>
                    </div>
                    <div className="status-actions">
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
                      <button 
                        className="status-action-btn"
                        onClick={handleClaimRewards}
                        disabled={isClaimingRewards}
                        style={{ marginTop: '8px' }}
                      >
                        {isClaimingRewards ? (
                          <span className="loading-spinner"><BiRefresh className="spin" /></span>
                        ) : (
                          <>
                            <GiTwoCoins /> Claim Rewards
                          </>
                        )}
                      </button>
                    </div>
                    {randomUpdateSuccess && (
                      <div className="success-message">Provider status updated successfully!</div>
                    )}
                    {claimSuccess && (
                      <div className="success-message">Rewards claimed successfully!</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="detail-value">Loading status...</div>
              )}
            </div>
          )}
        </div>

        {/* Empty container to support the side-by-side layout */}
        {!isNewProviderSetup && !isRegisterMode(mode) && (
          <>
            {/* Empty div to support layout */}
          </>
        )}

        {/* Active Requests Section - Only shown for existing providers */}
        {!isNewProviderSetup && !isRegisterMode(mode) && provider?.providerId && (
          <div className="detail-group">
            <ActiveRequests providerId={provider.providerId} />
          </div>
        )}

        <div className="social-group">
          <div className="social-item">
            <FaTwitter />
            {isEditing || isRegisterMode(mode) || showStakingForm ? (
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
            {isEditing || isRegisterMode(mode) || showStakingForm ? (
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
            {isEditing || isRegisterMode(mode) || showStakingForm ? (
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
            {isEditing || isRegisterMode(mode) || showStakingForm ? (
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

        {/* Always show button in setup mode, otherwise only show when there are changes */}
        {((isEditing || isRegisterMode(mode) || showStakingForm) && (isNewProviderSetup || isRegisterMode(mode) || changeCount > 0)) && (
          <button 
            type="button" 
            className="save-btn" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isRegisterMode(mode) || showStakingForm ? 'Stake and Become Provider' : (isNewProviderSetup ? submitLabel : `${submitLabel} (${changeCount} change${changeCount !== 1 ? 's' : ''})`)}
          </button>
        )}
      </div>

      {/* Modals for confirmations */}
      <ConfirmationModal
        isOpen={showTurnOffModal}
        title="Turn Off Provider"
        message={
          <div>
            <p>Are you sure you want to turn off your provider?</p>
            <p>When you turn off your provider:</p>
            <ul>
              <li>You will stop receiving rewards as you will no longer be providing random values</li>
              <li>After all active random requests have been cleared from your node, you can safely turn off the docker container</li>
              <li>Your staked tokens will remain locked</li>
            </ul>
            <p>You can turn your provider back on at any time.</p>
          </div>
        }
        confirmText="Turn Off"
        cancelText="Cancel"
        onConfirm={() => updateProviderStatus(-1)}
        onCancel={() => setShowTurnOffModal(false)}
      />
      
      <ConfirmationModal
        isOpen={showUnstakeModal}
        title="Confirm Unstaking"
        message={
          <div>
            <p>Are you sure you want to unstake your tokens?</p>
            <ul>
              <li>Your stake will be locked for a few days in an unstaking period</li>
              <li>You will need to return to this page to claim your tokens after the unstaking period ends</li>
              <li>Unstaking will make you <strong>ineligible for rewards</strong></li>
              <li>You will no longer be a provider once the unstaking process completes</li>
            </ul>
          </div>
        }
        confirmText="Unstake"
        cancelText="Cancel"
        onConfirm={handleUnstake}
        onCancel={() => setShowUnstakeModal(false)}
      />
    </div>
  )
}
