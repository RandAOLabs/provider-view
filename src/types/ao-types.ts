import { ProviderInfo } from 'ao-js-sdk';

// Extend the interfaces to include additional fields we need
declare module 'ao-js-sdk' {
  interface ProviderInfo {
    provider_extra_data?: string;
  }
  
  interface ProviderActivity {
    provider_info?: string; // Contains the JSON stringified monitoring data
  }
}
