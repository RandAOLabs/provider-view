import { MonitoringData } from 'ao-process-clients';

// Legacy interface (kept for backward compatibility)
export interface LegacyProviderMonitoringData {
  providerVersion: string;
  
  systemSpecs: {
    platform: string;
    release: string;
    arch: string;
    cpuCount: number;
    memoryTotalBytes: number;
    token: string;
  };
  
  performance: {
    loadAverage: number[];
    memoryUsedPercent: number;
    diskUsedPercent: number;
    network: {
      rxBytes: number;
      txBytes: number;
      rxPackets: number;
      txPackets: number;
    };
  };
  
  executionMetrics: {
    stepTimingsMs: {
      step1: number;
      step2: number;
      step3: number;
      step4: number;
      overall: number;
    };
  };
  
  health: {
    errors: number;
    status: string;
  };
}

// Using the official MonitoringData type from ao-process-clients
export type ProviderMonitoringData = MonitoringData;
