import React, { useState, useEffect } from 'react';
import { FiCircle, FiCheck, FiCopy, FiLoader } from 'react-icons/fi';
import { ProviderInfoAggregate, ProviderInfo, ProviderActivity, RequestList } from 'ao-process-clients';
import './UnresolvedRandomRequests.css';

interface UnresolvedRandomRequestsProps {
  providers: ProviderInfoAggregate[];
}

interface ProviderWithRequests {
  provider: ProviderInfoAggregate;
  challengeRequests: string[];
  outputRequests: string[];
}

export const UnresolvedRandomRequests: React.FC<UnresolvedRandomRequestsProps> = ({ providers }) => {
  const [providersWithRequests, setProvidersWithRequests] = useState<ProviderWithRequests[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [expandedLists, setExpandedLists] = useState<{ [key: string]: boolean }>({});
  
  // How many requests to show initially
  const VISIBLE_REQUESTS_COUNT = 3;

  useEffect(() => {
    if (providers.length > 0) {
      processProviderData();
    }
  }, [providers]);

  const processProviderData = () => {
    setIsLoading(true);
    
    // Extract data from the provider objects directly without making additional API calls
    const processedProviders = providers
      .filter(provider => provider.providerActivity) // Filter out providers with no activity
      .map(provider => {
        const activity = provider.providerActivity as ProviderActivity;
        
        // Extract challenge and output requests
        const challengeRequests = activity?.active_challenge_requests?.request_ids || [];
        const outputRequests = activity?.active_output_requests?.request_ids || [];
        
        return {
          provider,
          challengeRequests,
          outputRequests
        };
      })
      // Only include providers that have active requests
      .filter(item => item.challengeRequests.length > 0 || item.outputRequests.length > 0);
    
    setProvidersWithRequests(processedProviders);
    setIsLoading(false);
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const toggleRequestList = (providerId: string, listType: 'challenge' | 'output') => {
    const key = `${providerId}-${listType}`;
    setExpandedLists(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (isLoading) {
    return (
      <div className="unresolved-random-section">
        <h2>Unresolved Random Requests</h2>
        <div className="loading-container">
          <FiLoader className="icon-spin" />
          <span>Loading unresolved requests...</span>
        </div>
      </div>
    );
  }

  if (providersWithRequests.length === 0) {
    return (
      <div className="unresolved-random-section">
        <h2>Unresolved Random Requests</h2>
        <div className="no-requests-message">
          No providers have unresolved random requests.
        </div>
      </div>
    );
  }

  return (
    <div className="unresolved-random-section">
      <h2>Unresolved Random Requests</h2>
      <div className="unresolved-container">
        {providersWithRequests.map((providerWithRequests) => {
          const providerId = providerWithRequests.provider.providerId;
          const challengeExpanded = expandedLists[`${providerId}-challenge`] || false;
          const outputExpanded = expandedLists[`${providerId}-output`] || false;
          
          return (
            <div key={providerId} className="provider-requests-card">
              <div className="provider-header">
                <div className="provider-status">
                  <FiCircle 
                    className={`status-indicator ${(providerWithRequests.provider.providerActivity?.random_balance || 0) > 1 ? 'online' : 'offline'}`}
                  />
                </div>
                <div className="provider-name">
                  {(providerWithRequests.provider.providerInfo as ProviderInfo)?.provider_details?.name || 'Unnamed Provider'}
                </div>
                <div 
                  className="provider-address"
                  onClick={(e) => copyToClipboard(e, providerId)}
                  title="Click to copy address"
                >
                  {truncateAddress(providerId)}
                  {copiedAddress === providerId ? (
                    <FiCheck className="copy-icon success" />
                  ) : (
                    <FiCopy className="copy-icon" />
                  )}
                </div>
              </div>
              
              <div className="request-summary">
                {providerWithRequests.challengeRequests.length > 0 && (
                  <div className="request-type">
                    <h4>Challenge Requests ({providerWithRequests.challengeRequests.length})</h4>
                    {!challengeExpanded ? (
                      <div className="request-list scrollable">
                        {providerWithRequests.challengeRequests
                          .slice(0, VISIBLE_REQUESTS_COUNT)
                          .map((requestId, index) => (
                            <div key={index} className="request-item">
                              {truncateAddress(requestId)}
                            </div>
                        ))}
                        {providerWithRequests.challengeRequests.length > VISIBLE_REQUESTS_COUNT && (
                          <div className="more-indicator">
                            + {providerWithRequests.challengeRequests.length - VISIBLE_REQUESTS_COUNT} more
                            <button 
                              className="view-all-button"
                              onClick={() => toggleRequestList(providerId, 'challenge')}
                            >
                              View all
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="request-list-full">
                        {providerWithRequests.challengeRequests.map((requestId, index) => (
                          <div key={index} className="request-item">
                            {truncateAddress(requestId)}
                          </div>
                        ))}
                        <button 
                          className="view-all-button"
                          onClick={() => toggleRequestList(providerId, 'challenge')}
                        >
                          Show less
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {providerWithRequests.outputRequests.length > 0 && (
                  <div className="request-type">
                    <h4>Output Requests ({providerWithRequests.outputRequests.length})</h4>
                    {!outputExpanded ? (
                      <div className="request-list scrollable">
                        {providerWithRequests.outputRequests
                          .slice(0, VISIBLE_REQUESTS_COUNT)
                          .map((requestId, index) => (
                            <div key={index} className="request-item">
                              {truncateAddress(requestId)}
                            </div>
                        ))}
                        {providerWithRequests.outputRequests.length > VISIBLE_REQUESTS_COUNT && (
                          <div className="more-indicator">
                            + {providerWithRequests.outputRequests.length - VISIBLE_REQUESTS_COUNT} more
                            <button 
                              className="view-all-button"
                              onClick={() => toggleRequestList(providerId, 'output')}
                            >
                              View all
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="request-list-full">
                        {providerWithRequests.outputRequests.map((requestId, index) => (
                          <div key={index} className="request-item">
                            {truncateAddress(requestId)}
                          </div>
                        ))}
                        <button 
                          className="view-all-button"
                          onClick={() => toggleRequestList(providerId, 'output')}
                        >
                          Show less
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="refresh-container">
        <button 
          className="refresh-button"
          onClick={processProviderData}
        >
          Refresh Requests
        </button>
      </div>
    </div>
  );
};
