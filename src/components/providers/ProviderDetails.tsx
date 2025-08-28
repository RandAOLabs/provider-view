import React, { useState, useEffect, useMemo } from 'react'
import { FiEdit } from 'react-icons/fi'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import { ProviderInfoAggregate } from 'ao-js-sdk'
import { aoHelpers, MINIMUM_STAKE_AMOUNT, TOKEN_DECIMALS } from '../../utils/ao-helpers'
import { ActiveRequests } from './ActiveRequests'
import { ProviderActorSection } from './ProviderActorSection'
import { StakeSection } from './StakeSection'
import { ProviderFormFields } from './ProviderFormFields'
import { ProviderStatusSection } from './ProviderStatusSection'
import { ProviderMetrics } from './ProviderMetrics'
import { SocialLinksSection } from './SocialLinksSection'
import { ProviderDescription } from './ProviderDescription'
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
type ProviderMode = 'view' | 'setup';

// Styles are now in ProviderDetails.css

interface ProviderDetailsProps {
  currentProvider?: ProviderInfoAggregate;
  isEditing?: boolean;
  onSave?: (formData: any) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  walletBalance?: string | null;
  onCancel?: () => void;
  mode?: ProviderMode;
}

export const ProviderDetails: React.FC<ProviderDetailsProps> = ({ 
  currentProvider: externalCurrentProvider, 
  isEditing: defaultIsEditing,
  onSave,
  isSubmitting: externalIsSubmitting,
  submitLabel = 'Save Changes',
  walletBalance: externalWalletBalance,
  onCancel: externalOnCancel,
  mode: externalMode
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
    // If external mode is provided, use it
    if (externalMode) {
      setMode(externalMode);
      if (externalCurrentProvider) {
        setProvider(externalCurrentProvider);
      }
      return;
    }

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
        setMode('setup');
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
        setMode(defaultIsEditing ? 'setup' : 'view');
      } else if (walletAddress) {
        // User is connected but not a provider - default to view mode
        setMode('view');
      }
    } else if (walletAddress) {
      // If we don't have providers data yet but have wallet address, default to view mode
      setMode('view');
    }
  }, [externalCurrentProvider, walletAddress, defaultIsEditing, externalWalletBalance, providers, providersLoading, externalMode]);
  
  // Fetch wallet balance if showing the staking form
  useEffect(() => {
    if ((mode === 'setup' || showStakingForm) && walletAddress && !walletBalance) {
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

  // Format token amount for display
  const formatTokenAmount = (amount: string): string => {
    const parsed = parseFloat(amount || "0") / Math.pow(10, TOKEN_DECIMALS);
    return parsed.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  // Helper functions for mode checking
  const isSetupMode = (mode: ProviderMode) => mode === 'setup';
  const isViewMode = (mode: ProviderMode) => mode === 'view';
  
  // Check if wallet is recognized as a provider owner
  const isWalletRecognized = () => {
    if (!walletAddress) return false;
    return providers.some(p => p.providerId === walletAddress) || (provider && provider.providerId === walletAddress);
  };
  
  const isNewProviderSetup = !provider && (mode === 'setup' || showStakingForm);

  const [formData, setFormData] = useState(() => ({
    name: parsedDetails.name || '',
    delegationFee: parsedDetails.commission || '',
    description: parsedDetails.description || '',
    twitter: parsedDetails.twitter || '',
    discord: parsedDetails.discord || '',
    telegram: parsedDetails.telegram || '',
    domain: parsedDetails.domain || '',
    providerId: '' // Add providerId field for actor functionality
  }));

  // Update formData when provider data changes or when switching to edit mode
  useEffect(() => {
    if (provider && parsedDetails) {
      setFormData(prev => ({
        name: parsedDetails.name || '',
        delegationFee: parsedDetails.commission || '',
        description: parsedDetails.description || '',
        twitter: parsedDetails.twitter || '',
        discord: parsedDetails.discord || '',
        telegram: parsedDetails.telegram || '',
        domain: parsedDetails.domain || '',
        providerId: prev.providerId || '' // Preserve any custom providerId
      }));
    }
  }, [provider, parsedDetails, isEditing]);

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
    
    // Validate staking amount when in setup mode for new providers
    if (isSetupMode(mode) || showStakingForm) {
      const isEditingExistingProvider = isWalletRecognized();
      
      // Only validate stake amount for new providers (not editing existing ones)
      if (!isEditingExistingProvider) {
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
    }
    
    // For setup mode, handle staking
    if (isSetupMode(mode)) {
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
      // Use stakeWithDetails for provider updates with 0 quantity
      const actorId = (formData as any).providerId || provider?.providerId;
      const result = await aoHelpers.stakeWithDetails('0', updatedFormData, actorId);
      
      if (result) {
        // Refresh providers to get updated data
        await refreshProviders()
      } else {
        throw new Error('Update operation failed');
      }
      
      setIsEditing(false)
      setError('')
      setSuccess('Provider details updated successfully!')
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
      
      // Call stakeTokens function from ao-helpers with potential actor ID
      const actorId = (formData as any).providerId || undefined;
      await aoHelpers.stakeTokens(rawIncreaseAmount, undefined, actorId);
      
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

  // Handle staking to become a provider or update existing provider
  const handleStake = async (details) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess('');

    try {
      // Determine quantity based on mode:
      // - 0 for edit mode (no stake change)
      // - minimum 10k for registration
      const isEditingExistingProvider = isWalletRecognized();
      const quantity = isEditingExistingProvider ? '0' : stakeAmount;
      
      // Use provider ID as actor ID
      const actorId = (details as any).providerId || walletAddress;
      
      // Use stakeWithDetails method
      const result = await aoHelpers.stakeWithDetails(quantity, details, actorId);
      
      if (result) {
        setSuccess(isEditingExistingProvider ? 'Successfully updated provider details!' : 'Successfully staked tokens and registered as provider!');
        
        // Refresh the providers list to get updated data
        if (refreshProviders) {
          await refreshProviders();
        }
        
        // Find the updated/new provider and set it
        if (walletAddress) {
          const updatedProvider = providers.find(p => p.providerId === walletAddress);
          if (updatedProvider) {
            setProvider(updatedProvider);
            setMode('view');
          }
        }
        
        // Hide staking form after success
        setShowStakingForm(false);
      } else {
        throw new Error('Staking operation failed');
      }
    } catch (err) {
      console.error('Error with staking operation:', err);
      setError('Failed to process provider details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const changeCount = Object.keys(changes).length;

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Show nothing on error
  if (error && !showStakingForm && mode !== 'setup') {
    return null;
  }


  // Handle view mode behavior based on wallet recognition
  if (isViewMode(mode)) {
    if (!isWalletRecognized()) {
      // Wallet not recognized - show "Become a Provider" UI
      return (
        <div className="add-provider">
          <h2>Become a Provider</h2>
          <p>By running a provider, you become a contributor to the ecosystem and can earn rewards.</p>
          <button className="start-btn" onClick={() => setMode('setup')}>Become a Provider →</button>
        </div>
      );
    }
    // Wallet recognized - continue with normal view mode
  }

  // Handle setup mode behavior based on wallet recognition
  if (isSetupMode(mode)) {
    if (!isWalletRecognized() && !showStakingForm) {
      // New provider setup - show staking form
      setShowStakingForm(true);
    }
    // If wallet is recognized, it will show edit form automatically
  }

  return (
    <div className="provider-details">
      <div className="provider-details-header">
        <h2>
          {isSetupMode(mode) ? (isWalletRecognized() ? 'Edit Provider Configuration' : 'Setup New Provider') :
           'Provider Details'}
        </h2>
        {isViewMode(mode) && (
          <button className="edit-btn" onClick={() => setIsEditing(!isEditing)}>
            <FiEdit /> {isEditing ? 'Cancel Edit' : 'Edit Provider'}
          </button>
        )}
        {isEditing && externalOnCancel && (
          <button className="edit-btn" onClick={externalOnCancel}>
            <FiEdit /> Cancel
          </button>
        )}
        {showStakingForm && isSetupMode(mode) && isWalletRecognized() && (
          <button className="edit-btn" onClick={() => setShowStakingForm(false)}>
            <FiEdit /> Cancel
          </button>
        )}
      </div>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="provider-details-content">
        <div className="provider-grid">
          <ProviderFormFields
            isEditing={isEditing || isSetupMode(mode)}
            isRegisterMode={false}
            showStakingForm={showStakingForm || isSetupMode(mode)}
            formData={formData}
            handleInputChange={handleInputChange}
            parsedDetails={parsedDetails}
          />

          <ProviderActorSection
            isEditing={isEditing || isSetupMode(mode)}
            isRegisterMode={false}
            showStakingForm={showStakingForm || isSetupMode(mode)}
            formData={formData}
            handleInputChange={handleInputChange}
            provider={provider}
            walletAddress={walletAddress}
            copiedAddress={copiedAddress}
            copyToClipboard={copyToClipboard}
            truncateAddress={truncateAddress}
            isSetupMode={isSetupMode(mode)}
          />

          <div className="detail-group">
            <label>Join Date</label>
            <div className="detail-value">
              {provider?.providerInfo?.created_at ? new Date(provider.providerInfo.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : (isSetupMode(mode) ? new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A')}
            </div>
          </div>

          <StakeSection
            isRegisterMode={false}
            showStakingForm={showStakingForm || isSetupMode(mode)}
            isViewMode={isViewMode(mode)}
            isEditMode={isSetupMode(mode)}
            provider={provider}
            formatTokenAmount={formatTokenAmount}
            isBelowMinimumStake={isBelowMinimumStake}
            increaseStakeAmount={increaseStakeAmount}
            setIncreaseStakeAmount={setIncreaseStakeAmount}
            handleIncreaseStake={handleIncreaseStake}
            isIncreasingStake={isIncreasingStake}
            displayStakeAmount={displayStakeAmount}
            setDisplayStakeAmount={setDisplayStakeAmount}
            stakeAmount={stakeAmount}
            setStakeAmount={setStakeAmount}
            walletBalance={walletBalance}
            rawToDisplayValue={rawToDisplayValue}
            displayToRawValue={displayToRawValue}
            MINIMUM_STAKE_AMOUNT={MINIMUM_STAKE_AMOUNT}
            TOKEN_DECIMALS={TOKEN_DECIMALS}
            formatTimeAgo={formatTimeAgo}
          />
          
          {/* Only show provider-specific metrics if not in setup mode */}
          {!isNewProviderSetup && !isSetupMode(mode) && (
            <ProviderMetrics provider={provider} />
          )}
          
          {/* Description moved next to random value fee */}
          <ProviderDescription
            isEditing={isEditing || showStakingForm || isSetupMode(mode)}
            formData={formData}
            parsedDetails={parsedDetails}
            onInputChange={handleInputChange}
          />
          
          {/* Provider Status Section - Only shown for existing providers */}
          {!isNewProviderSetup && !isSetupMode(mode) && (
            <ProviderStatusSection
              provider={provider}
              availableRandom={availableRandom}
              isUpdatingRandom={isUpdatingRandom}
              randomUpdateSuccess={randomUpdateSuccess}
              isClaimingRewards={isClaimingRewards}
              claimSuccess={claimSuccess}
              onUpdateAvailableRandom={handleUpdateAvailableRandom}
              onClaimRewards={handleClaimRewards}
            />
          )}
        </div>

        {/* Empty container to support the side-by-side layout */}
        {!isNewProviderSetup && !isSetupMode(mode) && (
          <>
            {/* Empty div to support layout */}
          </>
        )}

        {/* Active Requests Section - Only shown for existing providers */}
        {!isNewProviderSetup && !isSetupMode(mode) && provider?.providerId && (
          <div className="detail-group">
            <ActiveRequests providerId={provider.providerId} />
          </div>
        )}

        <SocialLinksSection
          isEditing={isEditing || showStakingForm || isSetupMode(mode)}
          formData={formData}
          parsedDetails={parsedDetails}
          onInputChange={handleInputChange}
        />

        {/* Always show button in setup mode, otherwise only show when there are changes */}
        {((isEditing || showStakingForm || isSetupMode(mode)) && (isNewProviderSetup || isSetupMode(mode) || changeCount > 0)) && (
          <button 
            type="button" 
            className="save-btn" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {showStakingForm || (isSetupMode(mode) && !isWalletRecognized()) ? 'Stake and Become Provider' : 
             isSetupMode(mode) && isWalletRecognized() ? (submitLabel || 'Update Provider') :
             (isNewProviderSetup ? submitLabel : `${submitLabel} (${changeCount} change${changeCount !== 1 ? 's' : ''})`)}
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
