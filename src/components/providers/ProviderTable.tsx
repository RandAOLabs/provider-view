import React, { useState, useMemo } from 'react'
import { FiCircle, FiChevronDown, FiChevronUp, FiGlobe, FiCheck, FiCopy, FiLoader } from 'react-icons/fi'
import { aoHelpers } from '../../utils/ao-helpers'
import { FaTwitter, FaDiscord, FaTelegram } from 'react-icons/fa'
import { GiTwoCoins } from 'react-icons/gi'
import { StakingModal } from './StakingModal'
import { ActiveRequests } from './ActiveRequests'
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
  
    return [...providers].sort((a, b) => {
      const aActive = a.providerActivity?.active ? 1 : 0;
      const bActive = b.providerActivity?.active ? 1 : 0;
  
      if (sortConfig.key === 'active' || aActive !== bActive) {
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
        case 'delegationFee'://TODO change
          const aFee = Number(a.providerInfo?.stake || 0);
          const bFee = Number(b.providerInfo?.stake || 0);
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
    className={`status-indicator ${(provider.providerActivity?.random_balance || 0) > 1 ? 'online' : 'offline'}`}
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
                          <label>Join Date</label>
                          <div className="detail-value">
                            {(provider.providerInfo as ProviderInfo)?.created_at ? 
                              new Date((provider.providerInfo as ProviderInfo).created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : 'N/A'}
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
                        
                        <div className="detail-group">
                          <label>Random Available</label>
                          <div className="detail-value">
                            {(provider.providerActivity as ProviderActivity)?.random_balance !== undefined ? 
                              (provider.providerActivity as ProviderActivity).random_balance : 'N/A'}
                          </div>
                        </div>
                        
                        <div className="detail-group">
                          <label>Random Provided</label>
                          <div className="detail-value">
                            {provider.totalFullfullilled !== undefined ? 
                              provider.totalFullfullilled : '0'}
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

                      <ActiveRequests providerId={provider.providerId} />
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
