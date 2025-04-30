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

export const UnresolvedRandomRequests = ({ providers }: UnresolvedRandomRequestsProps) => {
  const [providersWithRequests, setProvidersWithRequests] = useState<ProviderWithRequests[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [expandedLists, setExpandedLists] = useState<{ [key: string]: boolean }>({});
  const [infoDropdownVisible, setInfoDropdownVisible] = useState(false);
  
  // How many requests to show initially
  const VISIBLE_REQUESTS_COUNT = 3;

  const refreshData = () => {
    if (!isLoading) {
      setIsLoading(true);
      processProviderData();
    }
  };

  const toggleInfoDropdown = () => {
    setInfoDropdownVisible(!infoDropdownVisible);
  };
  
  useEffect(() => {
    if (providers.length > 0) {
      processProviderData();
    }
  }, [providers]);

  const processProviderData = () => {
    setIsLoading(true);
    console.log('Processing provider data for unresolved requests, providers count:', providers.length);
    
    // Extract data from the provider objects directly without making additional API calls
    const processedProviders = providers
      .filter(provider => provider.providerActivity) // Filter out providers with no activity
      .map(provider => {
        const activity = provider.providerActivity as ProviderActivity;
        
        // We expect the request_ids fields to be properly parsed arrays by now
        // But we'll handle all possible cases carefully
        
        // Get challenge requests from the activity data
        let challengeRequests: string[] = [];
        if (activity?.active_challenge_requests) {
          if (typeof activity.active_challenge_requests === 'string') {
            // If by some chance it's still a string, try to parse it
            try {
              const parsed = JSON.parse(activity.active_challenge_requests);
              challengeRequests = Array.isArray(parsed.request_ids) ? parsed.request_ids : [];
            } catch (e) {
              console.error(`Error parsing challenge requests for ${provider.providerId}:`, e);
            }
          } else if (typeof activity.active_challenge_requests === 'object') {
            // It's an object, extract the request_ids array
            const requestIds = activity.active_challenge_requests.request_ids;
            if (Array.isArray(requestIds)) {
              challengeRequests = requestIds;
            } else if (typeof requestIds === 'string') {
              // If request_ids is still a string, try to parse it
              try {
                challengeRequests = JSON.parse(requestIds);
              } catch (e) {
                console.error(`Error parsing challenge request_ids for ${provider.providerId}:`, e);
              }
            }
          }
        }
        
        // Get output requests from the activity data, same approach
        let outputRequests: string[] = [];
        if (activity?.active_output_requests) {
          if (typeof activity.active_output_requests === 'string') {
            // If by some chance it's still a string, try to parse it
            try {
              const parsed = JSON.parse(activity.active_output_requests);
              outputRequests = Array.isArray(parsed.request_ids) ? parsed.request_ids : [];
            } catch (e) {
              console.error(`Error parsing output requests for ${provider.providerId}:`, e);
            }
          } else if (typeof activity.active_output_requests === 'object') {
            // It's an object, extract the request_ids array
            const requestIds = activity.active_output_requests.request_ids;
            if (Array.isArray(requestIds)) {
              outputRequests = requestIds;
            } else if (typeof requestIds === 'string') {
              // If request_ids is still a string, try to parse it
              try {
                outputRequests = JSON.parse(requestIds);
              } catch (e) {
                console.error(`Error parsing output request_ids for ${provider.providerId}:`, e);
              }
            }
          }
        }
        
        console.log(`Provider ${provider.providerId} requests (processed by component):`, {
          challengeRequestsCount: challengeRequests.length,
          outputRequestsCount: outputRequests.length
        });
        
        return {
          provider,
          challengeRequests,
          outputRequests
        };
      })
      // Only include providers that have active requests
      .filter(item => item.challengeRequests.length > 0 || item.outputRequests.length > 0);
      
    console.log('Providers with unresolved requests:', processedProviders.length);
    
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
        <div className="section-header">
          <div className="section-title-container">
            <h2 className="section-title">Unresolved Random Requests</h2>
            <div className="info-dropdown">
              <div className="info-icon" onClick={toggleInfoDropdown}>
                <span>?</span>
              </div>
              <div className={`info-content ${infoDropdownVisible ? 'active' : ''}`}>
                <p>
                  This section displays providers with outstanding random challenges or output requests that have not been finalized yet.
                </p>
                <p>
                  It is normal to see your provider on this list occasionally, but it is not good for the same requests to linger too long or for the number of outstanding requests to grow too large (5+ outstanding would be concerning).
                </p>
                <p>
                  Providers should regularly process their pending random requests to maintain good performance and reliability.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="no-requests-message">
          No providers have unresolved random requests.
        </div>
        <div className="refresh-container">
          <button
            className={`refresh-button${isLoading ? ' loading' : ''}`}
            onClick={refreshData}
            disabled={isLoading}
            title="Refresh unresolved requests"
          >
            {isLoading ? (
              <FiLoader className="icon-spin" />
            ) : (
              <svg className="refresh-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  
  return (
    <div className="unresolved-random-section">
      <div className="section-header">
        <div className="section-title-container">
          <h2 className="section-title">Unresolved Random Requests</h2>
          <div className="info-dropdown">
            <div className="info-icon" onClick={toggleInfoDropdown}>
              <span>?</span>
            </div>
            <div className={`info-content ${infoDropdownVisible ? 'active' : ''}`}>
              <p>
                This section displays providers with outstanding random challenges or output requests that have not been finalized yet.
              </p>
              <p>
                It is normal to see your provider on this list occasionally, but it is not good for the same requests to linger too long or for the number of outstanding requests to grow too large (5+ outstanding would be concerning).
              </p>
              <p>
                Providers should regularly process their pending random requests to maintain good performance and reliability.
              </p>
            </div>
          </div>
        </div>
      </div>

      
      <div className="refresh-container">
        <button
          className={`refresh-button${isLoading ? ' loading' : ''}`}
          onClick={refreshData}
          disabled={isLoading}
          title="Refresh unresolved requests"
        >
          {isLoading ? (
            <FiLoader className="icon-spin" />
          ) : (
            <svg className="refresh-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          )}
        </button>
      </div>
      
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
    </div>
  );
};
