import { ProviderInfo } from 'ao-js-sdk';
// TODO clean up and remove
// Extend the interfaces to include additional fields we need
declare module 'ao-js-sdk' {
  interface ProviderInfo {
    provider_extra_data?: string;
  }
  
  interface ProviderActivity {
    provider_info?: string; // Contains the JSON stringified monitoring data
    owner?: string; // The owning address of the provider
  }
}
