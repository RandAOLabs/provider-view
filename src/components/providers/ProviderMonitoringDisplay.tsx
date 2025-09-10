import React, { useState, useEffect } from 'react';
import { FiX, FiServer, FiCpu, FiActivity, FiHash, FiCheck, FiAlertTriangle, FiClock } from 'react-icons/fi';
import { MonitoringData } from 'ao-js-sdk';
import { aoHelpers } from '../../utils/ao-helpers';
import './ProviderMonitoringDisplay.css';

interface ProviderMonitoringDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  monitoringData?: MonitoringData;
  providerIsActive?: boolean;
  availableRandom?: number | null;
}

export const ProviderMonitoringDisplay: React.FC<ProviderMonitoringDisplayProps> = ({
  isOpen,
  onClose,
  providerId,
  providerName,
  monitoringData,
  providerIsActive = true,
  availableRandom = null
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [providerStatus, setProviderStatus] = useState(availableRandom);
  
  // Add logging when modal opens with monitoring data
  useEffect(() => {
    if (isOpen && monitoringData) {
      console.log('ProviderMonitoringDisplay opened with data:', monitoringData);
    }
  }, [isOpen, monitoringData]);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Helper function to format percentage
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };
  
  // Utility function to format uptime from seconds to a readable format
  const formatUptime = (uptimeSeconds?: number) => {
    if (uptimeSeconds === undefined || uptimeSeconds === null) return 'Unknown';
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Format memory in a readable way
  const formatMemory = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return 'Unknown';
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Format load average
  const formatLoadAvg = (loadAvg?: number[]) => {
    if (!loadAvg || loadAvg.length === 0) return 'Unknown';
    return loadAvg.map(v => v.toFixed(2)).join(', ');
  };
  
  // Format network stats
  const formatNetworkSpeed = (bytesPerSec?: number) => {
    if (bytesPerSec === undefined || bytesPerSec === null) return 'Unknown';
    if (bytesPerSec > 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
    } else if (bytesPerSec > 1024) {
      return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
    }
    return `${bytesPerSec.toFixed(2)} B/s`;
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
  
  // Handle provider status toggle
  const handleUpdateProviderStatus = async (value: number) => {
    setIsUpdatingStatus(true);
    setStatusUpdateSuccess(false);
    try {
      // Call the helper function to update provider status
      const result = await aoHelpers.updateProviderAvalibleRandom(value);
      if (result) {
        setProviderStatus(value);
        setStatusUpdateSuccess(true);
        setTimeout(() => setStatusUpdateSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error updating provider status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  // Get message based on available random value
  const getStatusMessage = () => {
    if (providerStatus === -1) {
      return {
        message: "Provider has been turned off by user",
        action: "Click here to turn back on",
        value: 0,
        className: "provider-status-user-off"
      };
    } else if (providerStatus === -2) {
      return {
        message: "Provider has been turned off by random process",
        subMessage: "Your provider failed to meet requirements. Contact team for more info.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-process-off"
      };
    } else if (providerStatus === -3) {
      return {
        message: "Provider has been turned off by team",
        subMessage: "Contact team if you don't know why.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-team-off"
      };
    } else if (providerStatus === -4) {
      return {
        message: "Provider device has become stale",
        subMessage: "Device is inactive and detached. Can be reactivated.",
        action: "Reactivate device",
        value: 0,
        className: "provider-status-stale"
      };
    } else {
      return {
        message: `Provider is active`,
        subMessage: `${providerStatus !== null ? `Available random values: ${providerStatus}` : ''}`,
        action: "Turn off provider",
        value: -1,
        className: "provider-status-active"
      };
    }
  };

  // If no monitoring data is available
  if (!isOpen) return null;
  
  if (!monitoringData) {
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h2>{providerName || providerId.slice(0, 10) + '...'}</h2>
            <button className="close-button" onClick={onClose}><FiX /></button>
          </div>
          <div className="modal-content">
            <p className="no-data-message">No monitoring data available for this provider.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{providerName || providerId.slice(0, 10) + '...'}</h2>
          <div className="provider-meta">
            <div className="provider-version">v{monitoringData.providerVersion || 'unknown'}</div>
            <div className="provider-timestamp"><FiClock /> {new Date(monitoringData.timestamp || '').toLocaleString()}</div>
          </div>
          <button className="close-button" onClick={onClose}><FiX /></button>
        </div>
        
        <div className="modal-content">
          
          {/* Health Status Section */}
          <div className="detail-section health-status-section">
            <h3><FiActivity /> Health Status</h3>
            <div className="health-status-container">
              <div className={`health-status-indicator ${safeGet<string>(monitoringData, 'health.status', 'unknown')}`}>
                {safeGet<string>(monitoringData, 'health.status', 'unknown') === 'healthy' ? 
                  <FiCheck className="health-icon" /> : 
                  <FiAlertTriangle className="health-icon" />
                }
                <span className="health-status-text">{safeGet(monitoringData, 'health.status', 'Unknown')}</span>
              </div>
              
              <div className="health-metrics">
                <div className="detail-row">
                  <span className="detail-label">Total Errors:</span>
                  <span className="detail-value">{safeGet(monitoringData, 'health.errorTotal', 0)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Errors Last Hour:</span>
                  <span className="detail-value">{safeGet(monitoringData, 'health.errorsLastHour', 0)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Errors Last Day:</span>
                  <span className="detail-value">{safeGet(monitoringData, 'health.errorsLastDay', 0)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* System Specs Section */}
          <div className="detail-section system-specs-section">
            <h3><FiServer /> System Specifications</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Architecture:</span>
                <span className="detail-value">{safeGet(monitoringData, 'systemSpecs.arch', 'Unknown')}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">CPU Count:</span>
                <span className="detail-value">{safeGet(monitoringData, 'systemSpecs.cpuCount', 'Unknown')}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total Memory:</span>
                <span className="detail-value">{formatMemory(safeGet(monitoringData, 'systemSpecs.memoryTotalBytes', undefined))}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Uptime:</span>
                <span className="detail-value">{formatUptime(safeGet(monitoringData, 'systemSpecs.uptime', undefined))}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Token:</span>
                <span className="detail-value">{safeGet(monitoringData, 'systemSpecs.token', 'Unknown')}</span>
              </div>
            </div>
          </div>
          
          {/* Performance Metrics Section */}
          <div className="detail-section performance-section">
            <h3><FiCpu /> Performance Metrics</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Load Average:</span>
                <span className="detail-value">{formatLoadAvg(safeGet(monitoringData, 'performance.loadAverage', undefined))}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Memory Used:</span>
                <span className="detail-value">
                  {safeGet(monitoringData, 'performance.memoryUsedPercent', 'Unknown') !== 'Unknown'
                    ? `${safeGet(monitoringData, 'performance.memoryUsedPercent', 0).toFixed(2)}%`
                    : 'Unknown'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Disk Used:</span>
                <span className="detail-value">
                  {safeGet(monitoringData, 'performance.diskUsedPercent', 'Unknown') !== 'Unknown'
                    ? `${safeGet(monitoringData, 'performance.diskUsedPercent', 0).toFixed(2)}%`
                    : 'Unknown'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Network Receive:</span>
                <span className="detail-value">
                  {formatNetworkSpeed(safeGet(monitoringData, 'performance.network.rx_sec', undefined))}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Network Transmit:</span>
                <span className="detail-value">
                  {formatNetworkSpeed(safeGet(monitoringData, 'performance.network.tx_sec', undefined))}
                </span>
              </div>
            </div>
          </div>
          
          {/* Execution Metrics Section */}
          <div className="detail-section execution-metrics-section">
            <h3><FiHash /> Execution Metrics</h3>
            <div className="detail-grid">
              {safeGet(monitoringData, 'executionMetrics.stepTimingsMs', null) ? (
                <>
                  {Object.entries(safeGet<Record<string, number>>(monitoringData, 'executionMetrics.stepTimingsMs', {})).map(([key, value]) => (
                    <div className="detail-row" key={key}>
                      <span className="detail-label">{key}:</span>
                      <span className="detail-value">
                        {typeof value === 'number' ? `${value.toFixed(2)} ms` : 'N/A'}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="detail-row">
                  <span className="detail-value">No execution metrics available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
