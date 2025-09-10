import { aoHelpers } from './ao-helpers';

export interface ProviderUpdateData {
  // Staking data
  stakeAmount?: string; // Raw amount with decimals
  
  // Actor ID data
  providerId?: string; // The actor ID to update to
  
  // Profile details data
  name?: string;
  description?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  domain?: string;
  owner?: string;
}

/**
 * Centralized function to handle all provider data updates in the correct order:
 * 1. Handle stake changes (if stakeAmount > 0) using providerStakingClient.stake()
 * 2. Handle actor ID updates (if providerId is provided) using providerStakingClient.updateProviderActor()
 * 3. Handle other details updates using providerProfileClient.updateDetails()
 */
export async function providerDataUpdate(
  updateData: ProviderUpdateData,
  currentProviderId?: string,
  walletAddress?: string | null,
  currentProviderDetails?: any
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔧 providerDataUpdate called with:', {
      updateData,
      currentProviderId,
      walletAddress,
      currentProviderDetails
    });
    const results: string[] = [];
    
    // Step 1: Handle stake changes if stakeAmount > 0
    if (updateData.stakeAmount && parseFloat(updateData.stakeAmount) > 0) {
      console.log('💰 Processing stake change:', updateData.stakeAmount);
      
      const stakingClient = await aoHelpers.getStakingClient();
      const stakeResult = await stakingClient.stake(updateData.stakeAmount);
      
      if (!stakeResult) {
        throw new Error('Stake operation failed');
      }
      
      results.push('Stake updated successfully');
    }
    
    // Step 2: Handle actor ID updates if providerId is provided
    if (updateData.providerId && currentProviderId) {
      console.log('🆔 Processing actor ID update:', {
        newProviderId: updateData.providerId,
        currentProviderId: currentProviderId
      });
      
      const stakingClient = await aoHelpers.getStakingClient();
      console.log('🔄 Calling stakingClient.updateProviderActor with:', {
        currentProviderId,
        newProviderId: updateData.providerId
      });
      const actorResult = await stakingClient.updateProviderActor(currentProviderId, updateData.providerId);
      console.log('🆔 Actor update result:', actorResult);
      
      if (!actorResult) {
        throw new Error('Actor ID update failed');
      }
      
      results.push('Actor ID updated successfully');
    }
    
    // Step 3: Handle other details updates - only if they actually changed
    const detailsToUpdate = {
      name: updateData.name,
      description: updateData.description,
      twitter: updateData.twitter,
      discord: updateData.discord,
      telegram: updateData.telegram,
      domain: updateData.domain,
      owner: updateData.owner
    };
    
    // Check if any details actually changed from current values
    const hasDetailsToUpdate = Object.entries(detailsToUpdate).some(([key, newValue]) => {
      const currentValue = currentProviderDetails?.[key] || '';
      const hasValue = newValue !== undefined && newValue !== null && newValue !== '';
      const hasChanged = newValue !== currentValue;
      
      console.log(`📝 Detail change check for ${key}:`, {
        current: currentValue,
        new: newValue,
        hasValue,
        hasChanged
      });
      
      return hasValue && hasChanged;
    });
    
    console.log('📊 Details update summary:', {
      hasDetailsToUpdate,
      detailsToUpdate,
      currentProviderDetails
    });
    
    if (hasDetailsToUpdate) {
      console.log('📝 Processing details update:', detailsToUpdate);
      
      const profileClient = await aoHelpers.getProviderProfileClient();
      const detailsResult = await profileClient.updateDetails(detailsToUpdate);
      
      if (!detailsResult) {
        throw new Error('Details update failed');
      }
      
      results.push('Provider details updated successfully');
    }
    
    // Return success with summary of what was updated
    const message = results.length > 0 ? results.join(', ') : 'No updates were necessary';
    return {
      success: true,
      message
    };
    
  } catch (error) {
    console.error('❌ Error in providerDataUpdate:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
