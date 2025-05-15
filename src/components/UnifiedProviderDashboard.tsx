import React, { useState, useEffect } from 'react';
import { ProviderInfoAggregate } from 'ao-process-clients';
import { connect, createDataItemSigner } from "@permaweb/aoconnect";
import { FiCheck, FiRefreshCw, FiSend, FiZap, FiPlus, FiMinus, FiShuffle, FiServer, 
  FiCpu, FiHardDrive, FiActivity, FiAlertCircle, FiClock, FiInfo, FiGrid, FiList, 
  FiTrendingUp, FiFilter, FiX, FiSearch, FiMoreHorizontal, FiArrowLeft } from 'react-icons/fi';
import '../pages/SystemInfoDashboard.css';
import '../pages/Admin.css';

// Add type declaration for arweaveWallet on window object
declare global {
  interface Window {
    arweaveWallet: any;
  }
}

// Utility function to fetch message result
async function fetchMessageResult(messageID: string, processID: string): Promise<{ Messages: any[]; Spawns: any[]; Output: any[]; Error: any }> {
  try {
    const { result } = connect({
      MU_URL: "https://ur-mu.randao.net",
      CU_URL: "https://ur-cu.randao.net",
      GATEWAY_URL: "https://arweave.net",
      MODE: "legacy"
    });

    const response = await result({
      message: messageID,
      process: processID,
    });

    return {
      Messages: response.Messages || [],
      Spawns: response.Spawns || [],
      Output: response.Output || [],
      Error: response.Error || null
    };
  } catch (error: any) {
    if (error instanceof SyntaxError && error.message.includes("Unexpected token '<'")) {
      console.error("CU timeout ratelimit error");
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    } else {
      console.error("Error fetching message result:", error);
    }

    return { Messages: [], Spawns: [], Output: [], Error: error };
  }
}

// System Info Data interface from SystemInfoDashboard
interface SystemInfoData {
  PROVIDER_VERSION?: string;
  systemSpecs?: {
    platform?: string;
    release?: string;
    hostname?: string;
    arch?: string;
    cpus?: number;
    cpuModel?: string;
    loadAvg?: number[];
    totalMem?: number;
    freeMem?: number;
    uptime?: number;
  };
  uptime?: {
    seconds: number;
    formatted: string;
  };
  stepTimings?: {
    step1?: { average: number; count: number };
    step2?: { average: number; count: number };
    step3?: { average: number; count: number };
    step4?: { average: number; count: number };
    overall?: { average: number; count: number };
  };
  errors?: {
    count: number;
    recentErrors: string[];
  };
  providerInfo?: {
    onchainValue: number;
    providerValue: number;
    difference: number;
  };
  updateType?: string;
  lastUpdate?: string;
}

interface ProviderWithSystemInfo extends ProviderInfoAggregate {
  parsedSystemInfo?: SystemInfoData;
  providerVersion?: string;
}

interface UnifiedProviderDashboardProps {
  providers: ProviderInfoAggregate[];
  isConnected: boolean;
  isLoading: boolean;
  reinitializingProviders: { [key: string]: boolean };
  reinitSuccessProviders: { [key: string]: boolean };
  reinitAllLoading: boolean;
  onReinitializeAll: () => void;
  onReinitializeProvider: (providerId: string) => void;
}

