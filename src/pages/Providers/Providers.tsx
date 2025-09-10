import React from 'react'
import { ProviderTable } from '../../components/providers/ProviderTable'
import { ProviderDetails } from '../../components/providers/ProviderDetails'
import { ConnectWallet } from '../../components/common/ConnectWallet'
import { Spinner } from '../../components/common/Spinner'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import './Providers.css'
import { RequestFlowMinimal } from '../../components/providers/RequestFlowMinimal'

export default function Providers() {
  const { address: connectedAddress, isConnecting, isReady } = useWallet()
  const { providers, loading, error, refreshing, refreshProviders, currentProvider } = useProviders()

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
              <ProviderTable providers={providers} />
              <div className="admin-section unresolved-requests-section">
                <h2>Unresolved Random Requests Tracker</h2>
                <p>Monitor the lifecycle of random requests as they move through the system</p>
                {/* Ultra-lightweight request flow visualizer with minimal rendering */}
                <RequestFlowMinimal />
              </div>
            </>
          ) : (
            <p>No providers available.</p>
          )}
        </div>
      </main>
    </div>
  )
}
