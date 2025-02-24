import React, { useState, useEffect, useMemo } from 'react'
import { getProviderTotalRandom } from '../../utils/graphQLquery'
import { FiCircle, FiChevronDown, FiChevronUp, FiGlobe, FiCheck, FiCopy, FiLoader } from 'react-icons/fi'
import { aoHelpers } from '../../utils/ao-helpers'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { StakingModal } from './StakingModal'
import './ProviderTable.css'

interface Provider {
  active: string | number
  provider_id: string
  provider_details: string | { [key: string]: any }
  stake: string | { amount: string }
  created_at: number
  random_balance?: number
}

export const ProviderTable = ({ providers }: { providers: Provider[] }) => {
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [stakingProvider, setStakingProvider] = useState<Provider | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [providerRandomCounts, setProviderRandomCounts] = useState<{ [key: string]: number }>({})
  const [providerAvalibleRandomCounts, setProviderAvalibleRandomCounts] = useState<{ [key: string]: number }>({})
  const [loadingRandomCounts, setLoadingRandomCounts] = useState(true)
  const [activeRequests, setActiveRequests] = useState<{ [key: string]: any }>({})
  const [loadingRequests, setLoadingRequests] = useState<{ [key: string]: boolean }>({})
  const [sortConfig, setSortConfig] = useState({
    key: 'active',
    direction: 'desc'
  })

  useEffect(() => {
    const fetchRandomCounts = async () => {
      setLoadingRandomCounts(true)
      try {
        const counts: { [key: string]: number } = {}
        const avalibleCounts: { [key: string]: number } = {}
        for (const provider of providers) {
          const count = await getProviderTotalRandom(provider.provider_id)
          console.log(count)
          counts[provider.provider_id] = count

          const avaliblecount = await aoHelpers.getProviderAvalibleRandom(provider.provider_id)
          console.log(avaliblecount)
          avalibleCounts[provider.provider_id] = avaliblecount
        }
        setProviderRandomCounts(counts)
        setProviderAvalibleRandomCounts(avalibleCounts)
      } catch (error) {
        console.error('Error fetching random counts:', error)
      } finally {
        setLoadingRandomCounts(false)
      }
    }
    
    fetchRandomCounts()
  }, [providers])

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
    const sortedArray = [...providers]
    
    return sortedArray.sort((a, b) => {
      // First sort by active status
      if (sortConfig.key === 'active' || a.active !== b.active) {
        if (a.active === b.active) {
          // If active status is the same and it's the primary sort key,
          // sort by total stake then alphabetically by name
          const aStakeObj = typeof a.stake === 'string' ? JSON.parse(a.stake || '{"amount":"0"}') : (a.stake || {amount: "0"})
          const bStakeObj = typeof b.stake === 'string' ? JSON.parse(b.stake || '{"amount":"0"}') : (b.stake || {amount: "0"})
          const aStake = Number(aStakeObj.amount || "0")
          const bStake = Number(bStakeObj.amount || "0")
          
          if (aStake === bStake) {
            const aDetails = typeof a.provider_details === 'string' ? 
              JSON.parse(a.provider_details || '{}') : 
              (a.provider_details || {})
            const bDetails = typeof b.provider_details === 'string' ? 
              JSON.parse(b.provider_details || '{}') : 
              (b.provider_details || {})
            const aName = aDetails.name || ''
            const bName = bDetails.name || ''
            return aName.localeCompare(bName)
          }
          
          return Number(bStake) - Number(aStake)
        }
        return Number(b.active) - Number(a.active)
      }

      // For other columns
      let comparison = 0
      switch (sortConfig.key) {
        case 'joinDate':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'randomAvailable':
          comparison = Number(a.random_balance || 0) - Number(b.random_balance || 0)
          break
        case 'randomProvided':
          comparison = Number(providerRandomCounts[a.provider_id] || 0) - Number(providerRandomCounts[b.provider_id] || 0)
          break
        case 'totalStaked':
          const aStakeObj = typeof a.stake === 'string' ? JSON.parse(a.stake || '{"amount":"0"}') : (a.stake || {amount: "0"})
          const bStakeObj = typeof b.stake === 'string' ? JSON.parse(b.stake || '{"amount":"0"}') : (b.stake || {amount: "0"})
          const aStake = Number(aStakeObj.amount || "0")
          const bStake = Number(bStakeObj.amount || "0")
          comparison = Number(aStake) - Number(bStake)
          break
        case 'delegationFee':
          const aDetails = typeof a.provider_details === 'string' ? 
            JSON.parse(a.provider_details || '{}') : 
            (a.provider_details || {})
          const bDetails = typeof b.provider_details === 'string' ? 
            JSON.parse(b.provider_details || '{}') : 
            (b.provider_details || {})
          const aFee = Number(aDetails.commission || 0)
          const bFee = Number(bDetails.commission || 0)
          comparison = aFee - bFee
          break
        case 'randomValueFee':
          comparison = 0 // Currently all values are 0
          break
        default:
          comparison = 0
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [providers, sortConfig, providerRandomCounts])

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
            <React.Fragment key={provider.provider_id}>
              <tr
                className={expandedRows.has(provider.provider_id) ? 'expanded' : ''}
                onClick={(e) => toggleRow(provider.provider_id, e)}
              >
                <td>
                  <FiCircle 
                    className={`status-indicator ${providerAvalibleRandomCounts[provider.provider_id] >1 ? 'online' : 'offline'}`}
                  />
                </td>
                <td>
                  {(() => {
                    try {
                      const details = typeof provider.provider_details === 'string' ? 
                        JSON.parse(provider.provider_details || '{}') : 
                        (provider.provider_details || {});
                      return details.name || 'N/A';
                    } catch (err) {
                      return 'N/A';
                    }
                  })()}
                </td>
                <td>
                  <div 
                    className="address-cell"
                    onClick={(e) => copyToClipboard(e, provider.provider_id)}
                    title="Click to copy address"
                  >
                    <span>{truncateAddress(provider.provider_id)}</span>
                    {copiedAddress === provider.provider_id ? (
                      <FiCheck className="copy-icon success" />
                    ) : (
                      <FiCopy className="copy-icon" />
                    )}
                  </div>
                </td>
                <td>{new Date(provider.created_at).toISOString().split('T')[0]}</td>
                <td>{providerAvalibleRandomCounts[provider.provider_id] || 0}</td>
                <td>
                  {loadingRandomCounts ? (
                    <div className="loading-spinner">
                      <FiLoader className="animate-spin" size={16} />
                    </div>
                  ) : (
                    providerRandomCounts[provider.provider_id] || 0
                  )}
                </td>
                <td>{formatTokenAmount((typeof provider.stake === 'string' ? 
                  JSON.parse(provider.stake || '{"amount":"0"}') : 
                  (provider.stake || {amount: "0"})).amount || "0")}</td>
                <td>
                  <div className="delegation-fee">
                    <span>
                      {(() => {
                        try {
                          const details = typeof provider.provider_details === 'string' ? 
                            JSON.parse(provider.provider_details || '{}') : 
                            (provider.provider_details || {});
                          return details.commission !== undefined ? `${details.commission}%` : 'N/A';
                        } catch (err) {
                          return 'N/A';
                        }
                      })()}
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
                <td>0</td>
                <td>
                  {expandedRows.has(provider.provider_id) ? 
                    <FiChevronUp className="expand-icon" /> : 
                    <FiChevronDown className="expand-icon" />
                  }
                </td>
              </tr>
              {expandedRows.has(provider.provider_id) && (
                <tr className="expanded-content">
                  <td colSpan={10}>
                    <div className="expanded-details">
                      <div className="provider-grid">
                        <div className="detail-group">
                          <label>Name</label>
                          <div className="detail-value">
                            {(() => {
                              try {
                              const details = typeof provider.provider_details === 'string' ? 
                                JSON.parse(provider.provider_details || '{}') : 
                                (provider.provider_details || {});
                                return details.name || 'N/A';
                              } catch (err) {
                                return 'N/A';
                              }
                            })()}
                          </div>
                        </div>

                        {/* <div className="detail-group">
                          <label>Status</label>
                          <div className={`status-badge ${Number(provider.active) === 1 ? 'active' : 'inactive'}`}>
                            {Number(provider.active) === 1 ? 'Active' : 'Inactive'}
                          </div>
                        </div> */}

                        <div className="detail-group">
                          <label>Total Staked</label>
                          <div className="detail-value">
                            {formatTokenAmount((typeof provider.stake === 'string' ? 
                              JSON.parse(provider.stake || '{"amount":"0"}') : 
                              (provider.stake || {amount: "0"})).amount || "0")}
                          </div>
                        </div>

                        <div className="detail-group">
                          <label>Delegation Fee</label>
                          <div className="detail-value">
                            {(() => {
                              try {
                            const details = typeof provider.provider_details === 'string' ? 
                              JSON.parse(provider.provider_details || '{}') : 
                              (provider.provider_details || {});
                                return details.commission !== undefined ? `${details.commission}%` : 'N/A';
                              } catch (err) {
                                return 'N/A';
                              }
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="detail-group">
                        <label>Description</label>
                        <div className="detail-value description">
                          {(() => {
                            try {
                              const details = typeof provider.provider_details === 'string' ? 
                                JSON.parse(provider.provider_details || '{}') : 
                                (provider.provider_details || {});
                              return details.description || 'No description available';
                            } catch (err) {
                              return 'No description available';
                            }
                          })()}
                        </div>
                      </div>

                      <div className="social-group">
                        {(() => {
                          try {
                            const details = typeof provider.provider_details === 'string' ? 
                              JSON.parse(provider.provider_details || '{}') : 
                              (provider.provider_details || {});
                            return (
                              <>
                                {details.twitter && (
                                  <a href={`https://twitter.com/${details.twitter.replace('@', '')}`} 
                                     target="_blank" 
                                     rel="noopener noreferrer" 
                                     className="social-item">
                                    <FaTwitter className="social-icon twitter" />
                                    <span>{details.twitter}</span>
                                  </a>
                                )}
                                {details.discord && (
                                  <div className="social-item">
                                    <FaDiscord className="social-icon discord" />
                                    <span>{details.discord}</span>
                                  </div>
                                )}
                                {details.telegram && (
                                  <a href={`https://t.me/${details.telegram.replace('@', '')}`}
                                     target="_blank" 
                                     rel="noopener noreferrer" 
                                     className="social-item">
                                    <FaTelegram className="social-icon telegram" />
                                    <span>{details.telegram}</span>
                                  </a>
                                )}
                                {details.domain && (
                                  <a href={`https://${details.domain}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="social-item">
                                    <FiGlobe className="social-icon website" />
                                    <span>{details.domain}</span>
                                  </a>
                                )}
                              </>
                            );
                          } catch (err) {
                            return null;
                          }
                        })()}
                      </div>

                      <div className="active-requests-section">
                        <div className="active-requests-header">
                          <h3>Active Requests</h3>
                          <button
                            className={`refresh-button${loadingRequests[provider.provider_id] ? 'loading' : ''}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLoadingRequests(prev => ({ ...prev, [provider.provider_id]: true }));
                              try {
                                const response = await aoHelpers.getOpenRandomRequests(provider.provider_id);
                                setActiveRequests(prev => ({
                                  ...prev,
                                  [provider.provider_id]: {
                                    challengeRequests: response.activeChallengeRequests.request_ids,
                                    outputRequests: response.activeOutputRequests.request_ids
                                  }
                                }));
                              } catch (error) {
                                console.error('Error refreshing active requests:', error);
                              } finally {
                                setLoadingRequests(prev => ({ ...prev, [provider.provider_id]: false }));
                              }
                            }}
                            disabled={loadingRequests[provider.provider_id]}
                          >
                            {loadingRequests[provider.provider_id] ? (
                              <FiLoader className="animate-spin" size={16} />
                            ) : (
                              <svg className="refresh-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                        {activeRequests[provider.provider_id] ? (
                          <div className="requests-container">
                            <div className="request-group">
                              <h4>Challenge Requests ({activeRequests[provider.provider_id].challengeRequests.length})</h4>
                              <div className="request-list">
                                {activeRequests[provider.provider_id].challengeRequests.map((requestId: string, index: number) => (
                                  <div key={index} className="request-item">
                                    {truncateAddress(requestId)}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="request-group">
                              <h4>Output Requests ({activeRequests[provider.provider_id].outputRequests.length})</h4>
                              <div className="request-list">
                                {activeRequests[provider.provider_id].outputRequests.map((requestId: string, index: number) => (
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
