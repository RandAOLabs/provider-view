import React, { useState } from 'react'
import { FiCircle, FiChevronDown, FiChevronUp, FiGlobe, FiCheck, FiCopy } from 'react-icons/fi'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { StakingModal } from './StakingModal'
import './ProviderTable.css'

export const ProviderTable = ({ providers }) => {
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [stakingProvider, setStakingProvider] = useState(null)
  const [copiedAddress, setCopiedAddress] = useState(null)

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

  const toggleRow = (id) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id)
    } else {
      newExpandedRows.add(id)
    }
    setExpandedRows(newExpandedRows)
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
            <th>Provided</th>
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
                onClick={() => toggleRow(provider.provider_id)}
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
                  <td colSpan="9">
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
