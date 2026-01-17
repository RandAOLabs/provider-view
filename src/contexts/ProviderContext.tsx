import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { aoHelpers } from '../utils/ao-helpers'
import { ProviderInfoAggregate } from 'ao-js-sdk'
import { useWallet } from './WalletContext'

/**
 * IMPORTANT: We bypass the SDK's RandAOService.getAllProviderInfo() because it has a performance issue:
 * - It calls getProviderTotalFullfilledCount() for EACH provider
 * - Each call makes an ARNS domain query to resolve "api_randao"
 * - With N providers, this makes N parallel domain queries
 * - The ARIOService cache doesn't help because the queries happen in parallel
 *
 * Instead, we manually aggregate data from the already-initialized clients.
 */

interface ProviderContextType {
  providers: ProviderInfoAggregate[]
  loading: boolean
  error: string | null
  refreshing: boolean
  refreshProviders: () => Promise<void>
  currentProvider: ProviderInfoAggregate | undefined
}

const ProviderContext = createContext<ProviderContextType | null>(null)

export const ProviderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [providers, setProviders] = useState<ProviderInfoAggregate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { address: connectedAddress, isConnecting, isReady } = useWallet()
  const isFetchingRef = React.useRef(false)
  const hasInitialFetchRef = React.useRef(false)

  const fetchProviders = useCallback(async (forceRefresh = false) => {
    if (!isReady || isConnecting) return;

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    isFetchingRef.current = true;

    // Don't show full loading state for refreshes, use refreshing state instead
    if (!forceRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      console.log('Fetching providers data...');

      // FIXED: Bypass the SDK's getAllProviderInfo() which makes N domain queries (one per provider)
      // Instead, fetch the data directly from the already-initialized clients
      const randomClient = await aoHelpers.getRandomClient();
      const providerProfileClient = await aoHelpers.getProviderProfileClient();

      // Fetch both data sources in parallel
      const [providerActivities, providerInfos] = await Promise.all([
        randomClient.getAllProviderActivity(),
        providerProfileClient.getAllProvidersInfo()
      ]);

      // Create a map for quick lookups
      const activityMap = new Map(
        providerActivities.map(activity => [activity.provider_id, activity])
      );

      const infoMap = new Map(
        providerInfos.map(info => {
          // Handle actor_id case: if actor_id exists, use it as the key
          const key = info.actor_id || info.provider_id;
          return [key, info];
        })
      );

      // Manually aggregate the data (without the problematic message count queries)
      const aggregated: ProviderInfoAggregate[] = [];

      // Process all provider IDs from both sources
      const allProviderIds = new Set([
        ...providerActivities.map(a => a.provider_id),
        ...providerInfos.map(i => i.actor_id || i.provider_id)
      ]);

      for (const providerId of allProviderIds) {
        const activity = activityMap.get(providerId);
        const info = infoMap.get(providerId);

        // Determine owner
        let owner = '';
        if (activity?.owner_id) {
          owner = activity.owner_id;
        } else if (info?.actor_id) {
          owner = info.provider_id; // When actor_id is used, provider_id is the owner
        } else if (info?.provider_id) {
          owner = info.provider_id;
        }

        aggregated.push({
          providerId,
          owner,
          providerActivity: activity,
          providerInfo: info
          // Note: We're skipping totalFullfullilled to avoid the N domain queries
          // If needed later, we can add it with proper caching
        });
      }

      // Process provider data
      const fetchedProviders = aggregated
        .filter(provider => {
          const stakeAmount = Number(provider.providerInfo?.stake?.amount || "0");
          return stakeAmount > 0;
        });

      console.log(`Fetched ${fetchedProviders.length} providers (bypassed SDK's getAllProviderInfo to avoid ${allProviderIds.size} domain queries)`);
      setProviders(fetchedProviders);
      hasInitialFetchRef.current = true;
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError('Failed to load providers. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [isReady, isConnecting]);

  // Function to handle refreshing provider data
  const refreshProviders = async () => {
    console.log('Refreshing provider data...');
    await fetchProviders(true);
  };

  useEffect(() => {
    // Only fetch once when wallet becomes ready
    if (isReady && !isConnecting && !hasInitialFetchRef.current) {
      fetchProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isConnecting]); // Remove fetchProviders from deps to prevent loop

  // Find the current provider based on the connected address (check owner field)
  const currentProvider = connectedAddress 
    ? providers.find(p => p.owner === connectedAddress) 
    : undefined;

  return (
    <ProviderContext.Provider 
      value={{
        providers,
        loading,
        error,
        refreshing,
        refreshProviders,
        currentProvider
      }}
    >
      {children}
    </ProviderContext.Provider>
  )
}

export const useProviders = () => {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error('useProviders must be used within a ProviderProvider')
  }
  return context
}
