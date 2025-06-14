import React, { useState, useMemo } from 'react'
import { FiCircle, FiChevronDown, FiChevronUp, FiCheck, FiCopy, FiLoader } from 'react-icons/fi'
import { aoHelpers } from '../../utils/ao-helpers'
import { GiTwoCoins } from 'react-icons/gi'
import { StakingModal } from './StakingModal'
import { ProviderExpandedDetails } from './ProviderExpandedDetails'
import { ProviderActivity, ProviderInfo, ProviderInfoAggregate } from 'ao-js-sdk'
import './ProviderTable.css'

interface ProviderTableProps {
  providers: ProviderInfoAggregate[]
}

// Interface for extended provider details
interface ExtendedProviderDetails {
  name?: string;
  delegationFee?: string;
  description?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  domain?: string;
}

export const ProviderTable = ({ providers }: ProviderTableProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [expandedRows, setExpandedRows] = useState(new Set<string>())
  const [stakingProvider, setStakingProvider] = useState<ProviderInfoAggregate | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [isRandomFeeLoading, setIsRandomFeeLoading] = useState(false)
  const [activeRequests, setActiveRequests] = useState<{ [key: string]: any }>({})
  const [loadingRequests, setLoadingRequests] = useState<{ [key: string]: boolean }>({})
  const [sortConfig, setSortConfig] = useState({
    key: 'active',
    direction: 'desc'
  })

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyToClipboard = async (e: React.MouseEvent, address: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const toggleRow = async (id: string, e: React.MouseEvent) => {
    // Prevent toggling if clicking on elements that handle their own clicks
    if ((e.target as HTMLElement).closest('.address-cell') || 
        (e.target as HTMLElement).closest('.stake-button') || 
        (e.target as HTMLElement).closest('.social-item')) {
      return;
    }

    const newExpandedRows = new Set(expandedRows);
    
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
      // Clear active requests when collapsing
      const newActiveRequests = { ...activeRequests };
      delete newActiveRequests[id];
      setActiveRequests(newActiveRequests);
      setExpandedRows(newExpandedRows);
    } else {
      newExpandedRows.add(id);
      setExpandedRows(newExpandedRows);
      // Fetch active requests when expanding
      setLoadingRequests(prev => ({ ...prev, [id]: true }));
      try {
        console.log(`Fetching active requests for provider: ${id}`);
        const response = await aoHelpers.getOpenRandomRequests(id);
        console.log('Processing active requests response:', {
          providerId: id,
          hasResponse: !!response,
          hasChallengeRequests: !!response?.activeChallengeRequests,
          hasOutputRequests: !!response?.activeOutputRequests
        });
        
        if (!response?.activeChallengeRequests?.request_ids || !response?.activeOutputRequests?.request_ids) {
          console.error('Invalid response structure:', response);
          throw new Error('Invalid response structure from getOpenRandomRequests');
        }

        setActiveRequests(prev => ({
          ...prev,
          [id]: {
            challengeRequests: response.activeChallengeRequests.request_ids,
            outputRequests: response.activeOutputRequests.request_ids
          }
        }));
        console.log('Successfully updated active requests state');
      } catch (error) {
        console.error('Error fetching active requests:', error);
        // Clear loading state and set empty requests on error
        setActiveRequests(prev => ({
          ...prev,
          [id]: {
            challengeRequests: [],
            outputRequests: []
          }
        }));
      } finally {
        setLoadingRequests(prev => ({ ...prev, [id]: false }));
      }
    }
  }

  const formatTokenAmount = (amount: string) => {
    return (Number(amount) / Math.pow(10, 9)).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  const handleSort = (key: string) => {
    // Don't sort if clicking on Address or Name
    if (key === 'address' || key === 'name') return

    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Helper function to extract provider version
  const getProviderVersion = (provider: ProviderInfoAggregate): string => {
    if (!provider.providerActivity?.provider_info) return '';
    
    // Handle different types of provider_info
    const info = provider.providerActivity.provider_info;
    
    // If it's already a string
    if (typeof info === 'string') {
      try {
        // Try to parse as JSON
        const providerInfo = JSON.parse(info);
        return providerInfo.providerVersion ? `${providerInfo.providerVersion}` : '';
      } catch (e) {
        // If it's not valid JSON, return the string as is
        return info;
      }
    }
    
    // If it's an object, try to access providerVersion directly
    if (typeof info === 'object' && info !== null) {
      return (info as any).providerVersion ? `${(info as any).providerVersion}` : '';
    }
    
    // Default fallback
    return '';
  };

  // Helper function to compare version strings
  const compareVersions = (versionA: string, versionB: string): number => {
    // Remove 'v' prefix if present
    const cleanA = versionA.replace(/^v/, '');
    const cleanB = versionB.replace(/^v/, '');
    
    // If either string is empty, put it at the end
    if (!cleanA && !cleanB) return 0;
    if (!cleanA) return 1; // A is empty, B has value, A should come after B
    if (!cleanB) return -1; // B is empty, A has value, A should come before B
    
    // Split by dots and compare each segment
    const segmentsA = cleanA.split('.');
    const segmentsB = cleanB.split('.');
    
    // Compare each segment numerically if possible
    const maxLength = Math.max(segmentsA.length, segmentsB.length);
    for (let i = 0; i < maxLength; i++) {
      const segA = i < segmentsA.length ? parseInt(segmentsA[i], 10) : 0;
      const segB = i < segmentsB.length ? parseInt(segmentsB[i], 10) : 0;
      
      // If segments can't be parsed as numbers, fall back to string comparison
      const numA = isNaN(segA) ? 0 : segA;
      const numB = isNaN(segB) ? 0 : segB;
      
      if (numA !== numB) {
        // Return B - A instead of A - B to get higher versions first
        return numB - numA;
      }
    }
    
    return 0; // Versions are equal
  };

  const sortedProviders = useMemo(() => {
    if (isLoading || providers.length === 0) {
      return [];
    }
  
    return [...providers].sort((a, b) => {
      const aActive = a.providerActivity?.active ? 1 : 0;
      const bActive = b.providerActivity?.active ? 1 : 0;
  
      if (sortConfig.key === 'status') {
        // Sort by provider version
        const aVersion = getProviderVersion(a);
        const bVersion = getProviderVersion(b);
        // The compareVersions function now returns higher versions first,
        // so we need to invert the logic for asc/desc
        return sortConfig.direction === 'desc' 
          ? compareVersions(aVersion, bVersion) 
          : compareVersions(bVersion, aVersion);
      } else if (sortConfig.key === 'active' || aActive !== bActive) {
        if (aActive === bActive) {
          const aStake = Number(a.providerInfo?.stake?.amount || "0");
          const bStake = Number(b.providerInfo?.stake?.amount || "0");
  
          if (aStake === bStake) {
            const aName = a.providerInfo?.provider_details?.name || '';
            const bName = b.providerInfo?.provider_details?.name || '';
            return aName.localeCompare(bName);
          }
  
          return bStake - aStake;
        }
  
        return bActive - aActive;
      }
  
      let comparison = 0;
      switch (sortConfig.key) {
        case 'joinDate':
          comparison =
            new Date(a.providerInfo?.created_at || 0).getTime() -
            new Date(b.providerInfo?.created_at || 0).getTime();
          break;
        case 'randomAvailable':
          comparison =
            (a.providerActivity?.random_balance || 0) -
            (b.providerActivity?.random_balance || 0);
          break;
        case 'randomProvided':
          comparison = (a.totalFullfullilled || 0) - (b.totalFullfullilled || 0);
          break;
        case 'totalStaked':
          const aStake = Number(a.providerInfo?.stake?.amount || "0");
          const bStake = Number(b.providerInfo?.stake?.amount || "0");
          comparison = aStake - bStake;
          break;
        case 'delegationFee':
          const aFee = Number(
            (a.providerInfo?.provider_details as ExtendedProviderDetails)?.delegationFee || "0"
          );
          const bFee = Number(
            (b.providerInfo?.provider_details as ExtendedProviderDetails)?.delegationFee || "0"
          );
          comparison = aFee - bFee;
          break;
        case 'randomValueFee':
          comparison = 0; // Currently all values are 0
          break;
        default:
          comparison = 0;
      }
  
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [providers, sortConfig, isLoading]);
  

  return (
    <div className="provider-container">
      <div className="provider-table">
        <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('status')} className="sortable">
              Status {sortConfig.key === 'status' && (
                <span className="sort-indicator">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th>Name</th>
            <th>Address</th>
            <th onClick={() => handleSort('joinDate')} className="sortable">
              Join Date {sortConfig.key === 'joinDate' && (
                <span className="sort-indicator">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('randomAvailable')} className="sortable">
              Random Available {sortConfig.key === 'randomAvailable' && (
                <span className="sort-indicator">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('randomProvided')} className="sortable">
              Random Provided {sortConfig.key === 'randomProvided' && (
                <span className="sort-indicator">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('totalStaked')} className="sortable">
              Total Staked {sortConfig.key === 'totalStaked' && (
                <span className="sort-indicator">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('delegationFee')} className="sortable">
              Delegation Fee {sortConfig.key === 'delegationFee' && (
                <span className="sort-indicator">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('randomValueFee')} className="sortable">
              Random Value Fee {sortConfig.key === 'randomValueFee' && (
                <span className="sort-indicator">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedProviders.map(provider => (
            <React.Fragment key={provider.providerId}>
              <tr
                className={expandedRows.has(provider.providerId) ? 'expanded' : ''}
                onClick={(e) => toggleRow(provider.providerId, e)}
              >
                <td>
                  <div className="status-container">
                    <FiCircle 
                      className={`status-indicator ${(provider.providerActivity?.random_balance || 0) > 1 ? 'online' : 'offline'}`}
                    />
                    {provider.providerActivity?.provider_info && (
                      <span className="provider-version">
                        {(() => {
                          const info = provider.providerActivity.provider_info;
                          
                          // If it's a string, try to parse as JSON
                          if (typeof info === 'string') {
                            try {
                              const providerInfo = JSON.parse(info);
                              return providerInfo.providerVersion ? `v${providerInfo.providerVersion}` : '';
                            } catch (e) {
                              // If it's not JSON, treat it as a plain string
                              // Display it directly if it looks like a version or starts with 'v'
                              if (info.match(/^v?\d/) || info.match(/^v\d+(\.\d+)*$/)) {
                                return info.startsWith('v') ? info : `v${info}`;
                              }
                              // For other strings, just display them as is
                              return info;
                            }
                          }
                          
                          // If it's an object, try to access providerVersion directly
                          if (typeof info === 'object' && info !== null) {
                            const version = (info as any).providerVersion;
                            return version ? `v${version}` : '';
                          }
                          
                          return '';
                        })()}
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  {(provider.providerInfo as ProviderInfo).provider_details?.name || 'N/A'}
                </td>
                <td>
                  <div 
                    className="address-cell"
                    onClick={(e) => copyToClipboard(e, provider.providerId)}
                    title="Click to copy address"
                  >
                    <span>{truncateAddress(provider.providerId)}</span>
                    {copiedAddress === provider.providerId ? (
                      <FiCheck className="copy-icon success" />
                    ) : (
                      <FiCopy className="copy-icon" />
                    )}
                  </div>
                </td>
                <td>{(provider.providerInfo as ProviderInfo)?.created_at ? new Date((provider.providerInfo as ProviderInfo).created_at).toISOString().split('T')[0] : 'N/A'}</td>
                <td>
                  {isLoading ? (
                    <div className="loading-spinner">
                      <FiLoader className="animate-spin" size={16} />
                    </div>
                  ) : (
                    provider.providerActivity?.random_balance || 0
                  )}
                </td>

                <td>
                  {isLoading ? (
                    <div className="loading-spinner">
                      <FiLoader className="animate-spin" size={16} />
                    </div>
                  ) : (
                    provider.totalFullfullilled || 0
                  )}
                </td>
                <td>{formatTokenAmount((provider.providerInfo as ProviderInfo)?.stake?.amount || "0")}</td>
                <td>
                  <div className="delegation-fee">
                    <span>
                      {(provider.providerInfo?.provider_details as ExtendedProviderDetails)?.delegationFee !== undefined ? 
                        `${(provider.providerInfo?.provider_details as ExtendedProviderDetails).delegationFee}%` : 'N/A'}
                    </span>
                    <button 
                      className="stake-button" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setStakingProvider(provider)
                      }}
                    >
                      <GiTwoCoins />
                    </button>
                  </div>
                </td>
                <td>
                  {isRandomFeeLoading ? (
                    <div className="loading-spinner">
                      <FiLoader className="animate-spin" size={16} />
                    </div>
                  ) : (
                    0
                  )}
                </td>
                <td>
                  {expandedRows.has(provider.providerId) ? 
                    <FiChevronUp className="expand-icon" /> : 
                    <FiChevronDown className="expand-icon" />
                  }
                </td>
              </tr>
              {expandedRows.has(provider.providerId) && (
                <ProviderExpandedDetails
                  provider={provider}
                  copiedAddress={copiedAddress}
                  copyToClipboard={copyToClipboard}
                  formatTokenAmount={formatTokenAmount}
                  truncateAddress={truncateAddress}
                />
              )}
            </React.Fragment>
          ))}
        </tbody>
        </table>
      </div>
      {stakingProvider && (
        <StakingModal 
          provider={stakingProvider} 
          onClose={() => setStakingProvider(null)} 
        />
      )}
    </div>
  )
}
