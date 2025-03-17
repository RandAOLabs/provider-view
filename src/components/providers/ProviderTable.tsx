import React, { useState, useMemo } from 'react'
import { FiCircle, FiChevronDown, FiChevronUp, FiGlobe, FiCheck, FiCopy, FiLoader } from 'react-icons/fi'
import { aoHelpers } from '../../utils/ao-helpers'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { StakingModal } from './StakingModal'
import { ProviderActivity, ProviderInfo, ProviderInfoAggregate } from 'ao-process-clients'
import './ProviderTable.css'

interface ProviderTableProps {
  providers: ProviderInfoAggregate[]
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
    return (Number(amount) / Math.pow(10, 18)).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
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

  const sortedProviders = useMemo(() => {
    if (isLoading || providers.length === 0) {
      return [];
    }
    
    const sortedArray = [...providers]
    
    return sortedArray.sort((a, b) => {
      // Check if both providers have providerInfo
      const aActive = (a.providerActivity as ProviderActivity ).active ? 1 : 0;
      const bActive = (b.providerActivity as ProviderActivity ).active ? 1 : 0;
      
      // First sort by active status
      if (sortConfig.key === 'active' || aActive !== bActive) {
        if (aActive === bActive) {
          // If active status is the same and it's the primary sort key,
          // sort by total stake then alphabetically by name
          const aStake = Number(a.providerInfo?.stake?.amount || "0");
          const bStake = Number(b.providerInfo?.stake?.amount || "0");
          
          if (aStake === bStake) {
          const aName = (a.providerInfo as ProviderInfo ).provider_details?.name || '';
          const bName = (b.providerInfo as ProviderInfo ).provider_details?.name || '';
            return aName.localeCompare(bName);
          }
          
          return bStake - aStake;
        }
        // Active providers first
        return Number(bActive) - Number(aActive);
      }

      // For other columns
      let comparison = 0;
      switch (sortConfig.key) {
        case 'joinDate':
          comparison = new Date(a.providerInfo?.created_at || 0).getTime() - 
                      new Date(b.providerInfo?.created_at || 0).getTime();
          break;
        case 'randomAvailable':
          comparison = Number((a.providerActivity as ProviderActivity ).random_balance || 0) - 
                      Number((b.providerActivity as ProviderActivity ).random_balance || 0);
          break;
        case 'randomProvided':
          comparison = Number(a.totalFullfullilled || 0) - 
                      Number(b.totalFullfullilled || 0);
          break;
        case 'totalStaked':
          const aStake = Number(a.providerInfo?.stake?.amount || "0");
          const bStake = Number(b.providerInfo?.stake?.amount || "0");
          comparison = aStake - bStake;
          break;
        case 'delegationFee': //TODO THIS IS DEFUNCT
          const aFee = Number((a.providerActivity as any)?.commission || 0);
          const bFee = Number((b.providerInfo as any)?.commission || 0);
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
            <th onClick={() => handleSort('active')} className="sortable">
              Status {sortConfig.key === 'active' && (
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
                  <FiCircle 
                    className={`status-indicator ${((provider.providerActivity as ProviderActivity ).random_balance || 0) > 1 ? 'online' : 'offline'}`}
                  />
                </td>
                <td>
                  {(provider.providerInfo as ProviderInfo ).provider_details?.name || 'N/A'}
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
                <td>{(provider.providerInfo as ProviderInfo)?.created_at ? new Date((provider.providerInfo as ProviderInfo ).created_at).toISOString().split('T')[0] : 'N/A'}</td>
                <td>
                  {isLoading ? (
                    <div className="loading-spinner">
                      <FiLoader className="animate-spin" size={16} />
                    </div>
                  ) : (
                    (provider.providerActivity as ProviderActivity).random_balance || 0
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
                <td>{formatTokenAmount((provider.providerInfo as ProviderInfo )?.stake?.amount || "0")}</td>
                <td>
                  <div className="delegation-fee">
                    <span>
                      {(provider.providerInfo as any)?.commission !== undefined ? 
                        `${(provider.providerInfo as any).commission}%` : 'N/A'}
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
                <tr className="expanded-content">
                  <td colSpan={10}>
                    <div className="expanded-details">
                      <div className="provider-grid">
                        <div className="detail-group">
                          <label>Name</label>
                          <div className="detail-value">
                            {(provider.providerInfo as ProviderInfo).provider_details?.name || 'N/A'}
                          </div>
                        </div>
                        <div className="detail-group">
                          <label>Total Staked</label>
                          <div className="detail-value">
                            {formatTokenAmount((provider.providerInfo as ProviderInfo )?.stake?.amount || "0")}
                          </div>
                        </div>

                        <div className="detail-group">
                          <label>Delegation Fee</label>
                          <div className="detail-value">
                            {(provider.providerInfo as any)?.commission !== undefined ? 
                              `${(provider.providerInfo as any).commission}%` : 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="detail-group">
                        <label>Description</label>
                        <div className="detail-value description">
                          {(provider.providerInfo as any)?.description || 'No description available'}
                        </div>
                      </div>

                      <div className="social-group">
                        <>
                          {(provider.providerInfo as any)?.twitter && (
                            <a href={`https://twitter.com/${(provider.providerInfo as any).twitter.replace('@', '')}`} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="social-item">
                              <FaTwitter className="social-icon twitter" />
                              <span>{(provider.providerInfo as any).twitter}</span>
                            </a>
                          )}
                          {(provider.providerInfo as ProviderInfo ).provider_details?.discord && (
                            <div className="social-item">
                              <FaDiscord className="social-icon discord" />
                              <span>{(provider.providerInfo as any).discord}</span>
                            </div>
                          )}
                          {(provider.providerInfo as any)?.telegram && (
                            <a href={`https://t.me/${(provider.providerInfo as ProviderInfo ).provider_details?.telegram?.replace('@', '')}`}
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="social-item">
                              <FaTelegram className="social-icon telegram" />
                              <span>{(provider.providerInfo as any).telegram}</span>
                            </a>
                          )}
                          {(provider.providerInfo as ProviderInfo ).provider_details?.domain && (
                            <a href={`https://${(provider.providerInfo as ProviderInfo).provider_details?.domain}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="social-item">
                              <FiGlobe className="social-icon website" />
                              <span>{(provider.providerInfo as ProviderInfo).provider_details?.domain}</span>
                            </a>
                          )}
                        </>
                      </div>

                      <div className="active-requests-section">
                        <div className="active-requests-header">
                          <h3>Active Requests</h3>
                          <button
                            className={`refresh-button${loadingRequests[provider.providerId] ? 'loading' : ''}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLoadingRequests(prev => ({ ...prev, [provider.providerId]: true }));
                              try {
                                const response = await aoHelpers.getOpenRandomRequests(provider.providerId);
                                setActiveRequests(prev => ({
                                  ...prev,
                                  [provider.providerId]: {
                                    challengeRequests: response.activeChallengeRequests.request_ids,
                                    outputRequests: response.activeOutputRequests.request_ids
                                  }
                                }));
                              } catch (error) {
                                console.error('Error refreshing active requests:', error);
                              } finally {
                                setLoadingRequests(prev => ({ ...prev, [provider.providerId]: false }));
                              }
                            }}
                            disabled={loadingRequests[provider.providerId]}
                          >
                            {loadingRequests[provider.providerId] ? (
                              <FiLoader className="animate-spin" size={16} />
                            ) : (
                              <svg className="refresh-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                        {activeRequests[provider.providerId] ? (
                          <div className="requests-container">
                            <div className="request-group">
                              <h4>Challenge Requests ({activeRequests[provider.providerId].challengeRequests.length})</h4>
                              <div className="request-list">
                                {activeRequests[provider.providerId].challengeRequests.map((requestId: string, index: number) => (
                                  <div key={index} className="request-item">
                                    {truncateAddress(requestId)}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="request-group">
                              <h4>Output Requests ({activeRequests[provider.providerId].outputRequests.length})</h4>
                              <div className="request-list">
                                {activeRequests[provider.providerId].outputRequests.map((requestId: string, index: number) => (
                                  <div key={index} className="request-item">
                                    {truncateAddress(requestId)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>No active requests</div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
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
