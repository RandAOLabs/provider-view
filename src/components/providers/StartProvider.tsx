import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ProviderDetails } from './ProviderDetails'
import { Spinner } from '../common/Spinner'
import { ProviderInfoAggregate } from 'ao-process-clients'
import './StartProvider.css'

interface StartProviderProps {
  currentProvider: ProviderInfoAggregate | undefined;
}

export const StartProvider: React.FC<StartProviderProps> = ({ currentProvider }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [provider, setProvider] = useState<ProviderInfoAggregate | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;

    const initializeProvider = async () => {
      try {
        if (!mounted) return;
        
        if (currentProvider) {
          setProvider(currentProvider);
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

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Show nothing on error
  if (error) {
    return null;
  }

  // Show provider details if they are a provider
  if (provider) {
    return <ProviderDetails provider={provider} />
  }

  // Only show become a provider if we've confirmed they are not a provider
  if (!isLoading && !error && !provider) {
    return (
      <div className="add-provider">
        <h2>Become a Provider</h2>
        <p>By running a provider, you become a contributor to the ecosystem and can earn rewards.</p>
        <button className="start-btn" onClick={() => navigate('/become-provider')}>Become a Provider →</button>
      </div>
    );
  }

  return null;
}
