import React, { useState } from 'react';
import { useProviders } from '../../contexts/ProviderContext';
import { useWallet } from '../../contexts/WalletContext';
import { aoHelpers } from '../../utils/ao-helpers';
import { ProviderInfoAggregate } from 'ao-js-sdk';
import { FiPlus, FiMinus, FiShuffle, FiSend } from 'react-icons/fi';
import { ButtonSpinner } from '../common/ButtonSpinner';
import { Spinner } from '../common/Spinner';
import CompactProviderCard from './CompactProviderCard';
import './RequestRandom.css';

const RequestRandom: React.FC = () => {
  const { providers, loading } = useProviders();
  const { isConnected } = useWallet();
  const [selectedProviders, setSelectedProviders] = useState<ProviderInfoAggregate[]>([]);
  const [numRandomProviders, setNumRandomProviders] = useState<number>(3);
  const [requestLoading, setRequestLoading] = useState<boolean>(false);
  const [requestResult, setRequestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter providers to only show those with random_balance > 0
  const availableProviders = providers.filter(
    provider => (provider.providerActivity?.random_balance || 0) > 0
  );

  const toggleProviderSelection = (provider: ProviderInfoAggregate) => {
    if (selectedProviders.find(p => p.providerId === provider.providerId)) {
      setSelectedProviders(selectedProviders.filter(p => p.providerId !== provider.providerId));
    } else {
      setSelectedProviders([...selectedProviders, provider]);
    }
  };

  const selectAllProviders = () => {
    setSelectedProviders([...availableProviders]);
  };

  const clearSelectedProviders = () => {
    setSelectedProviders([]);
  };

  const selectRandomProviders = () => {
    const count = Math.min(numRandomProviders, availableProviders.length);
    const shuffled = [...availableProviders].sort(() => 0.5 - Math.random());
    setSelectedProviders(shuffled.slice(0, count));
  };

  const requestRandom = async () => {
    if (!isConnected || selectedProviders.length === 0) {
      setError('Please connect your wallet and select at least one provider');
      return;
    }

    const providerIds = selectedProviders.map(p => p.providerId);
    const callbackId = `request-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    setRequestLoading(true);
    setRequestResult(null);
    setError(null);

    try {
      const result = await aoHelpers.createRandomRequest(providerIds, providerIds.length, callbackId);
      setRequestResult(`Request sent! Callback ID: ${callbackId}`);
      console.log('Random request result:', result);
    } catch (error: any) {
      console.error('Error requesting random:', error);
      setError(`Error requesting random: ${error.message || error}`);
    } finally {
      setRequestLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="request-random-section">
      <h2>Request Random Values</h2>

      <div className="selection-stats">
        <div className="selected-count">
          <span className="count-label">Selected Providers:</span>
          <span className="count-value">{selectedProviders.length}</span>
        </div>

        <div className="selection-actions">
          <button
            className="action-button"
            onClick={selectAllProviders}
            disabled={availableProviders.length === 0}
          >
            <FiPlus /> Select All
          </button>
          <button
            className="action-button"
            onClick={clearSelectedProviders}
            disabled={selectedProviders.length === 0}
          >
            <FiMinus /> Clear
          </button>
          <div className="random-selection">
            <input
              type="number"
              min="1"
              max={availableProviders.length}
              value={numRandomProviders}
              onChange={(e) => setNumRandomProviders(Math.max(1, Math.min(availableProviders.length, parseInt(e.target.value) || 1)))}
              className="random-count-input"
            />
            <button
              className="action-button"
              onClick={selectRandomProviders}
              disabled={availableProviders.length === 0}
            >
              <FiShuffle /> Random
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <Spinner text="Loading providers..." />
        </div>
      ) : availableProviders.length === 0 ? (
        <div className="empty-state">No active providers available</div>
      ) : (
        <div className="compact-provider-grid">
          {availableProviders.map(provider => (
            <CompactProviderCard
              key={provider.providerId}
              provider={provider}
              isSelected={selectedProviders.some(p => p.providerId === provider.providerId)}
              onToggle={() => toggleProviderSelection(provider)}
            />
          ))}
        </div>
      )}

      <button
        className="request-button"
        onClick={requestRandom}
        disabled={requestLoading || selectedProviders.length === 0}
      >
        {requestLoading ? (
          <ButtonSpinner />
        ) : (
          <>
            <FiSend />
            <span>Send Request ({selectedProviders.length} providers)</span>
          </>
        )}
      </button>

      {error && <div className="request-error">{error}</div>}
      {requestResult && <div className="request-success">{requestResult}</div>}
    </div>
  );
};

export default RequestRandom;