export const UnifiedProviderDashboard: React.FC<UnifiedProviderDashboardProps> = ({
  providers,
  isConnected,
  isLoading,
  reinitializingProviders,
  reinitSuccessProviders,
  reinitAllLoading,
  onReinitializeAll,
  onReinitializeProvider,
}) => {
  // State for provider management
  const [selectedProviders, setSelectedProviders] = useState<ProviderInfoAggregate[]>([]);
  const [numRandomProviders, setNumRandomProviders] = useState<number>(3);
  const [requestMethod, setRequestMethod] = useState<'direct' | 'client'>('direct');
  const [requestLoading, setRequestLoading] = useState<boolean>(false);
  const [requestResult, setRequestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State for system info dashboard
  const [providersWithSystemInfo, setProvidersWithSystemInfo] = useState<ProviderWithSystemInfo[]>([]);
  const [selectedDetailProvider, setSelectedDetailProvider] = useState<ProviderWithSystemInfo | null>(null);
  const [sortBy, setSortBy] = useState<string>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'details'>('grid');
  const [showOnlyWithInfo, setShowOnlyWithInfo] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'hardware' | 'errors'>('overview');
  
  // Parse system info
  useEffect(() => {
    const parsedProviders = providers.map(provider => {
      let parsedSystemInfo: SystemInfoData | undefined = undefined;
      let providerVersion: string | undefined = undefined;

      try {
        // First check the new provider_info field in providerActivity
        if (provider.providerActivity?.provider_info) {
          try {
            const rawInfo = provider.providerActivity.provider_info;
            // If it's already a string, parse it safely
            if (typeof rawInfo === 'string') {
              try {
                // Try to parse as JSON
                parsedSystemInfo = JSON.parse(rawInfo);
              } catch (parseError) {
                // If it fails, just use it as a string property
                console.log('Unable to parse provider_info as JSON, using as simple string', parseError);
                parsedSystemInfo = { rawProviderInfo: rawInfo } as any;
              }
            } 
            // If it's already an object (pre-parsed), use it directly
            else if (typeof rawInfo === 'object') {
              parsedSystemInfo = rawInfo as any;
            }
          } catch (e) {
            console.log('Failed to parse provider_info as JSON', e);
          }
        }
        
        // Fallback to legacy extra_data field if provider_info parsing failed
        if (!parsedSystemInfo) {
          const providerActivity = provider.providerActivity as any;
          const rawData = providerActivity?.extra_data || '';
          
          if (rawData) {
            try {
              parsedSystemInfo = JSON.parse(rawData);
            } catch (e) {
              console.log('Failed to parse extra_data as JSON', e);
            }
          }
        }

        // If we found system info, check for version in it
        if (parsedSystemInfo && typeof parsedSystemInfo === 'object') {
          // First try getting the version from top-level PROVIDER_VERSION
          providerVersion = (parsedSystemInfo as any).PROVIDER_VERSION || undefined;
          
          // If not found there, check in providerInfo object
          if (!providerVersion && parsedSystemInfo.providerInfo) {
            const providerInfoObj = parsedSystemInfo.providerInfo as any;
            providerVersion = providerInfoObj?.version || undefined;
          }
        }
      } catch (error) {
        console.error('Error parsing provider system info:', error);
      }

      return {
        ...provider,
        parsedSystemInfo,
        providerVersion,
      };
    });

    setProvidersWithSystemInfo(parsedProviders);
    
    // If there are providers with system info, select the first one if none selected
    const providersWithInfo = parsedProviders.filter(p => p.parsedSystemInfo);
    if (providersWithInfo.length > 0 && !selectedDetailProvider) {
      setSelectedDetailProvider(providersWithInfo[0]);
    }
  }, [providers, selectedDetailProvider]);

  // Filter providers by search term and system info
  const filteredProviders = providersWithSystemInfo.filter(provider => {
    const searchableText = `${provider.providerId} ${provider.providerInfo?.provider_details?.name || ''}`;
    const matchesSearch = searchableText.toLowerCase().includes(searchTerm.toLowerCase());
    const hasSystemInfo = showOnlyWithInfo ? !!provider.parsedSystemInfo : true;
    return matchesSearch && hasSystemInfo;
  });

  // Provider selection logic
  const toggleProviderSelection = (provider: ProviderWithSystemInfo) => {
    if (selectedProviders.find(p => p.providerId === provider.providerId)) {
      setSelectedProviders(selectedProviders.filter(p => p.providerId !== provider.providerId));
    } else {
      setSelectedProviders([...selectedProviders, provider]);
    }
  };

  const selectAllProviders = () => {
    setSelectedProviders([...filteredProviders]);
  };

  const clearSelectedProviders = () => {
    setSelectedProviders([]);
  };

  const selectRandomProviders = () => {
    // Ensure we don't try to select more providers than available
    const count = Math.min(numRandomProviders, filteredProviders.length);
    
    // Shuffle the providers array and take the first 'count' items
    const shuffled = [...filteredProviders].sort(() => 0.5 - Math.random());
    setSelectedProviders(shuffled.slice(0, count));
  };

  // View provider details
  const viewProviderDetails = (provider: ProviderWithSystemInfo) => {
    setSelectedDetailProvider(provider);
    setViewMode('details');
  };

  // Helper function to sort providers
  const sortProviders = (providers: ProviderWithSystemInfo[], sortKey: string, direction: 'asc' | 'desc') => {
    return [...providers].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortKey) {
        case 'status':
          valueA = a.providerActivity?.random_balance !== undefined ? a.providerActivity.random_balance : -999;
          valueB = b.providerActivity?.random_balance !== undefined ? b.providerActivity.random_balance : -999;
          break;
        case 'name':
          valueA = a.providerInfo?.provider_details?.name || '';
          valueB = b.providerInfo?.provider_details?.name || '';
          break;
        case 'uptime':
          valueA = a.parsedSystemInfo?.uptime?.seconds || a.parsedSystemInfo?.systemSpecs?.uptime || 0;
          valueB = b.parsedSystemInfo?.uptime?.seconds || b.parsedSystemInfo?.systemSpecs?.uptime || 0;
          break;
        case 'errors':
          valueA = a.parsedSystemInfo?.errors?.count || 0;
          valueB = b.parsedSystemInfo?.errors?.count || 0;
          break;
        case 'processing':
          valueA = a.parsedSystemInfo?.stepTimings?.overall?.average || 0;
          valueB = b.parsedSystemInfo?.stepTimings?.overall?.average || 0;
          break;
        case 'memory':
          valueA = a.parsedSystemInfo?.systemSpecs?.freeMem ? 
                 (a.parsedSystemInfo.systemSpecs.totalMem! - a.parsedSystemInfo.systemSpecs.freeMem!) / a.parsedSystemInfo.systemSpecs.totalMem! : 
                 0;
          valueB = b.parsedSystemInfo?.systemSpecs?.freeMem ? 
                 (b.parsedSystemInfo.systemSpecs.totalMem! - b.parsedSystemInfo.systemSpecs.freeMem!) / b.parsedSystemInfo.systemSpecs.totalMem! : 
                 0;
          break;
        default:
          return 0;
      }

      // Handle string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }

      // Handle numeric comparison
      if (direction === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  };
  
  // Apply sorting
  const sortedProviders = sortProviders(filteredProviders, sortBy, sortDirection);

  // Toggle sort direction when the same column is clicked
  const handleSortChange = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  // Format utilities
  const formatMemory = (bytes?: number): string => {
    if (bytes === undefined) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatTime = (ms?: number): string => {
    if (ms === undefined) return 'N/A';
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)} sec`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} min`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  // Get cluster-wide statistics
  const getClusterStats = () => {
    // Only count providers with system info
    const providersWithInfo = providersWithSystemInfo.filter(p => p.parsedSystemInfo);
    if (providersWithInfo.length === 0) return null;
    
    const totalProviders = providersWithInfo.length;
    const onlineProviders = providersWithInfo.filter(p => p.providerActivity?.random_balance !== undefined && p.providerActivity.random_balance >= 0).length;
    const totalErrors = providersWithInfo.reduce((sum, p) => sum + (p.parsedSystemInfo?.errors?.count || 0), 0);
    const avgProcessingTime = providersWithInfo.reduce((sum, p) => {
      const time = p.parsedSystemInfo?.stepTimings?.overall?.average || 0;
      return sum + time;
    }, 0) / totalProviders;
    
    // Calculate average memory usage 
    const avgMemoryUsage = providersWithInfo.reduce((sum, p) => {
      if (!p.parsedSystemInfo?.systemSpecs?.totalMem || !p.parsedSystemInfo?.systemSpecs?.freeMem) return sum;
      const usage = (p.parsedSystemInfo.systemSpecs.totalMem - p.parsedSystemInfo.systemSpecs.freeMem) / p.parsedSystemInfo.systemSpecs.totalMem;
      return sum + usage;
    }, 0) / totalProviders;
    
    return {
      totalProviders,
      onlineProviders,
      totalErrors,
      avgProcessingTime,
      avgMemoryUsage,
      availability: (onlineProviders / totalProviders) * 100
    };
  };
  
  const clusterStats = getClusterStats();
  
  // Get status color for health indicators
  const getStatusColor = (value: number, thresholds: {warning: number, critical: number}, inverse = false) => {
    if (!inverse) {
      if (value >= thresholds.critical) return 'critical';
      if (value >= thresholds.warning) return 'warning';
      return 'healthy';
    } else {
      if (value <= thresholds.critical) return 'critical';
      if (value <= thresholds.warning) return 'warning';
      return 'healthy';
    }
  };
  
  // Request random from selected providers
  const requestRandomDirect = async () => {
    if (!isConnected || selectedProviders.length === 0) {
      setError('Please connect your wallet and select at least one provider');
      return;
    }

    const providerIds = selectedProviders.map(p => p.providerId);
    const callbackId = `request-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    setRequestLoading(true);
    setRequestResult(null);
    setError(null);

    try {
      const TOKEN_PROCESS = "rPpsRk9Rm8_SJ1JF8m9_zjTalkv9Soaa_5U0tYUloeY";
      const RAND_PROCESS = "8N08BvmC34q9Hxj-YS6eAOd_cSmYqGpezPPHUYWJBhg";

      // Use the connect function with proper RandAO URLs
      const { message: configuredMessage } = connect({
        MU_URL: "https://ur-mu.randao.net",
        CU_URL: "https://ur-cu.randao.net",
        GATEWAY_URL: "https://arweave.net",
        MODE: "legacy"
      });

      const sentMessage = await configuredMessage({
        process: TOKEN_PROCESS,
        tags: [
          { name: "Action", value: "Transfer" },
          { name: "Quantity", value: "100" },
          { name: "Recipient", value: RAND_PROCESS },
          { name: "X-CallbackId", value: callbackId },
          { name: "X-Providers", value: JSON.stringify({ provider_ids: providerIds }) },
          { name: "X-RequestedInputs", value: JSON.stringify({ requested_inputs: providerIds.length }) },
        ],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      const result = await fetchMessageResult(sentMessage, TOKEN_PROCESS);
      setRequestResult(`Request sent! Message ID: ${sentMessage}`);
      console.log('Request result:', result);
    } catch (error: any) {
      console.error('Error requesting random:', error);
      setError(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setRequestLoading(false);
    }
  };

  // In case a provider needs to be reinitialized, this function will handle it
  const handleReinitializeProvider = (providerId: string) => {
    onReinitializeProvider(providerId);
  };

  return (
    <div className="system-info-dashboard">
      {/* Dashboard Header and Controls */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Provider Cluster Management</h1>
          <div className="dashboard-actions">
            <button 
              className={`action-btn ${showOnlyWithInfo ? 'active' : ''}`}
              onClick={() => setShowOnlyWithInfo(!showOnlyWithInfo)}
              title={showOnlyWithInfo ? "Show all providers" : "Show only providers with system info"}
            >
              <FiInfo />
              {showOnlyWithInfo ? "All Providers" : "With Info Only"}
            </button>
            <button 
              className="action-btn reinit-all-btn"
              onClick={onReinitializeAll}
              disabled={reinitAllLoading || !isConnected}
              title="Reinitialize all offline providers"
            >
              {reinitAllLoading ? (
                <>
                  <span className="spinner"></span> Reinitializing...
                </>
              ) : (
                <>
                  <FiRefreshCw /> Reinitialize All
                </>
              )}
            </button>
            <div className="search-container">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Statistics Overview Section */}
      {clusterStats && (
        <div className="cluster-overview">
          <div className="overview-card">
            <div className="overview-icon"><FiServer /></div>
            <div className="overview-content">
              <h3>Providers</h3>
              <div className="overview-value">{clusterStats.onlineProviders}/{clusterStats.totalProviders}</div>
              <div className={`overview-status ${getStatusColor(clusterStats.availability, {warning: 70, critical: 50})}`}>
                {clusterStats.availability.toFixed(1)}% Available
              </div>
            </div>
          </div>
          
          <div className="overview-card">
            <div className="overview-icon"><FiClock /></div>
            <div className="overview-content">
              <h3>Processing Time</h3>
              <div className="overview-value">{formatTime(clusterStats.avgProcessingTime)}</div>
              <div className={`overview-status ${getStatusColor(clusterStats.avgProcessingTime, {warning: 5000, critical: 10000})}`}>
                Average
              </div>
            </div>
          </div>
          
          <div className="overview-card">
            <div className="overview-icon"><FiHardDrive /></div>
            <div className="overview-content">
              <h3>Memory Usage</h3>
              <div className="overview-value">{(clusterStats.avgMemoryUsage * 100).toFixed(1)}%</div>
              <div className={`overview-status ${getStatusColor(clusterStats.avgMemoryUsage * 100, {warning: 70, critical: 85})}`}>
                Average
              </div>
            </div>
          </div>
          
          <div className="overview-card">
            <div className="overview-icon"><FiAlertCircle /></div>
            <div className="overview-content">
              <h3>Errors</h3>
              <div className="overview-value">{clusterStats.totalErrors}</div>
              <div className={`overview-status ${getStatusColor(clusterStats.totalErrors, {warning: 10, critical: 50})}`}>
                Total
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Selection and Random Request Controls */}
      <div className="provider-selection-controls">
        <div className="selection-stats">
          <span className="selection-count">{selectedProviders.length} providers selected</span>
          <div className="selection-buttons">
            <button className="control-btn" onClick={selectAllProviders}>
              <FiCheck /> Select All
            </button>
            <button className="control-btn" onClick={clearSelectedProviders} disabled={selectedProviders.length === 0}>
              <FiX /> Clear
            </button>
          </div>
        </div>
        
        <div className="random-selection">
          <div className="random-input-group">
            <label>Random:</label>
            <div className="number-input">
              <button onClick={() => setNumRandomProviders(Math.max(1, numRandomProviders - 1))}>
                <FiMinus />
              </button>
              <input
                type="number"
                value={numRandomProviders}
                onChange={(e) => setNumRandomProviders(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
              />
              <button onClick={() => setNumRandomProviders(numRandomProviders + 1)}>
                <FiPlus />
              </button>
            </div>
            <button className="control-btn" onClick={selectRandomProviders}>
              <FiShuffle /> Random
            </button>
          </div>
        </div>
        
        {selectedProviders.length > 0 && (
          <div className="request-controls">
            <button 
              className="primary-btn" 
              onClick={requestRandomDirect} 
              disabled={!isConnected || requestLoading}
            >
              {requestLoading ? (
                <>
                  <span className="spinner"></span>
                  Requesting...
                </>
              ) : (
                <>
                  <FiZap /> Request Random
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Result/Error Message */}
      {(requestResult || error) && (
        <div className={`message-container ${error ? 'error' : 'success'}`}>
          {requestResult && <div className="success-message">{requestResult}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
      )}

      {/* Main Content Area */}
      <div className="dashboard-content">
        {viewMode === 'grid' && (
          <div className="providers-grid">
            {sortedProviders.map(provider => {
              const isSelected = selectedProviders.some(p => p.providerId === provider.providerId);
              
              // Determine provider status: disabled (-), offline (0), online (1+)
              // Using random_balance field as requested
              const randomValue = provider.providerActivity?.random_balance;
              const isDisabled = randomValue !== undefined && randomValue < 0;
              const isOffline = randomValue !== undefined && randomValue === 0;
              const isOnline = randomValue !== undefined && randomValue > 0;
              
              // ONLY providers with value -2 should be eligible for reinitialization
              const needsReinitialization = randomValue === -2;
              
              const isReinitializing = reinitializingProviders[provider.providerId];
              const reinitSuccess = reinitSuccessProviders[provider.providerId];
              
              // Extract system info
              const systemInfo = provider.parsedSystemInfo;
              const memoryUsage = systemInfo?.systemSpecs?.freeMem && systemInfo?.systemSpecs?.totalMem ?
                                 (systemInfo.systemSpecs.totalMem - systemInfo.systemSpecs.freeMem) / systemInfo.systemSpecs.totalMem * 100 :
                                 null;
              const errorCount = systemInfo?.errors?.count || 0;
              const processingTime = systemInfo?.stepTimings?.overall?.average || 0;
              
              return (
                <div 
                  key={provider.providerId}
                  className={`provider-card ${isSelected ? 'selected' : ''} ${needsReinitialization ? 'offline' : 'online'}`}
                  onClick={() => toggleProviderSelection(provider)}
                >
                  <div className="card-header">
                    <div className="provider-title">
                      <div className="provider-name">
                        {provider.providerInfo?.provider_details?.name || 'Unknown Provider'}
                      </div>
                      <div 
                        className="provider-id" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(provider.providerId);
                          // Show temporary tooltip or feedback
                          const el = e.currentTarget;
                          el.setAttribute('data-copied', 'true');
                          setTimeout(() => el.removeAttribute('data-copied'), 2000);
                        }}
                        title="Click to copy Provider ID"
                      >
                        {provider.providerId.substring(0, 8)}...{provider.providerId.substring(provider.providerId.length - 4)}
                      </div>
                    </div>
                    <div className="header-actions">
                      <div className="top-actions">
                        {provider.providerVersion && (
                          <span className="version-tag">v{provider.providerVersion}</span>
                        )}
                        <button 
                          className="details-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            viewProviderDetails(provider);
                          }}
                          title="View Details"
                        >
                          <FiInfo size={16} />
                        </button>
                      </div>
                      
                      {/* Reinitialize button for offline providers */}
                      {needsReinitialization && (
                        <button 
                          className="mini-reinit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReinitializeProvider(provider.providerId);
                          }}
                          disabled={isReinitializing}
                          title={isReinitializing ? 'Reinitializing...' : reinitSuccess ? 'Successfully Reinitialized' : 'Reinitialize Provider'}
                        >
                          {isReinitializing ? (
                            <span className="mini-spinner"></span>
                          ) : reinitSuccess ? (
                            <FiCheck size={14} />
                          ) : (
                            <FiRefreshCw size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="provider-metrics">
                    {/* Status Indicator */}
                    <div className="metric">
                      <div className={`metric-value status-value ${isDisabled ? 'disabled' : isOffline ? 'offline' : 'online'}`}>
                        <span className={`status-indicator ${isDisabled ? 'disabled' : isOffline ? 'offline' : 'online'}`}></span>
                        <span>
                          {isDisabled ? `Disabled (${randomValue || 'N/A'})` : 
                           isOffline ? 'Offline (0)' : 
                           `Online (${randomValue !== undefined ? randomValue : 'N/A'})`}
                        </span>
                      </div>
                    </div>
                    
                    {/* CPU Cores */}
                    <div className="metric">
                      <div className={`metric-value ${!systemInfo?.systemSpecs?.cpus ? 'unavailable' : ''}`}>
                        <FiCpu />
                        <span>
                          {systemInfo?.systemSpecs?.cpus ? `${systemInfo.systemSpecs.cpus} cores` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Memory Usage */}
                    <div className="metric">
                      <div className={`metric-value ${memoryUsage !== null ? getStatusColor(memoryUsage, {warning: 70, critical: 85}) : 'unavailable'}`}>
                        <FiHardDrive />
                        <span>
                          {memoryUsage !== null ? `${memoryUsage.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Processing Time */}
                    <div className="metric">
                      <div className={`metric-value ${processingTime > 0 ? getStatusColor(processingTime, {warning: 5000, critical: 10000}) : 'unavailable'}`}>
                        <FiClock />
                        <span>
                          {processingTime > 0 ? formatTime(processingTime) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Error Count */}
                    <div className="metric">
                      <div className={`metric-value ${errorCount !== undefined ? getStatusColor(errorCount, {warning: 5, critical: 20}) : 'unavailable'}`}>
                        <FiAlertCircle />
                        <span>
                          {errorCount !== undefined ? errorCount : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Version tag moved to header */}
                </div>
              );
            })}
          </div>
        )}
        
        {viewMode === 'details' && selectedDetailProvider && (
          <div className="provider-details">
            <div className="details-header">
              <button className="back-button" onClick={() => setViewMode('grid')}>
                <FiArrowLeft /> Back to Grid
              </button>
              <h2>{selectedDetailProvider.providerInfo?.provider_details?.name || 'Provider'} Details</h2>
            </div>
            
            <div className="details-content">
              <div className="details-sidebar">
                <div className="details-card">
                  <h3>Provider Info</h3>
                  <div className="details-field">
                    <span className="field-label">Provider ID:</span>
                    <span className="field-value">{selectedDetailProvider.providerId}</span>
                  </div>
                  <div className="details-field">
                    <span className="field-label">Status:</span>
                    <span className={`status-indicator ${selectedDetailProvider.providerActivity?.random_balance !== undefined && 
                      selectedDetailProvider.providerActivity.random_balance >= 0 ? 'online' : 'offline'}`}>
                      {selectedDetailProvider.providerActivity?.random_balance !== undefined && 
                       selectedDetailProvider.providerActivity.random_balance >= 0 ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  {selectedDetailProvider.providerVersion && (
                    <div className="details-field">
                      <span className="field-label">Version:</span>
                      <span className="field-value">{selectedDetailProvider.providerVersion}</span>
                    </div>
                  )}
                  <div className="details-field">
                    <span className="field-label">Last Update:</span>
                    <span className="field-value">
                      {selectedDetailProvider.parsedSystemInfo?.lastUpdate ? 
                        formatDate(selectedDetailProvider.parsedSystemInfo.lastUpdate) : 'N/A'}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="details-actions">
                    <button 
                      className="action-button"
                      onClick={() => toggleProviderSelection(selectedDetailProvider)}
                    >
                      {selectedProviders.some(p => p.providerId === selectedDetailProvider.providerId) ? 
                        <><FiX /> Deselect</> : <><FiCheck /> Select</>}
                    </button>
                    
                    {(selectedDetailProvider.providerActivity?.random_balance === undefined || 
                      selectedDetailProvider.providerActivity.random_balance < 0) && (
                      <button 
                        className={`action-button ${reinitializingProviders[selectedDetailProvider.providerId] ? 'loading' : ''}`}
                        onClick={() => handleReinitializeProvider(selectedDetailProvider.providerId)}
                        disabled={reinitializingProviders[selectedDetailProvider.providerId]}
                      >
                        {reinitializingProviders[selectedDetailProvider.providerId] ? (
                          <><span className="spinner"></span> Reinitializing...</>
                        ) : (
                          <><FiRefreshCw /> Reinitialize</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="details-main">
                {/* Tabs for different information categories */}
                <div className="details-tabs">
                  <button 
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('performance')}
                    disabled={!selectedDetailProvider.parsedSystemInfo?.stepTimings}
                  >
                    Performance
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'hardware' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hardware')}
                    disabled={!selectedDetailProvider.parsedSystemInfo?.systemSpecs}
                  >
                    Hardware
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'errors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('errors')}
                    disabled={!selectedDetailProvider.parsedSystemInfo?.errors}
                  >
                    Errors
                  </button>
                </div>
                
                <div className="details-tab-content">
                  {activeTab === 'overview' && (
                    <div className="overview-tab">
                      {selectedDetailProvider.parsedSystemInfo ? (
                        <div className="overview-metrics">
                          {/* CPU Info */}
                          {selectedDetailProvider.parsedSystemInfo.systemSpecs?.cpus && (
                            <div className="detail-metric-card">
                              <div className="metric-icon"><FiCpu /></div>
                              <div className="metric-details">
                                <h4>CPU</h4>
                                <div className="metric-primary">{selectedDetailProvider.parsedSystemInfo.systemSpecs.cpus} cores</div>
                                <div className="metric-secondary">{selectedDetailProvider.parsedSystemInfo.systemSpecs.cpuModel || 'Unknown Model'}</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Memory Info */}
                          {selectedDetailProvider.parsedSystemInfo.systemSpecs?.totalMem && (
                            <div className="detail-metric-card">
                              <div className="metric-icon"><FiHardDrive /></div>
                              <div className="metric-details">
                                <h4>Memory</h4>
                                <div className="metric-primary">
                                  {formatMemory(selectedDetailProvider.parsedSystemInfo.systemSpecs.totalMem - 
                                  (selectedDetailProvider.parsedSystemInfo.systemSpecs.freeMem || 0))} / 
                                  {formatMemory(selectedDetailProvider.parsedSystemInfo.systemSpecs.totalMem)}
                                </div>
                                <div className="metric-secondary">
                                  {selectedDetailProvider.parsedSystemInfo.systemSpecs.freeMem ? 
                                    `${(((selectedDetailProvider.parsedSystemInfo.systemSpecs.totalMem - 
                                    selectedDetailProvider.parsedSystemInfo.systemSpecs.freeMem) / 
                                    selectedDetailProvider.parsedSystemInfo.systemSpecs.totalMem) * 100).toFixed(1)}% used` : 'N/A'}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Processing Time */}
                          {selectedDetailProvider.parsedSystemInfo.stepTimings?.overall && (
                            <div className="detail-metric-card">
                              <div className="metric-icon"><FiClock /></div>
                              <div className="metric-details">
                                <h4>Processing Time</h4>
                                <div className="metric-primary">
                                  {formatTime(selectedDetailProvider.parsedSystemInfo.stepTimings.overall.average)}
                                </div>
                                <div className="metric-secondary">
                                  {selectedDetailProvider.parsedSystemInfo.stepTimings.overall.count} measurements
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Errors */}
                          {selectedDetailProvider.parsedSystemInfo.errors && (
                            <div className="detail-metric-card">
                              <div className="metric-icon"><FiAlertCircle /></div>
                              <div className="metric-details">
                                <h4>Errors</h4>
                                <div className="metric-primary">
                                  {selectedDetailProvider.parsedSystemInfo.errors.count} errors
                                </div>
                                <div className="metric-secondary">
                                  {selectedDetailProvider.parsedSystemInfo.errors.count > 0 ? 
                                    'Click Errors tab for details' : 'No errors reported'}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Uptime */}
                          {(selectedDetailProvider.parsedSystemInfo.uptime || selectedDetailProvider.parsedSystemInfo.systemSpecs?.uptime) && (
                            <div className="detail-metric-card">
                              <div className="metric-icon"><FiActivity /></div>
                              <div className="metric-details">
                                <h4>Uptime</h4>
                                <div className="metric-primary">
                                  {selectedDetailProvider.parsedSystemInfo.uptime?.formatted || 
                                   formatTime(selectedDetailProvider.parsedSystemInfo.systemSpecs?.uptime! * 1000)}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Platform Info */}
                          {selectedDetailProvider.parsedSystemInfo.systemSpecs?.platform && (
                            <div className="detail-metric-card">
                              <div className="metric-icon"><FiServer /></div>
                              <div className="metric-details">
                                <h4>Platform</h4>
                                <div className="metric-primary">
                                  {selectedDetailProvider.parsedSystemInfo.systemSpecs.platform}
                                </div>
                                <div className="metric-secondary">
                                  {selectedDetailProvider.parsedSystemInfo.systemSpecs.arch} / 
                                  {selectedDetailProvider.parsedSystemInfo.systemSpecs.release}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="no-data-message">
                          <FiInfo /> No system information available for this provider
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'performance' && selectedDetailProvider.parsedSystemInfo?.stepTimings && (
                    <div className="performance-tab">
                      <div className="performance-metrics">
                        {Object.entries(selectedDetailProvider.parsedSystemInfo.stepTimings)
                          .filter(([key]) => key !== 'overall')
                          .map(([step, data]) => (
                            <div className="detail-metric-card" key={step}>
                              <div className="metric-icon"><FiClock /></div>
                              <div className="metric-details">
                                <h4>{step === 'step1' ? 'Validation' :
                                     step === 'step2' ? 'Execution' :
                                     step === 'step3' ? 'Result Processing' :
                                     step === 'step4' ? 'Response' : step}</h4>
                                <div className="metric-primary">
                                  {formatTime((data as any).average)}
                                </div>
                                <div className="metric-secondary">
                                  {(data as any).count} measurements
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'hardware' && selectedDetailProvider.parsedSystemInfo?.systemSpecs && (
                    <div className="hardware-tab">
                      <div className="hardware-details">
                        {Object.entries(selectedDetailProvider.parsedSystemInfo.systemSpecs).map(([key, value]) => {
                          if (value === undefined) return null;
                          
                          let formattedValue = value;
                          let label = key.charAt(0).toUpperCase() + key.slice(1);
                          
                          if (key === 'totalMem' || key === 'freeMem') {
                            formattedValue = formatMemory(value as number);
                            label = key === 'totalMem' ? 'Total Memory' : 'Free Memory';
                          } else if (key === 'uptime') {
                            formattedValue = formatTime((value as number) * 1000);
                            label = 'System Uptime';
                          } else if (key === 'loadAvg') {
                            formattedValue = (value as number[]).map(v => v.toFixed(2)).join(', ');
                            label = 'Load Average (1m, 5m, 15m)';
                          }
                          
                          return (
                            <div className="details-field" key={key}>
                              <span className="field-label">{label}:</span>
                              <span className="field-value">{formattedValue?.toString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'errors' && selectedDetailProvider.parsedSystemInfo?.errors && (
                    <div className="errors-tab">
                      <div className="error-summary">
                        <h3>Error Count: {selectedDetailProvider.parsedSystemInfo.errors.count}</h3>
                        
                        {selectedDetailProvider.parsedSystemInfo.errors.recentErrors?.length > 0 ? (
                          <div className="recent-errors">
                            <h4>Recent Errors:</h4>
                            <div className="error-list">
                              {selectedDetailProvider.parsedSystemInfo.errors.recentErrors.map((error, index) => (
                                <div className="error-item" key={index}>
                                  <div className="error-icon"><FiAlertCircle /></div>
                                  <div className="error-message">{error}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="no-errors-message">
                            No recent errors available
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
