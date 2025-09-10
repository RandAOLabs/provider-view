import { useCallback } from 'react'
import { aoHelpers, MINIMUM_STAKE_AMOUNT, TOKEN_DECIMALS } from '../utils/ao-helpers'
import { providerDataUpdate } from '../utils/providerDataUpdate'

interface UseProviderActionsProps {
  provider: any;
  walletAddress: string | null;
  providers: any[];
  formData: any;
  stakeAmount: string;
  walletBalance: string | null;
  mode: 'view' | 'setup' | 'edit';
  showStakingForm: boolean;
  isWalletRecognized: () => boolean;
  rawToDisplayValue: (raw: string) => string;
  displayToRawValue: (display: string) => string;
  refreshProviders: () => Promise<void>;
  setProvider: (provider: any) => void;
  setMode: (mode: 'view' | 'setup') => void;
  setShowStakingForm: (show: boolean) => void;
  setSuccess: (message: string) => void;
  setError: (error: string | null) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setIsEditing: (editing: boolean) => void;
  setAvailableRandom: (value: number | null) => void;
  setIsUpdatingRandom: (updating: boolean) => void;
  setRandomUpdateSuccess: (success: boolean) => void;
  setIsClaimingRewards: (claiming: boolean) => void;
  setClaimSuccess: (success: boolean) => void;
  setIsIncreasingStake: (increasing: boolean) => void;
  setIncreaseStakeAmount: (amount: string) => void;
  setIsBelowMinimumStake: (below: boolean) => void;
  setShowTurnOffModal: (show: boolean) => void;
  setShowUnstakeModal: (show: boolean) => void;
  increaseStakeAmount: string;
  isBelowMinimumStake: boolean;
}

