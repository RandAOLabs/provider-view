import { StakingClient, TokenClient, RandomClient } from 'ao-process-clients'

// Minimum tokens needed to stake for new stakers
export const MINIMUM_STAKE_AMOUNT = '100000000000000000000'
export const Token_decimals = '18'

// List of provider IDs
export const PROVIDER_IDS = [
    "XUo8jZtUDBFLtp5okR12oLrqIZ4ewNlTpqnqmriihJE",
    "c8Iq4yunDnsJWGSz_wYwQU--O9qeODKHiRdUkQkW2p8",
    "Sr3HVH0Nh6iZzbORLpoQFOEvmsuKjXsHswSWH760KAk",
    "1zlA7nKecUGevGNAEbjim_SlbioOI6daNNn2luDEHb0"
];

class AOHelpers {
    constructor() {
        this._stakingClient = null;
        this._tokenClient = null;
        this._randomClient = null;
    }

    get stakingClient() {
        if (!this._stakingClient) {
            this._stakingClient = StakingClient.autoConfiguration();
        }
        return this._stakingClient;
    }

    get tokenClient() {
        if (!this._tokenClient) {
            this._tokenClient = TokenClient.autoConfiguration();
        }
        return this._tokenClient;
    }

    get randomClient() {
        if (!this._randomClient) {
            this._randomClient = RandomClient.autoConfiguration();
        }
        return this._randomClient;
    }

    // Get open random requests for a provider
    async getOpenRandomRequests(providerId) {
        try {
            console.log(`Fetching open random requests for provider: ${providerId}`);
            const response = await this.randomClient.getOpenRandomRequests(providerId);
            console.log('Open random requests response:', {
                providerId: response.providerId,
                challengeRequestsCount: response.activeChallengeRequests?.request_ids?.length || 0,
                outputRequestsCount: response.activeOutputRequests?.request_ids?.length || 0
            });
            if (!response.activeChallengeRequests || !response.activeOutputRequests) {
                console.warn('Response missing expected structure:', response);
            }
            return response;
        } catch (error) {
            console.error('Error getting open random requests:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                providerId
            });
            throw error;
        }
    }

    // Get wallet token balance
    async getWalletBalance(walletAddress) {
        try {
            const balance = await this.tokenClient.balance(walletAddress);
            return balance;
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            throw error;
        }
    }

    // Update provider details
    async updateProviderDetails(details) {
        try {
            const result = await this.stakingClient.updateDetails({
                name: details.name,
                commission: parseFloat(details.delegationFee),
                description: details.description || '',
                twitter: details.twitter || '',
                discord: details.discord || '',
                telegram: details.telegram || '',
                domain: details.domain || ''
            });
            return result;
        } catch (error) {
            console.error('Error updating provider details:', error);
            throw error;
        }
    }

    // Stake tokens
    async stakeTokens(amount, providerDetails = null) {
        try {
            if (providerDetails) {
                const result = await this.stakingClient.stake(amount, {
                    name: providerDetails.name,
                    commission: parseFloat(providerDetails.delegationFee),
                    description: providerDetails.description || '',
                    twitter: providerDetails.twitter || '',
                    discord: providerDetails.discord || '',
                    telegram: providerDetails.telegram || '',
                    domain: providerDetails.domain || ''
                });
                return result;
            } else {
                const result = await this.stakingClient.stake(amount);
                return result;
            }
        } catch (error) {
            console.error('Error staking tokens:', error);
            throw error;
        }
    }

    // Get information for all providers
    async getAllProvidersInfo() {
        try {
            console.log('Fetching all providers info');
            const tags = [{ name: "Action", value: "Get-All-Providers-Details" }];
            const result = await this.stakingClient.dryrun("", tags);
            const providers = this.stakingClient.getFirstMessageDataJson(result);
            console.log('All providers info:', providers);
            return providers;
        } catch (error) {
            console.error('Error getting all providers info:', error);
            throw error;
        }
    }

    // Get information for a specific provider
    async getProviderInfo(providerId) {
        try {
            console.log(`Fetching info for provider: ${providerId || 'current user'}`);
            const tags = [{ name: "Action", value: "Get-Provider-Details" }];
            const data = JSON.stringify({ providerId: providerId || await this.stakingClient.getCallingWalletAddress() });
            const result = await this.stakingClient.dryrun(data, tags);
            const info = this.stakingClient.getFirstMessageDataJson(result);
            console.log('Provider info:', info);
            return info;
        } catch (error) {
            console.error('Error getting provider info:', error);
            throw error;
        }
    }

    // Unstake tokens
    async unstakeTokens(providerId) {
        try {
            const result = await this.stakingClient.unstake(providerId);
            return result;
        } catch (error) {
            console.error('Error unstaking tokens:', error);
            throw error;
        }
    }
}

export const aoHelpers = new AOHelpers();
