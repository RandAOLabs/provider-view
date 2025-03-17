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
      if (!isReady || isConnecting) return;

      setLoading(true);
      setError(null);

      try {
        console.log('Fetching providers data...');
        const fetchedProviders = await aoHelpers.getAllProvidersInfo();
        console.log('All providers data:', fetchedProviders);

        if (mounted) {
          setProviders(fetchedProviders);
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
        if (mounted) setError('Failed to load providers. Please try again later.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

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
            <Spinner text="Loading providers..." />
          ) : error ? (
            <div className="error">{error}</div>
          ) : providers.length > 0 ? (
            <>
              {isReady && !isConnecting && (
                <StartProvider 
                  currentProvider={providers.find(p => p.provider_id === connectedAddress)}
                />
              )}
              <ProviderTable providers={providers} />
            </>
          ) : (
            <p>No providers available.</p>
          )}
        </div>
      </main>
    </div>
  )
}
