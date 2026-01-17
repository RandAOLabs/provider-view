import React, { useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { useTotalFulfilled } from '../../contexts/TotalFulfilledContext';
import './TotalFulfilledCell.css';

interface TotalFulfilledCellProps {
  providerId: string;
  autoLoad?: boolean; // Whether to auto-load on mount
}

/**
 * Smart cell component that handles loading, displaying, and refreshing
 * the totalFulfilled count for a provider
 */
export const TotalFulfilledCell: React.FC<TotalFulfilledCellProps> = ({
  providerId,
  autoLoad = false
}) => {
  const { loadProvider, refreshProvider, getStatus } = useTotalFulfilled();
  const status = getStatus(providerId);

  // Auto-load on mount if requested
  useEffect(() => {
    if (autoLoad) {
      loadProvider(providerId);
    }
  }, [providerId, autoLoad, loadProvider]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (status.status === 'loading') {
      return; // Don't allow refresh while already loading
    }

    if (status.status === 'idle') {
      loadProvider(providerId);
    } else {
      refreshProvider(providerId);
    }
  };

  const renderContent = () => {
    switch (status.status) {
      case 'loading':
      case 'idle':
        return (
          <div className="total-fulfilled-loading">
            <div className="custom-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
          </div>
        );

      case 'loaded':
        return (
          <div className="total-fulfilled-loaded">
            <span className="value">{status.value}</span>
            <FiRefreshCw className="refresh-icon" size={12} />
          </div>
        );

      case 'error':
        return (
          <div className="total-fulfilled-error" title={status.error || 'Error loading'}>
            <span className="error-text">Error</span>
            <FiRefreshCw className="refresh-icon" size={12} />
          </div>
        );

      default:
        return (
          <div className="total-fulfilled-loading">
            <div className="custom-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`total-fulfilled-cell status-${status.status}`}
      onClick={handleClick}
      title={
        status.status === 'idle' || status.status === 'loading'
          ? 'Loading...'
          : status.status === 'loaded'
          ? 'Click to refresh'
          : 'Click to retry'
      }
    >
      {renderContent()}
    </div>
  );
};
