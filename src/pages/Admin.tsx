import React, { useState, useEffect } from 'react';
import { aoHelpers, TOKEN_DECIMALS } from '../utils/ao-helpers';
import { useProviders } from '../contexts/ProviderContext';

// Add type declaration for arweaveWallet on window object
declare global {
  interface Window {
    arweaveWallet: any;
  }
}
import { connect, createDataItemSigner, message } from "@permaweb/aoconnect";
import { ConnectWallet } from '../components/common/ConnectWallet';
import { Spinner } from '../components/common/Spinner';
import { ButtonSpinner } from '../components/common/ButtonSpinner';
import { ProviderInfoAggregate, RandomClient, RNGToken, MonitoringData } from 'ao-process-clients';
import { useWallet } from '../contexts/WalletContext';
import { FiCheck, FiRefreshCw, FiSend, FiZap, FiPlus, FiMinus, FiShuffle, FiInfo, FiCpu, FiDatabase, FiServer } from 'react-icons/fi';
import { ProviderDetailsModal } from '../components/ProviderDetailsModal';
import './Providers.css';
import './Admin.css';

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

// Combined Provider Management Component
interface ProviderManagementProps {
  providers: ProviderInfoAggregate[];
  isConnected: boolean;
  isLoading: boolean;
  reinitializingProviders: { [key: string]: boolean };
  reinitSuccessProviders: { [key: string]: boolean };
  reinitAllLoading: boolean;
  onReinitializeAll: () => void;
  onReinitializeProvider: (providerId: string) => void;
  connectedAddress?: string;
}

