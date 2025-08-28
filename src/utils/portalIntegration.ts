export interface WalletJson {
  address: string;
  privateKey: string;
}

export interface PortalConfig {
  seed_phrase: string;
  provider_id: string;
  wallet_json: string;
}

export interface PortalStatus {
  seedPhrase: boolean;
  providerId: boolean;
  walletJson: boolean;
}

export default class PortalIntegration {
  private baseUrl: string;
  private statusCallbacks: ((status: PortalStatus) => void)[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Set all configuration at once
  async setAllConfig(config: PortalConfig): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/set-all-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to set all config: ${response.status}`);
      }

      this.notifyStatusChange();
    } catch (error) {
      console.error('Error setting all config:', error);
      throw error;
    }
  }

  // Set seed phrase individually
  async setSeedPhrase(seedPhrase: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/set-seed-phrase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seedPhrase }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set seed phrase: ${response.status}`);
      }

      this.notifyStatusChange();
    } catch (error) {
      console.error('Error setting seed phrase:', error);
      throw error;
    }
  }

  // Set provider ID individually
  async setProviderId(providerId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/set-provider-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set provider ID: ${response.status}`);
      }

      this.notifyStatusChange();
    } catch (error) {
      console.error('Error setting provider ID:', error);
      throw error;
    }
  }

  // Set wallet JSON individually
  async setWalletJson(walletJson: WalletJson): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/set-wallet-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletJson }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set wallet JSON: ${response.status}`);
      }

      this.notifyStatusChange();
    } catch (error) {
      console.error('Error setting wallet JSON:', error);
      throw error;
    }
  }

  // Get current status
  async getStatus(): Promise<PortalStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      
      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting status:', error);
      return { seedPhrase: false, providerId: false, walletJson: false };
    }
  }

  // Check if all values are ready
  async isReady(): Promise<boolean> {
    const status = await this.getStatus();
    return status.seedPhrase && status.providerId && status.walletJson;
  }

  // Register status change callback
  onStatusChange(callback: (status: PortalStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  // Remove status change callback
  offStatusChange(callback: (status: PortalStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  // Notify all callbacks of status change
  private async notifyStatusChange(): Promise<void> {
    const status = await this.getStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }
}
