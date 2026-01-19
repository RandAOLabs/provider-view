import React from 'react';
import { ProviderInfoAggregate } from 'ao-js-sdk';
import { FiCheck } from 'react-icons/fi';
import './CompactProviderCard.css';

interface CompactProviderCardProps {
  provider: ProviderInfoAggregate;
  isSelected: boolean;
  onToggle: () => void;
}

const CompactProviderCard: React.FC<CompactProviderCardProps> = ({
  provider,
  isSelected,
  onToggle,
}) => {
  const providerName = provider.providerInfo?.provider_details?.name ||
    `${provider.providerId.slice(0, 4)}...${provider.providerId.slice(-4)}`;
  const randomBalance = provider.providerActivity?.random_balance || 0;

  return (
    <div
      className={`compact-provider-card ${isSelected ? 'selected' : ''}`}
      onClick={onToggle}
    >
      <div className="compact-provider-info">
        <div className="compact-provider-name">{providerName}</div>
        <div className="compact-provider-balance">
          <span className="balance-label">Balance:</span>
          <span className="balance-value">{randomBalance}</span>
        </div>
      </div>
      {isSelected && (
        <div className="compact-selected-indicator">
          <FiCheck />
        </div>
      )}
    </div>
  );
};

export default CompactProviderCard;
