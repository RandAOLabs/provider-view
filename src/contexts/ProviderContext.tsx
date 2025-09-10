import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { aoHelpers } from '../utils/ao-helpers'
import { ProviderInfoAggregate } from 'ao-js-sdk'
import { useWallet } from './WalletContext'

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
  
  const fetchProviders = useCallback(async (forceRefresh = false) => {
    if (!isReady || isConnecting) return;
    
    // Don't show full loading state for refreshes, use refreshing state instead
    if (!forceRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      console.log('Fetching providers data...');
      
      // Get direct access to the service
      const service = await aoHelpers.getRandAOService();
      
      // Fetch provider info directly from the service (simplified approach)
      const providerInfo: ProviderInfoAggregate[] = await service.getAllProviderInfo();
      
      // Process provider data
      const fetchedProviders = providerInfo
        .filter(provider => {
          const stakeAmount = Number(provider.providerInfo?.stake?.amount || "0");
          return stakeAmount > 0;
        });
      
      setProviders(fetchedProviders);
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError('Failed to load providers. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isReady, isConnecting]);

  // Function to handle refreshing provider data
  const refreshProviders = async () => {
    console.log('Refreshing provider data...');
    await fetchProviders(true);
  };

  useEffect(() => {
    let mounted = true;
    
    // Initial data fetch
    fetchProviders();

    return () => {
      mounted = false;
    };
  }, [isReady, isConnecting, fetchProviders]); // Fetch providers only when wallet is ready

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
