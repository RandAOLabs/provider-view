import React, { useState, useEffect, useMemo } from 'react'
import { ProviderInfoAggregate } from 'ao-js-sdk'
import { RequestFlowMinimal } from './RequestFlowMinimal'
import { ProviderFormFields } from './ProviderFormFields'
import { ProviderMetrics } from './ProviderMetrics'
import { SocialLinksSection } from './SocialLinksSection'
import { TurnOffProviderModal } from './TurnOffProviderModal'
import { UnstakeProviderModal } from './UnstakeProviderModal'
import { SaveChangesModal } from './SaveChangesModal'
import { useProviderActions } from '../../hooks/useProviderActions'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import { aoHelpers, MINIMUM_STAKE_AMOUNT, TOKEN_DECIMALS } from '../../utils/ao-helpers'
import { getProviderTotalRandom } from '../../utils/graphQLquery'
import './ProviderDetails.css'


type ProviderMode = 'view' | 'edit';

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
  
  // Simple state management
  const [mode, setMode] = useState<ProviderMode>(externalMode || 'view')
  const [provider, setProvider] = useState<ProviderInfoAggregate | null>(externalCurrentProvider || null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(externalIsSubmitting || false)
  const [walletBalance, setWalletBalance] = useState<string | null>(externalWalletBalance || null)
  const [showTurnOffModal, setShowTurnOffModal] = useState(false)
  const [showUnstakeModal, setShowUnstakeModal] = useState(false)
  const [showSaveChangesModal, setShowSaveChangesModal] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  
  // Additional state for provider actions
  const [availableRandom, setAvailableRandom] = useState<number | null>(null)
  const [isUpdatingRandom, setIsUpdatingRandom] = useState(false)
  const [randomUpdateSuccess, setRandomUpdateSuccess] = useState(false)
  const [isIncreasingStake, setIsIncreasingStake] = useState(false)
  const [increaseStakeAmount, setIncreaseStakeAmount] = useState('1000')
  const [isBelowMinimumStake, setIsBelowMinimumStake] = useState(false)

  // GraphQL query state for total random
  const [totalRandomGraphQL, setTotalRandomGraphQL] = useState<number | null>(null)
  const [isLoadingGraphQL, setIsLoadingGraphQL] = useState(false)
  
  
  // Form data
  const parsedDetails = useMemo(() => {
    try {
      return provider?.providerInfo?.provider_details || {};
    } catch (err) {
      return {};
    }
  }, [provider?.providerInfo?.provider_details]);

  const [formData, setFormData] = useState(() => ({
    name: parsedDetails.name || '',
    description: parsedDetails.description || '',
    twitter: parsedDetails.twitter || '',
    discord: parsedDetails.discord || '',
    telegram: parsedDetails.telegram || '',
    domain: parsedDetails.domain || '',
    providerId: provider?.providerId || '',
    owner: provider?.owner || '',
    actorId: provider?.providerId || '',
    providerStatus: (() => {
      const balance = provider?.providerActivity?.random_balance ?? 0;
      if (balance >= 0) return '0';
      return balance.toString();
    })()
  }));

  // Track original form data for change detection
  const [originalFormData, setOriginalFormData] = useState(() => ({
    name: parsedDetails.name || '',
    description: parsedDetails.description || '',
    twitter: parsedDetails.twitter || '',
    discord: parsedDetails.discord || '',
    telegram: parsedDetails.telegram || '',
    domain: parsedDetails.domain || '',
    providerId: provider?.providerId || '',
    owner: provider?.owner || '',
    actorId: provider?.providerId || '',
    providerStatus: (() => {
      const balance = provider?.providerActivity?.random_balance ?? 0;
      if (balance >= 0) return '0';
      return balance.toString();
    })()
  }));

  // Track original stake amounts for change detection - always start from 0
  const [originalStakeAmount, setOriginalStakeAmount] = useState<string>('0');
  const [originalDisplayStakeAmount, setOriginalDisplayStakeAmount] = useState<string>('0');

  // Stake amount state - always start from 0
  const [stakeAmount, setStakeAmount] = useState<string>('0');
  const [displayStakeAmount, setDisplayStakeAmount] = useState<string>('0');

  // Helper functions
  const isWalletRecognized = (): boolean => {
    if (!walletAddress) return false;
    return providers.some(p => p.owner === walletAddress) || Boolean(provider && provider.owner === walletAddress);
  };
  
  const isProviderOwner = () => {
    if (!walletAddress || !provider) return false;
    return walletAddress === provider.owner;
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

  const rawToDisplayValue = (raw: string): string => {
    const rawNum = parseFloat(raw);
    return (rawNum / Math.pow(10, TOKEN_DECIMALS)).toString();
  };

  const displayToRawValue = (display: string): string => {
    const displayNum = parseFloat(display);
    return Math.floor(displayNum * Math.pow(10, TOKEN_DECIMALS)).toString();
  };

  // Check if form has changes
  const hasFormChanges = useMemo(() => {
    const fieldsToCompare = ['name', 'description', 'twitter', 'discord', 'telegram', 'domain', 'providerStatus'];
    const hasFormFieldChanges = fieldsToCompare.some(field => formData[field as keyof typeof formData] !== originalFormData[field as keyof typeof originalFormData]);
    const hasStakeChanges = displayStakeAmount !== originalDisplayStakeAmount;
    const hasProviderIdChanges = formData.providerId !== originalFormData.providerId;
    return hasFormFieldChanges || hasStakeChanges || hasProviderIdChanges;
  }, [formData, originalFormData, displayStakeAmount, originalDisplayStakeAmount]);

  // Get list of changes for confirmation modal
  const getFormChanges = () => {
    const fieldsToCompare = ['name', 'description', 'twitter', 'discord', 'telegram', 'domain', 'providerStatus'];
    const fieldLabels = {
      name: 'Name',
      description: 'Description',
      twitter: 'Twitter',
      discord: 'Discord',
      telegram: 'Telegram',
      domain: 'Domain',
      providerStatus: 'Provider Status'
    };
    
    const changes = fieldsToCompare
      .filter(field => formData[field as keyof typeof formData] !== originalFormData[field as keyof typeof originalFormData])
      .map(field => ({
        field: fieldLabels[field as keyof typeof fieldLabels],
        before: field === 'providerStatus' 
          ? (() => {
              const val = originalFormData[field as keyof typeof originalFormData] as string;
              if (val === '0') return 'Active (0)';
              if (val === '-1') return 'Turned Off (-1)';
              if (val === '-2') return 'Slashed (-2)';
              if (val === '-3') return 'Team Disabled (-3)';
              if (val === '-4') return 'Stale (-4)';
              return `Status (${val})`;
            })()
          : originalFormData[field as keyof typeof originalFormData],
        after: field === 'providerStatus'
          ? (() => {
              const val = formData[field as keyof typeof formData] as string;
              if (val === '0') return 'Active (0)';
              if (val === '-1') return 'Turned Off (-1)';
              if (val === '-2') return 'Slashed (-2)';
              if (val === '-3') return 'Team Disabled (-3)';
              if (val === '-4') return 'Stale (-4)';
              return `Status (${val})`;
            })()
          : formData[field as keyof typeof formData]
      }));

    // Add provider ID changes if they exist
    if (formData.providerId !== originalFormData.providerId) {
      changes.push({
        field: 'Provider ID',
        before: originalFormData.providerId || '(empty)',
        after: formData.providerId || '(empty)'
      });
    }

    // Add stake amount changes if they exist
    if (displayStakeAmount !== originalDisplayStakeAmount) {
      changes.push({
        field: 'Stake Amount',
        before: `${originalDisplayStakeAmount} tokens`,
        after: `${displayStakeAmount} tokens`
      });
    }

    return changes;
  };

  // Initialize provider data
  useEffect(() => {
    if (externalCurrentProvider) {
      setProvider(externalCurrentProvider);
      setMode(defaultIsEditing ? 'edit' : 'view');
    } else if (walletAddress && !providersLoading && providers.length > 0) {
      const foundProvider = providers.find(p => p.owner === walletAddress);
      if (foundProvider) {
        setProvider(foundProvider);
        setMode(defaultIsEditing ? 'edit' : 'view');
      } else {
        setMode('view'); // Show "Become a Provider" UI
      }
    }
  }, [externalCurrentProvider, walletAddress, providers, providersLoading, defaultIsEditing]);

  // Update form data when provider changes
  useEffect(() => {
    if (provider) {
      const newFormData = {
        name: parsedDetails.name || '',
        description: parsedDetails.description || '',
        twitter: parsedDetails.twitter || '',
        discord: parsedDetails.discord || '',
        telegram: parsedDetails.telegram || '',
        domain: parsedDetails.domain || '',
        providerId: provider.providerId || '',
        owner: provider.owner || '',
        actorId: provider.providerId || '',
        providerStatus: (() => {
          const balance = provider.providerActivity?.random_balance ?? 0;
          if (balance >= 0) return '0';
          return balance.toString();
        })()
      };
      setFormData(newFormData);
      setOriginalFormData(newFormData);

      // Always keep original stake amounts as 0 for change detection
      setOriginalStakeAmount('0');
      setOriginalDisplayStakeAmount('0');
      setStakeAmount('0');
      setDisplayStakeAmount('0');
    }
  }, [provider, parsedDetails]);

  // Fetch wallet balance when needed
  useEffect(() => {
    if (mode === 'edit' && walletAddress && !walletBalance) {
      aoHelpers.getWalletBalance(walletAddress)
        .then(setWalletBalance)
        .catch(err => console.error('Error fetching wallet balance:', err));
    }
  }, [mode, walletAddress, walletBalance]);

  // Fetch GraphQL total random when component mounts (auto-trigger on expand)
  const fetchGraphQLTotalRandom = async () => {
    if (!provider?.providerId) return;

    setIsLoadingGraphQL(true);
    try {
      const total = await getProviderTotalRandom(provider.providerId);
      setTotalRandomGraphQL(total);
    } catch (err) {
      console.error('Error fetching GraphQL total random:', err);
      setTotalRandomGraphQL(null);
    } finally {
      setIsLoadingGraphQL(false);
    }
  };

  // Auto-trigger GraphQL query when provider details are shown
  useEffect(() => {
    if (provider?.providerId) {
      fetchGraphQLTotalRandom();
    }
  }, [provider?.providerId]);

  // Use actions hook for complex operations
  const actions = useProviderActions({
    provider,
    walletAddress,
    providers,
    formData,
    stakeAmount,
    walletBalance,
    mode,
    isWalletRecognized,
    rawToDisplayValue,
    displayToRawValue,
    refreshProviders,
    setProvider,
    setMode,
    setSuccess,
    setError,
    setIsSubmitting,
    setAvailableRandom,
    setIsUpdatingRandom,
    setRandomUpdateSuccess,
    setIsIncreasingStake,
    setIncreaseStakeAmount,
    setIsBelowMinimumStake,
    setShowTurnOffModal,
    setShowUnstakeModal,
    increaseStakeAmount,
    isBelowMinimumStake
  });

  const { handleSubmit, handleUnstake, updateProviderStatus, handleUpdateAvailableRandom } = actions;


  // Handle form input changes
  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log('📝 Form input changed:', { name, value });
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'providerId') {
        updated.actorId = value;
        console.log('🆔 Provider ID changed, also updating actorId:', value);
      }
      console.log('📋 Updated form data:', updated);
      return updated;
    });
    setError('');
  };

  // Handle submit
  const handleFormSubmit = async () => {
    console.log('🎯 handleFormSubmit called');
    console.log('📊 hasFormChanges:', hasFormChanges);
    console.log('📋 Current formData:', formData);
    console.log('📋 Original formData:', originalFormData);
    
    if (hasFormChanges) {
      console.log('💾 Changes detected, showing save changes modal');
      setShowSaveChangesModal(true);
    } else {
      console.log('❌ No changes detected, calling handleSubmit directly');
      await handleSubmit(onSave);
    }
  };

  // Handle confirmed submit
  const handleConfirmedSubmit = async () => {
    console.log('✅ handleConfirmedSubmit called - user confirmed changes');
    console.log('📋 Form data being submitted:', formData);
    console.log('🔄 Calling handleSubmit with onSave:', onSave);
    
    setShowSaveChangesModal(false);
    await handleSubmit(onSave);
  };


  // Show loading state
  if (providersLoading) {
    return <div className="provider-details">Loading...</div>;
  }

  // Show message for non-providers in view mode
  if (mode === 'view' && !externalCurrentProvider && !isWalletRecognized()) {
    return (
      <div className="add-provider">
        <h2>No Provider Found</h2>
        <p>This wallet is not associated with any provider.</p>
      </div>
    );
  }

  return (
    <div className="provider-details">
      <div className="provider-details-header">
        {mode === 'view' && provider && isProviderOwner() && (
          <button className="edit-btn" onClick={() => setMode('edit')}>Edit Provider</button>
        )}
        {mode === 'edit' && (
          <div className="header-actions">
            <button className="cancel-btn" onClick={() => {
              setMode('view');
              externalOnCancel?.();
            }}>Cancel</button>
          </div>
        )}
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="provider-details-content">
        <div className="provider-grid">
          <ProviderFormFields
            isEditing={mode === 'edit'}
            formData={formData}
            handleInputChange={handleFormInputChange}
            parsedDetails={parsedDetails}
            provider={provider}
            walletAddress={walletAddress}
            copiedAddress={copiedAddress}
            copyToClipboard={copyToClipboard}
            truncateAddress={truncateAddress}
            joinDate={provider?.providerInfo?.created_at ? new Date(provider.providerInfo.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : undefined}
            displayStakeAmount={displayStakeAmount}
            setDisplayStakeAmount={setDisplayStakeAmount}
            stakeAmount={stakeAmount}
            setStakeAmount={setStakeAmount}
            walletBalance={walletBalance}
            rawToDisplayValue={rawToDisplayValue}
            displayToRawValue={displayToRawValue}
            MINIMUM_STAKE_AMOUNT={MINIMUM_STAKE_AMOUNT}
            TOKEN_DECIMALS={TOKEN_DECIMALS}
            providerStatus={formData.providerStatus}
            onStatusChange={(status: string) => setFormData(prev => ({ ...prev, providerStatus: status }))}
            // ProviderStatusSection props
            availableRandom={availableRandom}
            isUpdatingRandom={isUpdatingRandom}
            randomUpdateSuccess={randomUpdateSuccess}
            onUpdateAvailableRandom={handleUpdateAvailableRandom}
            onError={setError}
          />

          {/* Show metrics for existing providers in view mode */}
          {mode === 'view' && provider && (
            <ProviderMetrics
              provider={provider}
              totalRandomGraphQL={totalRandomGraphQL}
              isLoadingGraphQL={isLoadingGraphQL}
              onRefreshGraphQL={fetchGraphQLTotalRandom}
            />
          )}
        </div>

        {/* Social Links Section */}
        {provider && (
          <SocialLinksSection
            isEditing={mode === 'edit'}
            formData={formData}
            parsedDetails={parsedDetails}
            onInputChange={handleFormInputChange}
          />
        )}

        {/* Active Requests Section */}
        {mode === 'view' && provider?.providerId && (
          <div className="detail-group">
            <RequestFlowMinimal 
              providerId={provider.providerId} 
              isMinimizable={true} 
              title="Active Requests" 
            />
          </div>
        )}


        {/* Submit Actions */}
        {mode === 'edit' && (
          <div className="provider-actions">
            {hasFormChanges && (
              <button
                className="submit-btn"
                onClick={handleFormSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : submitLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      <TurnOffProviderModal
        isOpen={showTurnOffModal}
        onConfirm={() => updateProviderStatus(-1)}
        onCancel={() => setShowTurnOffModal(false)}
      />
      
      <UnstakeProviderModal
        isOpen={showUnstakeModal}
        onConfirm={handleUnstake}
        onCancel={() => setShowUnstakeModal(false)}
      />
      
      <SaveChangesModal
        isOpen={showSaveChangesModal}
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setShowSaveChangesModal(false)}
        changes={getFormChanges()}
      />
    </div>
  )
}
