import React, { useState, useEffect } from 'react';
import { FiLoader } from 'react-icons/fi';
import { aoHelpers } from '../../utils/ao-helpers';
import './ActiveRequests.css';

interface ActiveRequestsProps {
  providerId: string;
}

export const ActiveRequests: React.FC<ActiveRequestsProps> = ({ providerId }) => {
  const [activeRequests, setActiveRequests] = useState<{ challengeRequests: string[], outputRequests: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (providerId) {
      fetchActiveRequests();
    }
  }, [providerId]);

  const fetchActiveRequests = async () => {
    if (!providerId) return;
    
    setIsLoading(true);
    try {
      console.log(`Fetching active requests for provider: ${providerId}`);
      const response = await aoHelpers.getOpenRandomRequests(providerId);
      console.log('Processing active requests response:', {
        providerId,
        hasResponse: !!response,
        hasChallengeRequests: !!response?.activeChallengeRequests,
        hasOutputRequests: !!response?.activeOutputRequests
      });
      
      if (!response?.activeChallengeRequests?.request_ids || !response?.activeOutputRequests?.request_ids) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response structure from getOpenRandomRequests');
      }

      setActiveRequests({
        challengeRequests: response.activeChallengeRequests.request_ids,
        outputRequests: response.activeOutputRequests.request_ids
      });
      console.log('Successfully updated active requests state');
    } catch (error) {
      console.error('Error fetching active requests:', error);
      // Set empty requests on error
      setActiveRequests({
        challengeRequests: [],
        outputRequests: []
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="active-requests-section">
      <div className="active-requests-header">
        <label>Active Requests</label>
        <button
          className={`refresh-button${isLoading ? ' loading' : ''}`}
          onClick={fetchActiveRequests}
          disabled={isLoading}
        >
          <div className="button-content">
            {isLoading ? (
              <FiLoader className="icon-spin" />
            ) : (
              <svg className="refresh-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            )}
          </div>
        </button>
      </div>
      
      {activeRequests ? (
        <div className="requests-container">
          <div className="request-group">
            <h4>Challenge Requests ({activeRequests.challengeRequests.length})</h4>
            <div className="request-list">
              {activeRequests.challengeRequests.length > 0 ? (
                activeRequests.challengeRequests.map((requestId, index) => (
                  <div key={index} className="request-item">
                    {truncateAddress(requestId)}
                  </div>
                ))
              ) : (
                <div className="no-requests">No active challenge requests</div>
              )}
            </div>
          </div>
          <div className="request-group">
            <h4>Output Requests ({activeRequests.outputRequests.length})</h4>
            <div className="request-list">
              {activeRequests.outputRequests.length > 0 ? (
                activeRequests.outputRequests.map((requestId, index) => (
                  <div key={index} className="request-item">
                    {truncateAddress(requestId)}
                  </div>
                ))
              ) : (
                <div className="no-requests">No active output requests</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="loading-container">
          <div className="spinner-container">
            <FiLoader className="icon-spin" />
          </div>
        </div>
      )}
    </div>
  );
};
