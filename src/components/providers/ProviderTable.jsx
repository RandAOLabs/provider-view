import React, { useState, useEffect } from 'react'
import { getProviderTotalRandom } from '../../utils/graphQLquery'
import { FiCircle, FiChevronDown, FiChevronUp, FiGlobe, FiCheck, FiCopy, FiLoader } from 'react-icons/fi'
import { aoHelpers } from '../../utils/ao-helpers'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { StakingModal } from './StakingModal'
import './ProviderTable.css'

export const ProviderTable = ({ providers }) => {
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [stakingProvider, setStakingProvider] = useState(null)
  const [copiedAddress, setCopiedAddress] = useState(null)
  const [providerRandomCounts, setProviderRandomCounts] = useState({})
  const [loadingRandomCounts, setLoadingRandomCounts] = useState(true)
  const [activeRequests, setActiveRequests] = useState({})
  const [loadingRequests, setLoadingRequests] = useState({})

  useEffect(() => {
    const fetchRandomCounts = async () => {
      setLoadingRandomCounts(true)
      try {
        const counts = {}
        for (const provider of providers) {
          const count = await getProviderTotalRandom(provider.provider_id)
          counts[provider.provider_id] = count
        }
        setProviderRandomCounts(counts)
      } catch (error) {
        console.error('Error fetching random counts:', error)
      } finally {
        setLoadingRandomCounts(false)
      }
    }
    
    fetchRandomCounts()
  }, [providers])

  const truncateAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyToClipboard = async (e, address) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const toggleRow = async (id, e) => {
    // Prevent toggling if clicking on elements that handle their own clicks
    if (e.target.closest('.address-cell') || e.target.closest('.stake-button') || e.target.closest('.social-item')) {
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

  const formatTokenAmount = (amount) => {
    return (parseFloat(amount) / Math.pow(10, 18)).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    })
  }

  return (
    <div className="provider-container">
      <div className="provider-table">
        <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Name</th>
            <th>Address</th>
            <th>Join Date</th>
            <th>Random Available</th>
            <th>Random Provided</th>
            <th>Total Staked</th>
            <th>Delegation Fee</th>
            <th>Random Value Fee</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {providers.map(provider => (
            <React.Fragment key={provider.provider_id}>
              <tr
                className={expandedRows.has(provider.provider_id) ? 'expanded' : ''}
                onClick={(e) => toggleRow(provider.provider_id, e)}
              >
                <td>
                  <FiCircle 
                    className={`status-indicator ${provider.active === 1 ? 'online' : 'offline'}`}
                  />
                </td>
                <td>
                  {(() => {
                    try {
                      const details = JSON.parse(provider.provider_details || '{}');
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
                <td>{provider.random_balance || 0}</td>
                <td>
                  {loadingRandomCounts ? (
                    <div className="loading-spinner">
                      <FiLoader className="animate-spin" size={16} />
                    </div>
                  ) : (
                    providerRandomCounts[provider.provider_id] || 0
                  )}
                </td>
                <td>{formatTokenAmount(JSON.parse(provider.stake || '{"amount":0}').amount || 0)}</td>
                <td>
                  <div className="delegation-fee">
                    <span>
                      {(() => {
                        try {
                          const details = JSON.parse(provider.provider_details || '{}');
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
                  <td colSpan="10">
                    <div className="expanded-details">
                      <div className="provider-grid">
                        <div className="detail-group">
                          <label>Name</label>
                          <div className="detail-value">
                            {(() => {
                              try {
                                const details = JSON.parse(provider.provider_details || '{}');
                                return details.name || 'N/A';
                              } catch (err) {
                                return 'N/A';
                              }
                            })()}
                          </div>
                        </div>

                        <div className="detail-group">
                          <label>Status</label>
                          <div className={`status-badge ${provider.active === 1 ? 'active' : 'inactive'}`}>
                            {provider.active === 1 ? 'Active' : 'Inactive'}
                          </div>
                        </div>

                        <div className="detail-group">
                          <label>Total Staked</label>
                          <div className="detail-value">
                            {formatTokenAmount(JSON.parse(provider.stake || '{"amount":0}').amount || 0)}
                          </div>
                        </div>

                        <div className="detail-group">
                          <label>Delegation Fee</label>
                          <div className="detail-value">
                            {(() => {
                              try {
                                const details = JSON.parse(provider.provider_details || '{}');
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
                              const details = JSON.parse(provider.provider_details || '{}');
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
                            const details = JSON.parse(provider.provider_details || '{}');
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
                                {activeRequests[provider.provider_id].challengeRequests.map((requestId, index) => (
                                  <div key={index} className="request-item">
                                    {truncateAddress(requestId)}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="request-group">
                              <h4>Output Requests ({activeRequests[provider.provider_id].outputRequests.length})</h4>
                              <div className="request-list">
                                {activeRequests[provider.provider_id].outputRequests.map((requestId, index) => (
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
