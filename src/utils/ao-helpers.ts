import { ProviderStakingClient, TokenClient, RandomClient, ProviderProfileClient } from 'ao-process-clients';

// Minimum tokens needed to stake for new stakers
export const MINIMUM_STAKE_AMOUNT = '100000000000000000000';
export const TOKEN_DECIMALS = 18;

class AOHelpers {
    private _providerstakingClient: ProviderStakingClient | null = null;
    private _tokenClient: TokenClient | null = null;
    private _randomClient: RandomClient | null = null;
    private _providerProfileClient: ProviderProfileClient | null = null;

    get stakingClient(): ProviderStakingClient {
        if (!this._providerstakingClient) {
            this._providerstakingClient = ProviderStakingClient.autoConfiguration();
        }
        return this._providerstakingClient;
    }

    get tokenClient(): TokenClient {
        if (!this._tokenClient) {
            this._tokenClient = TokenClient.autoConfiguration();
        }
        return this._tokenClient;
    }

    get randomClient(): RandomClient {
        if (!this._randomClient) {
            this._randomClient = RandomClient.autoConfiguration();
        }
        return this._randomClient;
    }

    get providerProfileClient(): ProviderProfileClient {
        if (!this._providerProfileClient) {
            this._providerProfileClient = ProviderProfileClient.autoConfiguration();
        }
        return this._providerProfileClient;
    }

    // Get open random requests for a provider
    async getOpenRandomRequests(providerId?: string): Promise<any> {
        try {
            const reply = await this.randomClient.getOpenRandomRequests(providerId||"")
            return reply;
            // const tags = [{ name: "Action", value: "Get-Open-Random-Requests" }];
            // const data = JSON.stringify({ providerId: providerId || await this.stakingClient.getCallingWalletAddress() });
            // const result = await this.stakingClient.dryrun(data, tags);
            // const info = this.stakingClient.getFirstMessageDataJson(result);
            
            // console.log('Open random requests response:', {
            //     providerId: info.providerId,
            //     challengeRequestsCount: info.activeChallengeRequests?.request_ids?.length || 0,
            //     outputRequestsCount: info.activeOutputRequests?.request_ids?.length || 0
            // });
            // return info;
        } catch (error) {
            console.error('Error getting open random requests:', error);
            throw error;
        }
    }

    // Get wallet token balance
    async getWalletBalance(walletAddress: string): Promise<string> {
        try {
            return await this.tokenClient.balance(walletAddress);
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            throw error;
        }
    }

    // Update provider details
    async updateProviderDetails(details: {
        name: string;
        delegationFee: string;
        description?: string;
        twitter?: string;
        discord?: string;
        telegram?: string;
        domain?: string;
    }): Promise<any> {
        try {
            return await this.stakingClient.updateDetails({
                name: details.name,
                commission: parseFloat(details.delegationFee),
                description: details.description || '',
                twitter: details.twitter || '',
                discord: details.discord || '',
                telegram: details.telegram || '',
                domain: details.domain || ''
            });
        } catch (error) {
            console.error('Error updating provider details:', error);
            throw error;
        }
    }

    // Stake tokens
    async stakeTokens(amount: string, providerDetails?: {
        name: string;
        delegationFee: string;
        description?: string;
        twitter?: string;
        discord?: string;
        telegram?: string;
        domain?: string;
    }): Promise<any> {
        try {
            return providerDetails ?
                await this.stakingClient.stake(amount, {
                    name: providerDetails.name,
                    commission: parseFloat(providerDetails.delegationFee),
                    description: providerDetails.description || '',
                    twitter: providerDetails.twitter || '',
                    discord: providerDetails.discord || '',
                    telegram: providerDetails.telegram || '',
                    domain: providerDetails.domain || ''
                }) :
                await this.stakingClient.stake(amount);
        } catch (error) {
            console.error('Error staking tokens:', error);
            throw error;
        }
    }

    // Get information for all providers
    async getAllProvidersInfo(): Promise<any> {
        try {
            console.log(await this.providerProfileClient.getAllProvidersInfo())
            return await this.providerProfileClient.getAllProvidersInfo()
            // console.log('Fetching all providers info');
            // const tags = [{ name: "Action", value: "Get-All-Providers-Details" }];
            // const result = await this.stakingClient.dryrun("", tags);
            // return this.stakingClient.getFirstMessageDataJson(result);
        } catch (error) {
            console.error('Error getting all providers info:', error);
            throw error;
        }
    }

    // Get information for a specific provider
    async getProviderInfo(providerId?: string): Promise<any> {
        try {
            console.log(`Fetching info for provider: ${providerId || 'current user'}`);
            const tags = [{ name: "Action", value: "Get-Provider-Details" }];
            const data = JSON.stringify({ providerId: providerId || await this.stakingClient.getCallingWalletAddress() });
            const result = await this.stakingClient.dryrun(data, tags);
            return this.stakingClient.getFirstMessageDataJson(result);
        } catch (error) {
            console.error('Error getting provider info:', error);
            throw error;
        }
    }

    // Unstake tokens
    async unstakeTokens(providerId: string): Promise<any> {
        try {
            return await this.stakingClient.unstake(providerId);
        } catch (error) {
            console.error('Error unstaking tokens:', error);
            throw error;
        }
    }
}

export const aoHelpers = new AOHelpers();
