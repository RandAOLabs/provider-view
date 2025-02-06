import { useState, useEffect } from 'react'
import { ProviderTable } from '../components/providers/ProviderTable'
import { StartProvider } from '../components/providers/StartProvider'
import { ConnectWallet } from '../components/common/ConnectWallet'
import { Spinner } from '../components/common/Spinner'
import { aoHelpers } from '../utils/ao-helpers'
import { useWallet } from '../contexts/WalletContext'
import './Providers.css'

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { address: connectedAddress, isConnecting, isReady } = useWallet()

  useEffect(() => {
    let mounted = true;

    const fetchProviders = async () => {
      try {
        // Don't fetch until wallet is ready
        if (!isReady || isConnecting) {
          return;
        }

        console.log('Starting to fetch providers data...');
        const providers = await aoHelpers.getAllProvidersInfo();
        console.log('All providers data:', providers);
        if (mounted) {
          setProviders(providers);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
        if (mounted) {
          setError('Failed to load providers. Please try again later.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Reset loading state when wallet connection status changes
    setLoading(true);
    fetchProviders();

    return () => {
      mounted = false;
    };
  }, [isConnecting, isReady]); // Re-run when wallet status changes

  return (
    <div className="providers-page">
      <main>
        <header className="page-header">
          <h1>RandAO Providers</h1>
          <ConnectWallet />
        </header>
        <div className="content">
          {loading ? (
            <Spinner text="Loading providers..." />
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <>
              {/* Only render StartProvider after loading is complete */}
              {isReady && !isConnecting && (
                <StartProvider 
                  currentProvider={providers.find(p => p.provider_id === connectedAddress)}
                />
              )}
              <ProviderTable providers={providers} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