export const useProviderActions = ({
  provider,
  walletAddress,
  providers,
  formData,
  stakeAmount,
  walletBalance,
  mode,
  showStakingForm,
  isWalletRecognized,
  rawToDisplayValue,
  displayToRawValue,
  refreshProviders,
  setProvider,
  setMode,
  setShowStakingForm,
  setSuccess,
  setError,
  setIsSubmitting,
  setIsEditing,
  setAvailableRandom,
  setIsUpdatingRandom,
  setRandomUpdateSuccess,
  setIsClaimingRewards,
  setClaimSuccess,
  setIsIncreasingStake,
  setIncreaseStakeAmount,
  setIsBelowMinimumStake,
  setShowTurnOffModal,
  setShowUnstakeModal,
  increaseStakeAmount,
  isBelowMinimumStake
}: UseProviderActionsProps) => {

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // This will be handled by the parent component
    setError('');
  }, [setError]);

  const handleSubmit = useCallback(async (onSave?: (formData: any) => Promise<void>) => {
    // Validate required fields
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!(formData as any).providerId?.trim() && !walletAddress) {
      setError('Provider ID is required');
      return;
    }
    
    // Calculate current stake and needed stake
    const currentStake = provider?.providerInfo?.stake?.amount 
      ? parseFloat(provider.providerInfo.stake.amount) / Math.pow(10, TOKEN_DECIMALS)
      : 0;
    const minimumTotal = parseFloat(rawToDisplayValue(MINIMUM_STAKE_AMOUNT.toString()));
    const neededStake = Math.max(0, minimumTotal - currentStake);
    const isStakingRequired = neededStake > 0;
    
    // Validate staking amount when in setup mode for new providers or when staking is required
    if ((mode === 'setup' || showStakingForm) && isStakingRequired) {
      if (!stakeAmount || stakeAmount === '') {
        setError('Additional staking is required to reach minimum 10k total stake');
        return;
      }
      
      const stakeAmountNum = parseInt(stakeAmount, 10);
      const minNeededRaw = displayToRawValue(neededStake.toString());
      
      if (stakeAmountNum < parseInt(minNeededRaw, 10)) {
        setError(`You need at least ${neededStake.toLocaleString()} more tokens to reach the 10k minimum`);
        return;
      }
      
      if (walletBalance && stakeAmountNum > parseInt(walletBalance, 10)) {
        setError(`Staking amount exceeds your available balance of ${parseFloat(rawToDisplayValue(walletBalance)).toLocaleString()} tokens`);
        return;
      }
    }
    
    // For setup mode, handle staking
    if (mode === 'setup') {
      await handleStake(formData);
      return;
    }

    // For edit mode with external handler - but skip if we have provider ID changes that need special handling
    const hasProviderIdChange = formData.providerId && formData.providerId !== (provider?.providerId || '');
    if (onSave && !hasProviderIdChange) {
      console.log('🔄 Using external onSave handler (no provider ID changes)');
      await onSave(formData);
      return;
    }
    
    if (onSave && hasProviderIdChange) {
      console.log('⚠️ Provider ID change detected, bypassing onSave to use proper update flow');
    }
    
    // Regular edit mode - use centralized provider data update function
    try {
      console.log('🔄 handleSubmit - Starting provider update');
      console.log('📋 Form data:', formData);
      console.log('🏢 Current provider:', provider);
      console.log('💰 Stake amount:', stakeAmount);
      
      console.log('🆔 Provider ID change check:', {
        formDataProviderId: formData.providerId,
        currentProviderId: provider?.providerId,
        hasChange: hasProviderIdChange
      });
      
      const updateData = {
        // Include stake amount only if it's greater than 0
        ...(stakeAmount && stakeAmount !== '0' ? { stakeAmount } : {}),
        // Include actor ID if it has changed
        ...(hasProviderIdChange ? { providerId: formData.providerId } : {}),
        // Include all form data for details update
        name: formData.name,
        description: formData.description,
        twitter: formData.twitter,
        discord: formData.discord,
        telegram: formData.telegram,
        domain: formData.domain,
        owner: formData.owner
      };
      
      console.log('📦 Update data being sent:', updateData);
      
      console.log('🚀 Calling providerDataUpdate with:', {
        updateData,
        currentProviderId: provider?.providerId
      });
      
      const result = await providerDataUpdate(updateData, provider?.providerId, walletAddress, provider?.providerInfo?.provider_details);
      
      console.log('✅ providerDataUpdate result:', result);
      
      if (result.success) {
        // Handle provider status change as the last step
        if (formData.providerStatus !== undefined) {
          // Get current status as string
          const currentBalance = provider?.providerActivity?.random_balance ?? 0;
          const currentStatus = currentBalance >= 0 ? '0' : currentBalance.toString();
          
          if (formData.providerStatus !== currentStatus) {
            try {
              const statusValue = parseInt(formData.providerStatus);
              await aoHelpers.updateProviderAvalibleRandom(statusValue, provider?.providerId);
            } catch (statusError) {
              console.error('Error updating provider status:', statusError);
              // Don't fail the entire operation if status update fails
              setError('Provider details updated, but status change failed. Please try changing status again.');
            }
          }
        }
        
        console.log('🔄 Refreshing providers after successful update');
        await refreshProviders();
        setIsEditing(false);
        setError('');
        setSuccess(result.message);
        console.log('✅ Provider update completed successfully');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Error updating provider:', error);
      setError('Failed to update provider details');
    }
  }, [formData, stakeAmount, walletBalance, mode, showStakingForm, provider, walletAddress, rawToDisplayValue, displayToRawValue, setError, refreshProviders, setIsEditing, setSuccess]);

  const handleStake = useCallback(async (details: any) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess('');

    try {
      // Determine quantity based on mode:
      // - 0 for edit mode (no stake change)
      // - minimum 10k for registration
      const isEditingExistingProvider = isWalletRecognized();
      const quantity = isEditingExistingProvider ? '0' : stakeAmount;
      
      const updateData = {
        // Include stake amount only if it's greater than 0
        ...(quantity && quantity !== '0' ? { stakeAmount: quantity } : {}),
        // Include actor ID if provided
        ...((details as any).providerId ? { providerId: (details as any).providerId } : {}),
        // Include all details for update
        name: details.name,
        description: details.description,
        twitter: details.twitter,
        discord: details.discord,
        telegram: details.telegram,
        domain: details.domain,
        owner: details.owner
      };
      
      const result = await providerDataUpdate(updateData, provider?.providerId, walletAddress, provider?.providerInfo?.provider_details);
      
      if (result.success) {
        // Refresh the providers list to get updated data
        if (refreshProviders) {
          await refreshProviders();
        }
        
        // Find the updated/new provider and set it
        if (walletAddress) {
          const updatedProvider = providers.find(p => p.owner === walletAddress);
          if (updatedProvider) {
            setProvider(updatedProvider);
            setMode('view');
          }
        }
        
        // Hide staking form after success
        setShowStakingForm(false);
        setSuccess(result.message);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error with operation:', err);
      setError('Failed to process provider details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [stakeAmount, isWalletRecognized, provider, walletAddress, providers, refreshProviders, setIsSubmitting, setError, setSuccess, setProvider, setMode, setShowStakingForm]);

  const handleUnstake = useCallback(async () => {
    try {
      if (provider?.owner) {
        setShowUnstakeModal(false);
        await aoHelpers.unstakeTokens(provider.owner);
        window.location.reload();
      }
    } catch (err) {
      console.error('Error unstaking:', err);
      setError('Error unstaking tokens. Please try again.');
    }
  }, [provider, setError, setShowUnstakeModal]);

  const handleUpdateAvailableRandom = useCallback(async (value: number) => {
    // If turning off provider, show confirmation modal
    if (value === -1) {
      setShowTurnOffModal(true);
      return;
    }
    
    // Otherwise proceed with update
    await updateProviderStatus(value);
  }, [setShowTurnOffModal]);
  
  const updateProviderStatus = useCallback(async (value: number) => {
    setIsUpdatingRandom(true);
    setRandomUpdateSuccess(false);
    setShowTurnOffModal(false);
    
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
  }, [setIsUpdatingRandom, setRandomUpdateSuccess, setShowTurnOffModal, setAvailableRandom, setError]);

  const handleClaimRewards = useCallback(async () => {
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
  }, [setIsClaimingRewards, setClaimSuccess, setError]);
  
  const handleIncreaseStake = useCallback(async () => {
    if (!provider?.owner) {
      setError('Provider owner not found');
      return;
    }
    
    setIsIncreasingStake(true);
    setError(null);
    setSuccess('');
    
    try {
      // Convert display value (e.g., 1000) to raw value with decimals
      const rawIncreaseAmount = displayToRawValue(increaseStakeAmount);
      
      // Call stakeTokens function from ao-helpers with potential actor ID
      const actorId = (formData as any).providerId?.trim() || undefined;
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
          const updatedProvider = providers.find(p => p.owner === walletAddress);
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
  }, [provider, increaseStakeAmount, formData, displayToRawValue, walletAddress, providers, isBelowMinimumStake, setError, setSuccess, setIsIncreasingStake, refreshProviders, setIncreaseStakeAmount, setIsBelowMinimumStake]);

  return {
    handleInputChange,
    handleSubmit,
    handleStake,
    handleUnstake,
    handleUpdateAvailableRandom,
    updateProviderStatus,
    handleClaimRewards,
    handleIncreaseStake
  };
};
