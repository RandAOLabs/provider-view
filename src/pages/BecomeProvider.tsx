import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ConnectWallet } from '../components/common/ConnectWallet';
import { ProviderDetails } from '../components/providers/ProviderDetails';
import { aoHelpers, MINIMUM_STAKE_AMOUNT } from '../utils/ao-helpers';
import './BecomeProvider.css';
import { ProviderInfoAggregate } from 'ao-process-clients';

export default function BecomeProvider() {
  const { address } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [provider, setProvider] = useState<ProviderInfoAggregate | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!address) {
        setProvider(null);
        setWalletBalance(null);
        return;
      }
      
      setIsLoading(true);
      setError('');
      
      try {
        // Fetch provider details first
        try {
          console.log('Fetching provider info for address:', address);
          const providerData: ProviderInfoAggregate = await aoHelpers.getProviderInfo(address);
          console.log('Provider data received:', JSON.stringify(providerData, null, 2));
          
          // Detailed logging for provider detection
          const isProvider = providerData && providerData.providerInfo;
          console.log('Is provider check result:', isProvider);
          if (isProvider) {
            console.log('Provider info details:', JSON.stringify(providerData.providerInfo, null, 2));
          } else {
            console.log('Not detected as a provider. providerData exists:', !!providerData, 'providerInfo exists:', !!(providerData && providerData.providerInfo));
          }
          
          setProvider(isProvider ? providerData : null);
        } catch (err) {
          console.error('Error fetching provider info:', err);
          setProvider(null);
          // Don't set error here, we'll still try to get wallet balance
        }
        
        // Then try to fetch wallet balance
        try {
          console.log(address)
          const balance: string = await aoHelpers.getWalletBalance(address);
          setWalletBalance(balance);
        } catch (err) {
          console.error('Error fetching wallet balance:', err);
          setWalletBalance(null);
          // Only set error if we couldn't get wallet balance
          setError('Failed to fetch wallet balance. Please ensure your wallet is connected properly.');
        }
      } catch (err) {
        console.error('Error in fetchDetails:', err);
        setError('Failed to fetch details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure wallet is fully connected
    const timer = setTimeout(() => {
      fetchDetails();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [address]);

  const handleStake = async (details) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await aoHelpers.stakeTokens(MINIMUM_STAKE_AMOUNT, details);
      setSuccess('Successfully staked and registered as a provider!');
      
      // Refetch provider details
      const providerData: ProviderInfoAggregate = await aoHelpers.getProviderInfo(address);
      setProvider(providerData && providerData.providerInfo ? providerData : null);
    } catch (err) {
      console.error('Error staking tokens:', err);
      setError('Failed to stake tokens. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="become-provider-page">
      <header className="page-header">
        <h1>{provider ? 'Provider Settings' : 'Become a Provider'}</h1>
        <ConnectWallet />
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {isLoading && <div className="loading-message">Loading provider details...</div>}
      
      {/* Debug information */}
      {/* <div className="debug-info" style={{ padding: '10px', margin: '10px 0', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
        <h3>Debug Information</h3>
        <p>Wallet Address: {address || 'Not connected'}</p>
        <p>Provider Detected: {provider ? 'Yes' : 'No'}</p>
        <p>Provider ID: {provider?.providerId || 'N/A'}</p>
        <p>Provider Info Exists: {provider?.providerInfo ? 'Yes' : 'No'}</p>
        <details>
          <summary>Raw Provider Data (Click to expand)</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {provider ? JSON.stringify(provider, null, 2) : 'No provider data'}
          </pre>
        </details>
      </div> */}

      <div className="content-container">
        {!address ? (
          <div className="connect-prompt">
            <p>Connect your wallet to become a provider and earn rewards.</p>
          </div>
        ) : provider ? (
          <>
            <div className="welcome-message">
              <h2>Welcome to the Network!</h2>
              <p>You are already a provider. You can view and edit your details below.</p>
            </div>
            <ProviderDetails provider={provider} />
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
              provider={{
                providerId: address,
                providerInfo: {
                  created_at: Date.now(),
                  provider_details: {
                    name: '',
                    commission: 0,
                    description: ''
                  },
                  stake: {
                    amount: '0',
                    timestamp: Date.now(),
                    status: 'active',
                    token: 'RANDAO',
                    provider_id: address
                  },
                  provider_id: address
                }
              } as unknown as ProviderInfoAggregate}
              isEditing={true}
              onSave={handleStake}
              isSubmitting={isSubmitting}
              submitLabel="Stake and Become Provider"
            />
          </div>
        )}
      </div>
    </div>
  );
}