const ProviderManagement: React.FC<ProviderManagementProps> = ({
  providers,
  isConnected,
  isLoading,
  reinitializingProviders,
  reinitSuccessProviders,
  reinitAllLoading,
  onReinitializeAll,
  onReinitializeProvider,
  connectedAddress,
}) => {
  const [selectedProviders, setSelectedProviders] = useState<ProviderInfoAggregate[]>([]);
  const [numRandomProviders, setNumRandomProviders] = useState<number>(3);
  const [requestMethod, setRequestMethod] = useState<'direct' | 'client'>('direct');
  const [requestLoading, setRequestLoading] = useState<boolean>(false);
  const [requestResult, setRequestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<string | null>(null);

  // Filter providers by search term
  const filteredProviders = providers.filter(provider => {
    const searchableText = `${provider.providerId} ${provider.providerInfo?.provider_details?.name || ''}`;
    return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Get monitoring data for a provider with enhanced logging
  const getProviderMonitoringData = (provider: ProviderInfoAggregate): MonitoringData | undefined => {
    try {
      const providerInfo = provider.providerActivity?.provider_info;
      
      // Log provider info to debug issues
      if (provider.providerId) {
        console.log(`Provider ${provider.providerId} monitoring data:`, 
          typeof providerInfo === 'string' ? 'String data (needs parsing)' : providerInfo);
      }
      
      // If provider_info is a string, try to parse it
      if (typeof providerInfo === 'string') {
        try {
          return JSON.parse(providerInfo) as MonitoringData;
        } catch (parseError) {
          console.error('Failed to parse provider_info string:', parseError);
          return undefined;
        }
      }
      
      return providerInfo as MonitoringData | undefined;
    } catch (error) {
      console.error('Error getting provider monitoring data:', error);
      return undefined;
    }
  };
  
  // Safe access helper for deep properties
  const safeGet = <T,>(obj: any, path: string, defaultValue: T): T => {
    try {
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === undefined || current === null) return defaultValue;
        current = current[part];
      }
      return (current === undefined || current === null) ? defaultValue : current as T;
    } catch (e) {
      console.log(`Error accessing path ${path}:`, e);
      return defaultValue;
    }
  };
  
  // Get selected provider for modal
  const getSelectedProvider = () => {
    if (!selectedProviderForModal) return null;
    return providers.find(p => p.providerId === selectedProviderForModal);
  };
  
  // Open modal with provider details
  const openProviderDetails = (providerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProviderForModal(providerId);
    setModalOpen(true);
  };

  const selectAllProviders = () => {
    setSelectedProviders([...filteredProviders]);
  };

  const clearSelectedProviders = () => {
    setSelectedProviders([]);
  };

  const toggleProviderSelection = (provider: ProviderInfoAggregate) => {
    if (selectedProviders.find(p => p.providerId === provider.providerId)) {
      setSelectedProviders(selectedProviders.filter(p => p.providerId !== provider.providerId));
    } else {
      setSelectedProviders([...selectedProviders, provider]);
    }
  };

  const selectRandomProviders = () => {
    // Ensure we don't try to select more providers than available
    const count = Math.min(numRandomProviders, filteredProviders.length);
    
    // Shuffle the providers array and take the first 'count' items
    const shuffled = [...filteredProviders].sort(() => 0.5 - Math.random());
    setSelectedProviders(shuffled.slice(0, count));
  };

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
      setError(`Error requesting random: ${error.message || error}`);
    } finally {
      setRequestLoading(false);
    }
  };

  const requestRandomClient = async () => {
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
      const randomClient = await aoHelpers.getRandomClient();
      const result = await randomClient.createRequest(providerIds, providerIds.length, callbackId);
      setRequestResult(`Request sent! Callback ID: ${callbackId}`);
      console.log('Client request result:', result);
    } catch (error: any) {
      console.error('Error requesting random with client:', error);
      setError(`Error requesting random: ${error.message || error}`);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRequest = () => {
    if (requestMethod === 'direct') {
      requestRandomDirect();
    } else {
      requestRandomClient();
    }
  };

  return (
    <div className="provider-management-section">
      {/* Provider Details Modal */}
      {modalOpen && selectedProviderForModal && (
        <ProviderDetailsModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          providerId={selectedProviderForModal}
          providerName={getSelectedProvider()?.providerInfo?.provider_details?.name || ''}
          monitoringData={getSelectedProvider() ? getProviderMonitoringData(getSelectedProvider()!) : undefined}
        />
      )}
      
      <div className="section-controls">
        <div className="main-controls">
          <button 
            className="reinit-all-button" 
            onClick={onReinitializeAll}
            disabled={reinitAllLoading || isLoading || providers.length === 0 || !isConnected}
          >
            {reinitAllLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <FiRefreshCw />
                <span>Reinitialize All Providers</span>
              </>
            )}
          </button>
          
          <div className="view-toggle">
            <button 
              className={`view-button ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
            >
              Grid
            </button>
            <button 
              className={`view-button ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
          
          <div className="search-container">
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
      
      <div className="provider-random-container">
        {/* Request Random Panel - Now on top */}
        <div className="request-panel">
          <h3>Request Random</h3>
          
          <div className="selection-stats">
            <div className="selected-count">
              <span className="count-label">Selected Providers:</span>
              <span className="count-value">{selectedProviders.length}</span>
            </div>
            
            <div className="selection-actions">
              <button
                className="action-button"
                onClick={selectAllProviders}
                disabled={filteredProviders.length === 0}
              >
                <FiPlus /> Select All
              </button>
              <button
                className="action-button"
                onClick={clearSelectedProviders}
                disabled={selectedProviders.length === 0}
              >
                <FiMinus /> Clear
              </button>
              <div className="random-selection">
                <input
                  type="number"
                  min="1"
                  max={filteredProviders.length}
                  value={numRandomProviders}
                  onChange={(e) => setNumRandomProviders(Math.max(1, Math.min(filteredProviders.length, parseInt(e.target.value) || 1)))}
                  className="random-count-input"
                />
                <button
                  className="action-button"
                  onClick={selectRandomProviders}
                  disabled={filteredProviders.length === 0}
                >
                  <FiShuffle /> Random
                </button>
              </div>
            </div>
          </div>
          
          <div className="request-controls">
            <div className="request-method-toggle">
              <button
                className={`method-button ${requestMethod === 'direct' ? 'active' : ''}`}
                onClick={() => setRequestMethod('direct')}
              >
                Direct Request
              </button>
              <button
                className={`method-button ${requestMethod === 'client' ? 'active' : ''}`}
                onClick={() => setRequestMethod('client')}
              >
                Client Request
              </button>
            </div>
            
            <button
              className="request-button"
              onClick={handleRequest}
              disabled={requestLoading || selectedProviders.length === 0 || !isConnected}
            >
              {requestLoading ? (
                <ButtonSpinner />
              ) : (
                <>
                  <FiSend />
                  <span>Send Request</span>
                </>
              )}
            </button>
          </div>
          
          {error && <div className="request-error">{error}</div>}
          {requestResult && <div className="request-success">{requestResult}</div>}
        </div>

        {/* Provider Grid/Table - Now below */}
        <div className="providers-panel">
          <h3>Providers</h3>
          
          {isLoading ? (
            <div className="loading-container">
              <Spinner text="Loading providers..." />
            </div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : filteredProviders.length === 0 ? (
            <div className="empty-state">No providers found</div>
          ) : view === 'grid' ? (
            <div className="provider-grid">
              {filteredProviders.map(provider => {
                const isSelected = selectedProviders.some(p => p.providerId === provider.providerId);
                const isReinitializing = reinitializingProviders[provider.providerId];
                const isReinitSuccess = reinitSuccessProviders[provider.providerId];
                const needsReinit = (provider.providerActivity?.random_balance || 0) < 0;
                const monitoringData = getProviderMonitoringData(provider);
                
                return (
                  <div
                    key={provider.providerId}
                    className={`provider-card ${isSelected ? 'selected' : ''} ${needsReinit ? 'needs-reinit' : ''}`}
                    onClick={() => toggleProviderSelection(provider)}
                  >
                    <div className="provider-name">
                      {provider.providerInfo?.provider_details?.name || provider.providerId.slice(0, 4) + '...' + provider.providerId.slice(-4)}
                      {monitoringData && (
                        <span className="provider-version">v{monitoringData.providerVersion}</span>
                      )}
                    </div>
                    <div 
                      className="provider-id" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(provider.providerId);
                        // Optional: Show a temporary tooltip or notification
                        const target = e.currentTarget;
                        target.setAttribute('data-copied', 'true');
                        setTimeout(() => target.removeAttribute('data-copied'), 1500);
                      }}
                      title="Click to copy full ID"
                    >
                      {provider.providerId.slice(0, 4)}...{provider.providerId.slice(-4)}
                    </div>
                      
                    <div className={`provider-status ${(provider.providerActivity?.random_balance || 0) > 0 ? 'status-active' : (provider.providerActivity?.random_balance || 0) === 0 ? 'status-off' : 'status-disabled'}`}>
                      <span className="status-text">
                        {(provider.providerActivity?.random_balance || 0) > 0 ? 'Active' : (provider.providerActivity?.random_balance || 0) === 0 ? 'Off' : 'Disabled'}
                        <span className="status-value"> ({provider.providerActivity?.random_balance || 0})</span>
                      </span>
                    </div>
                    
                    {connectedAddress === "N90q65iT59dCo01-gtZRUlLMX0w6_ylFHv2uHaSUFNk" && (
                      <div 
                        className="provider-info-button" 
                        title="View provider details"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProviderDetails(provider.providerId, e);
                        }}
                      >
                        <FiInfo className="info-icon" />
                      </div>
                    )}
                    
                    <div className="provider-metrics">
                      <div className="metric-row">
                        <div className="metric">
                          <span className="metric-label">Status:</span>
                          <span className={monitoringData ? "metric-value" : "metric-value missing"}>
                            {safeGet(monitoringData, 'health.status', 'N/A')}
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Uptime:</span>
                          <span className={monitoringData ? "metric-value" : "metric-value missing"}>
                            {safeGet(monitoringData, 'systemSpecs.uptime', null) ? 
                              `${Math.floor(safeGet(monitoringData, 'systemSpecs.uptime', 0) / 3600)}h` : "N/A"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="metric-row">
                        <div className="metric">
                          <span className="metric-label">Last Update:</span>
                          <span className={monitoringData ? "metric-value" : "metric-value missing"}>
                            {safeGet(monitoringData, 'timestamp', null) ? 
                              new Date(safeGet(monitoringData, 'timestamp', '')).toLocaleTimeString() : "N/A"}
                          </span>
                        </div>
                        <div className="health-indicator" title="Provider health status">
                          <span className={`status-circle ${safeGet(monitoringData, 'health.status', 'unknown')}`}></span>
                          {safeGet(monitoringData, 'health.errorTotal', 0) > 0 && (
                            <span className="error-count" title={`${safeGet(monitoringData, 'health.errorTotal', 0)} errors detected`}>
                              {safeGet(monitoringData, 'health.errorTotal', 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="provider-actions">
                      {needsReinit && (
                        <button
                          className="reinit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReinitializeProvider(provider.providerId);
                          }}
                          disabled={isReinitializing}
                          title="Reinitialize provider"
                        >
                          {isReinitializing ? (
                            <ButtonSpinner />
                          ) : isReinitSuccess ? (
                            <FiCheck className="success-icon" />
                          ) : (
                            <FiRefreshCw />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {isSelected && (
                      <div className="selected-indicator"><FiCheck /></div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="provider-table-container">
              <table className="provider-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Provider ID</th>
                    <th>Name</th>
                    <th>Random Available</th>
                    <th>Health</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProviders.map(provider => {
                    const isSelected = selectedProviders.some(p => p.providerId === provider.providerId);
                    const isReinitializing = reinitializingProviders[provider.providerId];
                    const isReinitSuccess = reinitSuccessProviders[provider.providerId];
                    const needsReinit = (provider.providerActivity?.random_balance || 0) < 0;
                    const monitoringData = getProviderMonitoringData(provider);
                    
                    return (
                      <tr key={provider.providerId} className={needsReinit ? 'needs-reinit' : ''}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleProviderSelection(provider)}
                          />
                        </td>
                        <td className="provider-id-cell">{provider.providerId}</td>
                        <td>
                          {provider.providerInfo?.provider_details?.name || provider.providerId.slice(0, 4) + '...' + provider.providerId.slice(-4)}
                          {monitoringData && (
                            <span className="provider-version">v{monitoringData.providerVersion}</span>
                          )}
                        </td>
                        <td className={needsReinit ? 'negative-balance' : ''}>
                          {provider.providerActivity?.random_balance || 0}
                        </td>
                        <td>
                          <div className="health-pill">
                            {monitoringData ? (
                              <>
                                <div className={`status-dot ${monitoringData.health.status}`}></div>
                                <span>{monitoringData.health.status}</span>
                              </>
                            ) : (
                              <>
                                <div className="status-dot missing"></div>
                                <span className="missing">N/A</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            className="details-button"
                            onClick={(e) => openProviderDetails(provider.providerId, e)}
                            title="View provider details"
                          >
                            <FiInfo />
                          </button>
                          
                          {needsReinit && (
                            <button
                              className="reinit-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReinitializeProvider(provider.providerId);
                              }}
                              disabled={isReinitializing}
                            >
                              {isReinitializing ? (
                                <ButtonSpinner />
                              ) : isReinitSuccess ? (
                                <FiCheck className="success-icon" />
                              ) : (
                                <FiRefreshCw />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Admin() {
  // Get providers data from context
  const { providers, loading, error } = useProviders();
  const [reinitializing, setReinitializing] = useState<{ [key: string]: boolean }>({});
  const [reinitSuccess, setReinitSuccess] = useState<{ [key: string]: boolean }>({});
  const [reinitAllLoading, setReinitAllLoading] = useState(false);
  const { address: connectedAddress, isConnecting, isConnected, isReady } = useWallet();
  
  // Token transfer state
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [transferSuccess, setTransferSuccess] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  // Process ID for RandAO
  const RANDAO_PROCESS_ID = "8N08BvmC34q9Hxj-YS6eAOd_cSmYqGpezPPHUYWJBhg";
  // Token process ID
  const TOKEN_PROCESS_ID = "rPpsRk9Rm8_SJ1JF8m9_zjTalkv9Soaa_5U0tYUloeY";

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!connectedAddress || !isConnected) return;
    
    setLoadingBalance(true);
    try {
      const balance = await aoHelpers.getWalletBalance(connectedAddress);
      setWalletBalance(balance);
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    // Just fetch wallet balance when address is available
    // Providers are now handled by the context
    if (connectedAddress && isConnected) {
      fetchWalletBalance();
    }
  }, [connectedAddress, isConnected]);

  const handleReinitialize = async (providerId: string) => {
    if (!isConnected || !window.arweaveWallet) {
      alert('Please connect your wallet first.');
      return;
    }

    setReinitializing(prev => ({ ...prev, [providerId]: true }));
    setReinitSuccess(prev => ({ ...prev, [providerId]: false }));

    try {
      // Find the provider from our context data
      const providerToReinit = providers.find(p => p.providerId === providerId);
      
      // Make sure we have provider data
      if (!providerToReinit) {
        throw new Error(`Provider data not found for ${providerId}`);
      }
      
      // Pass the provider data to avoid another API call
      await aoHelpers.reinitProvider(providerId, window.arweaveWallet, providerToReinit);
      setReinitSuccess(prev => ({ ...prev, [providerId]: true }));
      
      // Reset success indicator after 3 seconds
      setTimeout(() => {
        setReinitSuccess(prev => {
          const newState = { ...prev };
          delete newState[providerId];
          return newState;
        });
      }, 3000);
    } catch (err) {
      console.error('Error reinitializing provider:', err);
      alert(`Failed to reinitialize provider: ${err}`);
    } finally {
      setReinitializing(prev => {
        const newState = { ...prev };
        delete newState[providerId];
        return newState;
      });
    }
  };

  const handleReinitializeAll = async () => {
    if (!isConnected || !window.arweaveWallet) {
      alert('Please connect your wallet first.');
      return;
    }

    setReinitAllLoading(true);
    const providersToReinit = providers.filter(provider => 
      (provider.providerActivity?.random_balance || 0) < 0
    );

    try {
      if (providersToReinit.length === 0) {
        alert('No providers need reinitialization.');
        return;
      }

      for (const provider of providersToReinit) {
        // Mark as in progress
        setReinitializing(prev => ({ ...prev, [provider.providerId]: true }));
        setReinitSuccess(prev => ({ ...prev, [provider.providerId]: false }));
        
        try {
          // Provider data is already available from the filter above
          // We can be sure it's not undefined
          await aoHelpers.reinitProvider(provider.providerId, window.arweaveWallet, provider);
          setReinitSuccess(prev => ({ ...prev, [provider.providerId]: true }));
        } catch (err) {
          console.error(`Failed to reinitialize provider ${provider.providerId}:`, err);
        } finally {
          setReinitializing(prev => {
            const newState = { ...prev };
            delete newState[provider.providerId];
            return newState;
          });
        }
      }
      
      // Clear success indicators after 3 seconds
      setTimeout(() => {
        setReinitSuccess({});
      }, 3000);

    } catch (err) {
      console.error('Error in bulk reinitialization:', err);
      alert(`Error during bulk reinitialization: ${err}`);
    } finally {
      setReinitAllLoading(false);
    }
  };

  const handleSendTokens = async () => {
    if (!isConnected || !window.arweaveWallet) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!recipientAddress) {
      setTransferError('Please enter a recipient address.');
      return;
    }

    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferError('Please enter a valid amount.');
      return;
    }

    setTransferLoading(true);
    setTransferSuccess(false);
    setTransferError(null);

    try {
      const amount = parseFloat(transferAmount);
      // Convert to token units with proper decimals
      const tokenAmount = (amount * Math.pow(10, TOKEN_DECIMALS)).toString();

      // Create RNGToken client with default builder
      const tokenClient = await RNGToken.defaultBuilder()
        // No need to override the defaults as they should be set to RandAO URLs
        .build();
      
      // Use the token client to send tokens
      await tokenClient.transfer(recipientAddress, tokenAmount);

      // Reset form and show success
      setTransferSuccess(true);
      setRecipientAddress('');
      setTransferAmount('');
      
      // Refresh balance after short delay
      setTimeout(() => {
        fetchWalletBalance();
        setTransferSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error sending tokens:', err);
      setTransferError(`Failed to send tokens: ${err}`);
    } finally {
      setTransferLoading(false);
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Format balance for display
  const formatBalance = (balanceStr: string) => {
    try {
      const balanceNum = parseFloat(balanceStr) / Math.pow(10, TOKEN_DECIMALS);
      return balanceNum.toLocaleString(undefined, { maximumFractionDigits: 6 });
    } catch (e) {
      return '0';
    }
  };

  return (
    <div className="providers-page">
      <main>
        <header className="page-header">
          <h1>RandAO Admin</h1>
          <ConnectWallet />
        </header>
        <div className="content">
          {isConnected && (
            <div className="admin-section token-transfer-section">
              <h2>RANDAO Token Management</h2>
              <div className="balance-display">
                <span>Your Balance: </span>
                {loadingBalance ? (
                  <span className="loading-text">Loading...</span>
                ) : (
                  <span className="token-balance">{formatBalance(walletBalance)} RANDAO</span>
                )}

                <button onClick={fetchWalletBalance} className="refresh-button">
                  <FiRefreshCw />
                </button>
              </div>
              <div className="transfer-form">
                <h3>Send Tokens</h3>
                <div className="form-group">
                  <label htmlFor="recipient">Recipient Address:</label>
                  <input
                    type="text"
                    id="recipient"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="Enter recipient wallet address"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="amount">Amount:</label>
                  <input
                    type="number"
                    id="amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount to send"
                    min="0"
                    step="0.000001"
                  />
                </div>
                <button 
                  className="send-button" 
                  onClick={handleSendTokens}
                  disabled={transferLoading || !recipientAddress || !transferAmount}
                >
                  {transferLoading ? (
                    <ButtonSpinner />
                  ) : transferSuccess ? (
                    <><FiCheck className="success-icon" /> Sent!</>
                  ) : (
                    <><FiSend /> Send Tokens</>
                  )}
                </button>
                {transferError && <div className="error-message">{transferError}</div>}
              </div>
            </div>
          )}

          {isConnected && (
            <div className="admin-section provider-management-container">
              <h2>Provider Management & Random Requests</h2>
              <ProviderManagement 
                providers={providers} 
                isConnected={isConnected} 
                isLoading={loading}
                reinitializingProviders={reinitializing}
                reinitSuccessProviders={reinitSuccess}
                reinitAllLoading={reinitAllLoading}
                onReinitializeAll={handleReinitializeAll}
                onReinitializeProvider={handleReinitialize}
                connectedAddress={connectedAddress} 
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
