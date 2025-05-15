import React from 'react'
import { useEffect, useState } from 'react'
import { ProviderDetails } from './ProviderDetails'
import { ProviderInfoAggregate } from 'ao-process-clients'
import { aoHelpers, MINIMUM_STAKE_AMOUNT, TOKEN_DECIMALS } from '../../utils/ao-helpers'
import { useWallet } from '../../contexts/WalletContext'
import './StartProvider.css'

interface StartProviderProps {
  currentProvider: ProviderInfoAggregate | undefined;
}

export const StartProvider: React.FC<StartProviderProps> = ({ currentProvider }) => {
  const { address: walletAddress } = useWallet()
  const [isLoading, setIsLoading] = useState(true)
  const [provider, setProvider] = useState<ProviderInfoAggregate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showStakingForm, setShowStakingForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [walletBalance, setWalletBalance] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;

    const initializeProvider = async () => {
      try {
        if (!mounted) return;
        
        if (currentProvider) {
          setProvider(currentProvider);
          
          // If this is a provider, also fetch wallet balance
          try {
            const balance = await aoHelpers.getWalletBalance(currentProvider.providerId);
            setWalletBalance(balance);
          } catch (err) {
            console.error('Error fetching wallet balance:', err);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Error initializing provider:', err);
          setError('Unable to connect to wallet. Please refresh the page and try again.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeProvider();

    return () => {
      mounted = false;
    };
  }, [currentProvider]);

  // Handle staking to become a provider
  const handleStake = async (details) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess('');

    try {
      await aoHelpers.stakeTokens(MINIMUM_STAKE_AMOUNT, details);
      setSuccess('Successfully staked and registered as a provider!');
      
      // Refresh provider details
      if (currentProvider?.providerId) {
        const providerData = await aoHelpers.getProviderInfo(currentProvider.providerId);
        setProvider(providerData);
      }
      
      // Hide staking form after success
      setShowStakingForm(false);
    } catch (err) {
      console.error('Error staking tokens:', err);
      setError('Failed to stake tokens. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch wallet balance if we're showing the staking form
  useEffect(() => {
    if (showStakingForm && walletAddress && !walletBalance) {
      const fetchBalance = async () => {
        try {
          console.log('Fetching wallet balance for:', walletAddress);
          const balance = await aoHelpers.getWalletBalance(walletAddress);
          console.log('Wallet balance received:', balance);
          setWalletBalance(balance);
        } catch (err) {
          console.error('Error fetching wallet balance:', err);
        }
      };
      fetchBalance();
    }
  }, [showStakingForm, walletAddress, walletBalance]);

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Show nothing on error
  if (error && !showStakingForm) {
    return null;
  }

  // Show provider details if they are a provider
  if (provider && !showStakingForm) {
    return <ProviderDetails provider={provider} walletBalance={walletBalance} />
  }

  // Show staking form if requested
  if (showStakingForm) {
    return (
      <>
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <div className="provider-form">
          <ProviderDetails 
            walletBalance={walletBalance}
            provider={{
              providerId: walletAddress || '',
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
                  provider_id: walletAddress || ''
                },
                provider_id: walletAddress || ''
              }
            } as unknown as ProviderInfoAggregate}
            isEditing={true}
            onSave={handleStake}
            isSubmitting={isSubmitting}
            submitLabel="Stake and Become Provider"
            onCancel={() => setShowStakingForm(false)}
          />
        </div>
      </>
    );
  }

  // Only show become a provider button if we've confirmed they are not a provider
  if (!isLoading && !error && !provider && !showStakingForm) {
    return (
      <div className="add-provider">
        <h2>Become a Provider</h2>
        <p>By running a provider, you become a contributor to the ecosystem and can earn rewards.</p>
        <button className="start-btn" onClick={() => setShowStakingForm(true)}>Become a Provider →</button>
      </div>
    );
  }

  return null;
}
