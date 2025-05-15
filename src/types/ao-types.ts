import { ProviderInfo } from 'ao-process-clients';

// Extend the interfaces to include additional fields we need
declare module 'ao-process-clients' {
  interface ProviderInfo {
    provider_extra_data?: string;
  }
  
  interface ProviderActivity {
    provider_info?: string; // Contains the JSON stringified monitoring data
  }
}
