import React, { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { ConnectWallet } from '../components/common/ConnectWallet'
import { ProviderDetails } from '../components/providers/ProviderDetails'
import { aoHelpers, MINIMUM_STAKE_AMOUNT } from '../utils/ao-helpers'
import './BecomeProvider.css'

export default function BecomeProvider() {
  const { address } = useWallet()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingProvider, setExistingProvider] = useState(null)
  const [walletBalance, setWalletBalance] = useState(null)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!address) {
        setWalletBalance(null);
        return;
      }
      try {
        // Fetch provider details
        const providers = await aoHelpers.getAllProvidersInfo();
        const provider = providers.find(p => p.provider_id === address);
        setExistingProvider(provider);

        // Fetch wallet balance
        const balance = await aoHelpers.getWalletBalance(address);
        setWalletBalance(balance);
      } catch (err) {
        console.error('Error fetching details:', err);
      }
    };

    fetchDetails();
  }, [address]);

  // Create a mock provider object using the wallet address
  const mockProvider = address ? {
    provider_id: address,
    active: 0,
    created_at: Date.now(),
    provider_details: '{}',
    stake: '{"amount":"0"}',
    random_balance: 0
  } : undefined;

  const handleStake = async (details) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await aoHelpers.stakeTokens(MINIMUM_STAKE_AMOUNT, details)
      setSuccess('Successfully staked and registered as a provider!')
      // Refetch provider details to show updated view
      const providers = await aoHelpers.getAllProvidersInfo();
      const provider = providers.find(p => p.provider_id === address);
      setExistingProvider(provider);
    } catch (err) {
      console.error('Error staking tokens:', err)
      setError('Failed to stake tokens. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="become-provider-page">
      <header className="page-header">
        <h1>{existingProvider ? 'Provider Settings' : 'Become a Provider'}</h1>
        <ConnectWallet />
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="content-container">
        {!address ? (
          <div className="connect-prompt">
            <p>Connect your wallet to become a provider and earn rewards.</p>
          </div>
        ) : existingProvider ? (
          <>
            <div className="welcome-message">
              <h2>Welcome to the Network!</h2>
              <p>You are already a provider. You can view and edit your details below.</p>
            </div>
            <ProviderDetails provider={existingProvider} />
          </>
        ) : (
          <div className="provider-form">
            <div className="wallet-info">
              <p>Minimum stake required: {parseInt(MINIMUM_STAKE_AMOUNT) / 1e18} tokens</p>
              {walletBalance !== null && (
                <p>Your wallet balance: {parseInt(walletBalance) / 1e18} tokens</p>
              )}
            </div>
            <ProviderDetails 
              provider={mockProvider}
              isEditing={true}
              onSave={handleStake}
              isSubmitting={isSubmitting}
              submitLabel="Stake and Become Provider"
            />
          </div>
        )}
      </div>
    </div>
  )
}
