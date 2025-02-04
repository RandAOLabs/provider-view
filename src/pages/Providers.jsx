import { useState, useEffect } from 'react'
import { ProviderTable } from '../components/providers/ProviderTable'
import { StartProvider } from '../components/providers/StartProvider'
import { ConnectWallet } from '../components/common/ConnectWallet'
import { aoHelpers } from '../utils/ao-helpers'
import { useWallet } from '../contexts/WalletContext'
import './Providers.css'

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { address: connectedAddress } = useWallet()

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        console.log('Starting to fetch providers data...');
        const providers = await aoHelpers.getAllProvidersInfo();
        console.log('All providers data:', providers);
        setProviders(providers)
      } catch (err) {
        console.error('Error fetching providers:', err)
        setError('Failed to load providers. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [])

  return (
    <div className="providers-page">
      <main>
        <header className="page-header">
          <h1>RandAO Providers</h1>
          <ConnectWallet />
        </header>
        <div className="content">
          <StartProvider 
            currentProvider={providers.find(p => p.provider_id === connectedAddress)}
          />
          {loading && <div className="loading">Loading providers...</div>}
          {error && <div className="error">{error}</div>}
          {!loading && !error && <ProviderTable providers={providers} />}
        </div>
      </main>
    </div>
  )
}
