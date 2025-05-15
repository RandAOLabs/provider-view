import React, { useState, useEffect } from 'react'
import { ProviderTable } from '../components/providers/ProviderTable'
import { StartProvider } from '../components/providers/StartProvider'
import { ConnectWallet } from '../components/common/ConnectWallet'
import { Spinner } from '../components/common/Spinner'
import { UnresolvedRandomRequests } from '../components/providers/UnresolvedRandomRequests'
import { aoHelpers } from '../utils/ao-helpers'
import { useWallet } from '../contexts/WalletContext'
import { ProviderInfoAggregate } from 'ao-process-clients'
import './Providers.css'

export default function Providers() {
  const [providers, setProviders] = useState<ProviderInfoAggregate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { address: connectedAddress, isConnecting, isReady } = useWallet()

  // Extract fetchProviders function so it can be reused for refresh
  const fetchProviders = async (forceRefresh = false) => {
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
      
      // Get fresh provider data - bypass cache if refreshing
      let fetchedProviders;
      if (forceRefresh) {
        // Get direct access to the services for a fresh fetch
        const service = await aoHelpers.getRandAOService();
        const randclient = await aoHelpers.getRandomClient();
        
        // Fetch fresh data
        const providerInfo = await service.getAllProviderInfo();
        const providerActivity = await randclient.getAllProviderActivity();
        // Process and merge data similar to aoHelpers.getAllProvidersInfo
        fetchedProviders = providerInfo
          .map(provider => {
            const activityInfo = providerActivity.find(a => a.provider_id === provider.providerId);
            return {
              ...provider,
              providerActivity: activityInfo
            } as ProviderInfoAggregate;
          })
          // Filter out providers with 0 stake
          .filter(provider => {
            const stakeAmount = Number(provider.providerInfo?.stake?.amount || "0");
            return stakeAmount > 0;
          });
      } else {
        // Use cached data for initial load
        fetchedProviders = await aoHelpers.getAllProvidersInfo();
        // Filter out providers with 0 stake
        fetchedProviders = fetchedProviders.filter(provider => {
          const stakeAmount = Number(provider.providerInfo?.stake?.amount || "0");
          return stakeAmount > 0;
        });
      }
      
      console.log('All providers data:', fetchedProviders);
      setProviders(fetchedProviders);
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError('Failed to load providers. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
  }, [isReady, isConnecting]); // Fetch providers only when wallet is ready

  return (
    <div className="providers-page">
      <main>
        <header className="page-header">
          <h1>RandAO Providers</h1>
          <ConnectWallet />
        </header>
        <div className="content">
          {loading ? (
            <div className="providers-spinner-wrapper">
              <Spinner text="Loading providers..." />
            </div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : providers.length > 0 ? (
            <>
              {isReady && !isConnecting && (
                <StartProvider 
                  currentProvider={providers.find(p => p.providerId === connectedAddress)}
                />
              )}
              <ProviderTable providers={providers} />
              {/* TODO ADD THIS BACK WHEN ITS CLEANER. DO NOT REMOVE THIS CODE */}
              {/* <UnresolvedRandomRequests 
                providers={providers} 
                refreshProviders={refreshProviders} 
              /> */}
            </>
          ) : (
            <p>No providers available.</p>
          )}
        </div>
      </main>
    </div>
  )
}
