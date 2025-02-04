import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ProviderDetails } from './ProviderDetails'
import { Spinner } from '../common/Spinner'
import './StartProvider.css'

export const StartProvider = ({ currentProvider }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [provider, setProvider] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true;

    const initializeProvider = async () => {
      try {
        // Wait for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 500));
        
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

  if (isLoading) {
    return <Spinner text="Checking provider status..." />
  }

  if (error) {
    return (
      <div className="add-provider">
        <h2>Connection Error</h2>
        <p className="error-message">{error}</p>
        <button className="start-btn" onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      </div>
    );
  }

  if (provider) {
    return <ProviderDetails provider={provider} onEdit={() => {}} />
  }

  return (
    <div className="add-provider">
      <h2>Become a Provider</h2>
      <p>By running a provider, you become a contributor to the ecosystem and can earn rewards.</p>
      <button className="start-btn" onClick={() => navigate('/become-provider')}>Become a Provider →</button>
    </div>
  )
}
