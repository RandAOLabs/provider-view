import React, { useState, useMemo, useRef, useEffect } from 'react'
import { FiCircle, FiChevronDown, FiChevronUp, FiCheck, FiCopy, FiLoader, FiInfo } from 'react-icons/fi'
import { aoHelpers } from '../../utils/ao-helpers'
import { GiTwoCoins } from 'react-icons/gi'
import { ProviderDetails } from './ProviderDetails'
import { ProviderActivity, ProviderInfo, ProviderInfoAggregate } from 'ao-js-sdk'
import rngLogo from '../../assets/rng-logo.svg'
import './ProviderTable.css'
import { AnimatedRandomBalance } from './AnimatedRandomBalance'
import { TotalFulfilledCell } from './TotalFulfilledCell'
import { useTotalFulfilled } from '../../contexts/TotalFulfilledContext'
import { useProviders } from '../../contexts/ProviderContext'

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

  // Progressive lazy loading for current random provided (only queries CURRENTRANDOMID)
  const { loadProviders, getCachedValue } = useTotalFulfilled()
  const hasStartedLoadingRef = useRef(false)

  // Import useProviders to get the current provider (owned by connected wallet)
  const { currentProvider } = useProviders()

  const [sortConfig, setSortConfig] = useState({
    key: 'active',
    direction: 'desc'
  })

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Status logic for provider random_balance values
  const getProviderStatus = (randomBalance: number | undefined) => {
    const balance = randomBalance || 0;
    
    if (balance > 0) {
      return {
        color: 'ready', // Green
        label: 'Ready for Requests',
        description: 'Provider software is active and ready to fulfill random requests'
      };
    } else if (balance === 0) {
      return {
        color: 'inactive', // Yellow
        label: 'Inactive',
        description: 'No issues but provider software is not up and active'
      };
    } else if (balance === -1) {
      return {
        color: 'turned-off', // Purple
        label: 'Turned Off',
        description: 'Provider owner has turned the provider off at contract level'
      };
    } else if (balance === -2) {
      return {
        color: 'slashed', // Red
        label: 'Recently Slashed',
        description: 'Provider was recently slashed due to policy violations'
      };
    } else if (balance === -3) {
      return {
        color: 'team-disabled', // Purple
        label: 'Team Disabled',
        description: 'Team has disabled this provider - contact support'
      };
    } else if (balance === -4) {
      return {
        color: 'inactive', // Yellow - treat stale as inactive
        label: 'Stale (Inactive)',
        description: 'Device has become stale and is considered inactive - can be reactivated'
      };
    } else {
      return {
        color: 'unknown', // Gray
        label: 'Unknown Status',
        description: 'Provider status is unknown'
      };
    }
  };

  // Status legend for tooltip
  const statusLegend = [
    { color: 'ready', label: 'Ready', description: '>0: Active & fulfilling requests' },
    { color: 'inactive', label: 'Inactive', description: '0: Software not running' },
    { color: 'turned-off', label: 'Turned Off', description: '-1: Owner disabled' },
    { color: 'slashed', label: 'Slashed', description: '-2: Recently penalized' },
    { color: 'team-disabled', label: 'Team Disabled', description: '-3: Contact support' },
    { color: 'inactive', label: 'Stale', description: '-4: Device stale, can reactivate' }
  ];

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
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  }

  const formatTokenAmount = (amount: string) => {
    return (Number(amount) / Math.pow(10, 9)).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  // Progressive lazy loading: start loading visible providers after page stabilizes
  useEffect(() => {
    if (hasStartedLoadingRef.current || providers.length === 0) {
      return;
    }

    // Wait 2 seconds for page to stabilize, then start loading
    const timer = setTimeout(() => {
      hasStartedLoadingRef.current = true;

      // Load all providers in batches (the hook handles batching)
      const providerIds = providers.map(p => p.providerId);
      loadProviders(providerIds);
    }, 2000);

    return () => clearTimeout(timer);
  }, [providers, loadProviders]);

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

  // Helper function to check if provider has network IP set
  const hasNetworkIp = (provider: ProviderInfoAggregate): boolean => {
    if (!provider.providerActivity?.provider_info) return false;
    
    const info = provider.providerActivity.provider_info;
    
    // If it's a string, try to parse as JSON
    if (typeof info === 'string') {
      try {
        const providerInfo = JSON.parse(info);
        return !!(providerInfo.networkIp);
      } catch (e) {
        return false;
      }
    }
    
    // If it's an object, check networkIp directly
    if (typeof info === 'object' && info !== null) {
      return !!((info as any).networkIp);
    }
    
    return false;
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

    const sorted = [...providers].sort((a, b) => {
      // ALWAYS show user's own provider first
      const aIsOwned = currentProvider && a.providerId === currentProvider.providerId;
      const bIsOwned = currentProvider && b.providerId === currentProvider.providerId;

      if (aIsOwned && !bIsOwned) return -1;
      if (!aIsOwned && bIsOwned) return 1;

      // For all other providers, apply normal sorting
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
          // Sort by cached GraphQL values (from current random process)
          const aRandomProvided = getCachedValue(a.providerId) ?? 0;
          const bRandomProvided = getCachedValue(b.providerId) ?? 0;
          comparison = aRandomProvided - bRandomProvided;
          break;
        case 'totalStaked':
          const aStake = Number(a.providerInfo?.stake?.amount || "0");
          const bStake = Number(b.providerInfo?.stake?.amount || "0");
          comparison = aStake - bStake;
          break;
        default:
          comparison = 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [providers, sortConfig, isLoading, currentProvider]);
  

  // // Debug logging for provider objects in table - COMPLETE OBJECT DUMP
  // console.log('ProviderTable - All providers array:', providers);
  // console.log('ProviderTable - Total providers count:', providers.length);
  
  // providers.forEach((provider, index) => {
  //   console.log(`\n=== PROVIDER ${index + 1} COMPLETE OBJECT ===`);
  //   console.log('Full provider object:', provider);
  //   console.log('Provider keys:', Object.keys(provider));
    
  //   // Log each top-level property individually
  //   console.log('providerId:', provider.providerId);
  //   console.log('owner:', provider.owner);
  //   console.log('totalFullfullilled:', provider.totalFullfullilled);
    
  //   // Log providerInfo structure
  //   console.log('providerInfo:', provider.providerInfo);
  //   if (provider.providerInfo) {
  //     console.log('providerInfo keys:', Object.keys(provider.providerInfo));
  //     console.log('providerInfo.stake:', provider.providerInfo.stake);
  //     console.log('providerInfo.provider_details:', provider.providerInfo.provider_details);
  //     console.log('providerInfo.created_at:', provider.providerInfo.created_at);
  //   }
    
  //   // Log providerActivity structure
  //   console.log('providerActivity:', provider.providerActivity);
  //   if (provider.providerActivity) {
  //     console.log('providerActivity keys:', Object.keys(provider.providerActivity));
  //     console.log('providerActivity.active:', provider.providerActivity.active);
  //     console.log('providerActivity.random_balance:', provider.providerActivity.random_balance);
  //     console.log('providerActivity.provider_info:', provider.providerActivity.provider_info);
  //   }
    
  //   console.log(`=== END PROVIDER ${index + 1} ===\n`);
  // });

  return (
    <div className="provider-container">
      <div className="provider-table">
        <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('status')} className="sortable">
              <div className="status-header">
                Status
                <div className="status-info-container">
                  <FiInfo className="status-info-icon" />
                  <div className="status-tooltip">
                    <div className="status-legend">
                      <h4>Status Colors</h4>
                      {statusLegend.map((status, index) => (
                        <div key={index} className="legend-item">
                          <FiCircle className={`legend-indicator status-indicator status-${status.color}`} />
                          <div className="legend-text">
                            <strong>{status.label}</strong>
                            <span>{status.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {sortConfig.key === 'status' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedProviders.map(provider => {
            const isOwnedProvider = currentProvider && provider.providerId === currentProvider.providerId;
            return (
            <React.Fragment key={provider.providerId}>
              <tr
                className={`${expandedRows.has(provider.providerId) ? 'expanded' : ''} ${isOwnedProvider ? 'owned-provider' : ''}`}
                onClick={(e) => toggleRow(provider.providerId, e)}
              >
                <td>
                  <div className="status-container">
                    {(() => {
                      const status = getProviderStatus(provider.providerActivity?.random_balance);
                      return (
                        <>
                          <FiCircle
                            className={`status-indicator status-${status.color}`}
                            title={`${status.label}: ${status.description}`}
                          />
                          <span className="status-label">{status.label}</span>
                        </>
                      );
                    })()}
                    {isOwnedProvider && (
                      <span className="owned-provider-badge">YOUR PROVIDER</span>
                    )}
                    {provider.providerActivity?.provider_info && (
                      <span className="provider-version">
                        {hasNetworkIp(provider) && (
                          <img
                            src={rngLogo}
                            alt="RNG"
                            className="rng-logo"
                            style={{ width: '16px', height: '16px', marginRight: '4px' }}
                          />
                        )}
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
                    onClick={(e) => copyToClipboard(e, provider.owner)}
                    title="Click to copy owner address"
                  >
                    <span>{truncateAddress(provider.owner)}</span>
                    {copiedAddress === provider.owner ? (
                      <FiCheck className="copy-icon success" />
                    ) : (
                      <FiCopy className="copy-icon" />
                    )}
                  </div>
                </td>
                <td>{(provider.providerInfo as ProviderInfo)?.created_at ? new Date((provider.providerInfo as ProviderInfo).created_at).toISOString().split('T')[0] : 'N/A'}</td>
                <td>
                  <AnimatedRandomBalance
                    providerId={provider.providerId}
                    initialValue={provider.providerActivity?.random_balance}
                  />
                </td>

                <td>
                  <TotalFulfilledCell
                    providerId={provider.providerId}
                    autoLoad={false}
                  />
                </td>
                <td>{formatTokenAmount((provider.providerInfo as ProviderInfo)?.stake?.amount || "0")}</td>
                <td>
                  {expandedRows.has(provider.providerId) ? 
                    <FiChevronUp className="expand-icon" /> : 
                    <FiChevronDown className="expand-icon" />
                  }
                </td>
              </tr>
              {expandedRows.has(provider.providerId) && (
                <tr className="expanded-content">
                  <td colSpan={8}>
                    <div className="expanded-details">
                      <ProviderDetails
                        currentProvider={provider}
                        mode="view"
                      />
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          )})}
        </tbody>
        </table>
      </div>
    </div>
  )
}
