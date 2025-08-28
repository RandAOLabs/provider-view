import React, { useState, useEffect } from 'react';
import { FiCheck, FiCopy, FiGlobe } from 'react-icons/fi';
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa';
import { ProviderInfoAggregate, ProviderInfo, ProviderActivity } from 'ao-js-sdk';
import { RequestFlowMinimal } from './RequestFlowMinimal';
import { getProviderTotalRandom } from '../../utils/graphQLquery';
import './ProviderTable.css';

interface ProviderExpandedDetailsProps {
  provider: ProviderInfoAggregate;
  copiedAddress: string | null;
  copyToClipboard: (e: React.MouseEvent, address: string) => void;
  formatTokenAmount: (amount: string) => string;
  truncateAddress: (address: string) => string;
}

// Extend ProviderDetails type to include the fields we need
interface ExtendedProviderDetails {
  name?: string;
  delegationFee?: string;
  description?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  domain?: string;
}

export const ProviderExpandedDetails = ({
  provider,
  copiedAddress,
  copyToClipboard,
  formatTokenAmount,
  truncateAddress
}: ProviderExpandedDetailsProps) => {
  const providerInfo = provider.providerInfo as ProviderInfo;
  const providerActivity = provider.providerActivity as ProviderActivity;
  // Cast provider details to our extended interface
  const providerDetails = providerInfo?.provider_details as ExtendedProviderDetails || {};
  
  // State for total random provided across all processes
  const [totalRandomProvided, setTotalRandomProvided] = useState<number | null>(null);
  
  // Fetch total random provided when component mounts
  useEffect(() => {
    const fetchTotalRandom = async () => {
      try {
        const total = await getProviderTotalRandom(provider.providerId);
        setTotalRandomProvided(total);
      } catch (error) {
        console.error('Error fetching total random provided:', error);
      }
    };
    
    fetchTotalRandom();
  }, [provider.providerId]);

  return (
    <tr className="expanded-content">
      <td colSpan={10}>
        <div className="expanded-details">
          <div className="provider-grid">
            <div className="detail-group">
              <label>Name</label>
              <div className="detail-value">
                {providerDetails?.name || 'N/A'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Provider ID</label>
              <div 
                className="detail-value monospace clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(e, provider.providerId);
                }}
                title="Click to copy address"
              >
                {truncateAddress(provider.providerId)}
                {copiedAddress === provider.providerId ? (
                  <FiCheck className="copy-icon success" />
                ) : (
                  <FiCopy className="copy-icon" />
                )}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Owner</label>
              <div 
                className="detail-value monospace clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(e, providerActivity?.owner || 'N/A');
                }}
                title="Click to copy owner address"
              >
                {providerActivity?.owner ? 
                  truncateAddress(providerActivity.owner) : 'N/A'}
                {copiedAddress === providerActivity?.owner ? (
                  <FiCheck className="copy-icon success" />
                ) : (
                  <FiCopy className="copy-icon" />
                )}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Join Date</label>
              <div className="detail-value">
                {providerInfo?.created_at ? 
                  new Date(providerInfo.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Total Staked</label>
              <div className="detail-value">
                {formatTokenAmount(providerInfo?.stake?.amount || "0")}
              </div>
            </div>

            <div className="detail-group">
              <label>Delegation Fee</label>
              <div className="detail-value">
                {providerDetails?.delegationFee ? 
                  `${providerDetails.delegationFee}%` : 'N/A'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Random Available</label>
              <div className="detail-value">
                {providerActivity?.random_balance !== undefined ? 
                  providerActivity.random_balance : 'N/A'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Random Provided (Current Process)</label>
              <div className="detail-value">
                {provider.totalFullfullilled !== undefined ? 
                  provider.totalFullfullilled : '0'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Total Random Provided (All Time)</label>
              <div className="detail-value">
                {totalRandomProvided !== null ? 
                  totalRandomProvided : 'Loading...'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Random Value Fee</label>
              <div className="detail-value">
                0
              </div>
            </div>
          </div>

          <div className="detail-group">
            <label>Description</label>
            <div className="detail-value description">
              {providerDetails?.description || 'No description available'}
            </div>
          </div>

          <div className="social-group">
            {providerDetails?.twitter && (
              <a 
                href={`https://twitter.com/${providerDetails.twitter.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-item"
              >
                <FaTwitter className="social-icon twitter" />
                <span>{providerDetails.twitter}</span>
              </a>
            )}
            
            {providerDetails?.discord && (
              <div className="social-item">
                <FaDiscord className="social-icon discord" />
                <span>{providerDetails.discord}</span>
              </div>
            )}
            
            {providerDetails?.telegram && (
              <a 
                href={`https://t.me/${providerDetails.telegram.replace('@', '')}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-item"
              >
                <FaTelegram className="social-icon telegram" />
                <span>{providerDetails.telegram}</span>
              </a>
            )}
            
            {providerDetails?.domain && (
              <a 
                href={`https://${providerDetails.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="social-item"
              >
                <FiGlobe className="social-icon website" />
                <span>{providerDetails.domain}</span>
              </a>
            )}
          </div>

          <RequestFlowMinimal 
            providerId={provider.providerId} 
            isMinimizable={true} 
            title="Active Requests" 
          />
        </div>
      </td>
    </tr>
  );
};
