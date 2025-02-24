import { ProviderStakingClient, TokenClient, RandomClient, ProviderProfileClient, GetOpenRandomRequestsResponse, RaffleClient, ViewPullsResponse, ProviderDetails, ViewEntrantsResponse, ViewRaffleOwnersResponse } from 'ao-process-clients';
import { Tags } from 'ao-process-clients/dist/src/core';

// Minimum tokens needed to stake for new stakers
export const MINIMUM_STAKE_AMOUNT = '100000000000000000000';
export const TOKEN_DECIMALS = 18;
export const RAFFLEPROCESS ="0zuEwuXXnNBPQ6u-eUTGfMkKbSy1zeHKfxbiocvD_y0"




interface ProviderDetailsInput {
    name: string;
    delegationFee: string;
    description?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
    domain?: string;
}

class AOHelpers {
    private _providerstakingClient: ProviderStakingClient | null = null;
    private _tokenClient: TokenClient | null = null;
    private _randomClient: RandomClient | null = null;
    private _providerProfileClient: ProviderProfileClient | null = null;
    private _randomRaffleClient: RaffleClient | null = null;

    async getStakingClient(): Promise<ProviderStakingClient> {
        if (!this._providerstakingClient) {
            this._providerstakingClient =  ProviderStakingClient.autoConfiguration();
        }
        return this._providerstakingClient;
    }

    async getTokenClient(): Promise<TokenClient> {
        if (!this._tokenClient) {
            this._tokenClient =  TokenClient.autoConfiguration();
        }
        return this._tokenClient;
    }

    async getRandomClient(): Promise<RandomClient> {
        if (!this._randomClient) {
            this._randomClient = await RandomClient.autoConfiguration();
        }
        return this._randomClient;
    }

    async getProviderProfileClient(): Promise<ProviderProfileClient> {
        if (!this._providerProfileClient) {
            this._providerProfileClient =  ProviderProfileClient.autoConfiguration();
        }
        return this._providerProfileClient;
    }

    async getRandomRaffleClient(): Promise<RaffleClient> {
        if (!this._randomRaffleClient) {
            this._randomRaffleClient =  RaffleClient.autoConfiguration();
        }
        return this._randomRaffleClient;
    }

    // Get open random requests for a provider
    async getOpenRandomRequests(providerId?: string): Promise<GetOpenRandomRequestsResponse> {
        try {
            const client = await this.getRandomClient();
            return await client.getOpenRandomRequests(providerId || "");
        } catch (error) {
            console.error('Error getting open random requests:', error);
            throw error;
        }
    }

    // Get wallet token balance
    async getWalletBalance(walletAddress: string): Promise<string> {
        try {
            const client = await this.getTokenClient();
            return await client.balance(walletAddress);
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            throw error;
        }
    }

    // Update provider details
    async updateProviderDetails(details: ProviderDetailsInput): Promise<boolean> {
        try {
            const client = await this.getStakingClient();
            const tags: ProviderDetails = {
                name:  details.name,
                commission: parseInt(details.delegationFee || '0'),
                description: details.description || '' ,
                twitter: details.twitter || '' ,
                discord: details.discord || '' ,
                telegram: details.telegram || '' ,
                domain : details.domain || '' 
        };
            // Use stake with 0 amount to update details
            return await client.stakeWithDetails("0", tags);
        } catch (error) {
            console.error('Error updating provider details:', error);
            throw error;
        }
    }

    // Stake tokens
    async stakeTokens(amount: string, providerDetails?: ProviderDetailsInput): Promise<boolean> {
        try {
            const client = await this.getStakingClient();
            if (providerDetails) {
                const tags: Tags = [
                    { name: "Name", value: providerDetails.name },
                    { name: "Commission", value: providerDetails.delegationFee },
                    { name: "Description", value: providerDetails.description || '' },
                    { name: "Twitter", value: providerDetails.twitter || '' },
                    { name: "Discord", value: providerDetails.discord || '' },
                    { name: "Telegram", value: providerDetails.telegram || '' },
                    { name: "Domain", value: providerDetails.domain || '' }
                ];
                return await client.stake(amount, tags);
            }
            return await client.stake(amount);
        } catch (error) {
            console.error('Error staking tokens:', error);
            throw error;
        }
    }

    // Get information for all providers
    async getAllProvidersInfo(): Promise<any> {
        try {
            const client = await this.getProviderProfileClient();
            return await client.getAllProvidersInfo();
        } catch (error) {
            console.error('Error getting all providers info:', error);
            throw error;
        }
    }

    // Get information for a specific provider
    async getProviderInfo(providerId?: string): Promise<any> {
        try {
            console.log(`Fetching info for provider: ${providerId || 'current user'}`);
            const client = await this.getProviderProfileClient();
            return await client.getProviderInfo(providerId);
        } catch (error) {
            console.error('Error getting provider info:', error);
            throw error;
        }
    }

        // Get information for a specific provider
        async getProviderAvalibleRandom(providerId?: string): Promise<any> {
            try {
                console.log(`Fetching info for provider: ${providerId || 'current user'}`);
                const client = await this.getRandomClient();
                return (await client.getProviderAvailableValues(providerId||"")).availibleRandomValues;
            } catch (error) {
                console.error('Error getting provider info:', error);
                throw error;
            }
        }

    // Unstake tokens
    async unstakeTokens(providerId: string): Promise<boolean> {
        try {
            const client = await this.getStakingClient();
            return await client.unstake(providerId);
        } catch (error) {
            console.error('Error unstaking tokens:', error);
            throw error;
        }
    }

    // Update raffle entry list
    async setRaffleEntrants(entrants: string[],): Promise<boolean> {
        try {
            return (await this.getRandomRaffleClient()).setRaffleEntrants(entrants)
        } catch (error) {
            console.error('Error updating raffle list:', error);
            throw error;
        }
    }

        // Update raffle entry list
        async viewEntrants(userId: string): Promise<ViewEntrantsResponse> {
            try {
                return (await this.getRandomRaffleClient()).viewEntrants(userId)
            } catch (error) {
                console.error('Error updating raffle list:', error);
                throw error;
            }
        }

    // Pull raffle winner
    async pullRaffle(): Promise<boolean> {
        try {
            return (await this.getRandomRaffleClient()).pullRaffle()
        } catch (error) {
            console.error('Error pulling raffle:', error);
            throw error;
        }
    }

        // Pull raffle winner
        async viewUserPulls(userId:string): Promise<ViewPullsResponse> {
            try {
                return (await this.getRandomRaffleClient()).viewUserPulls(userId)
            } catch (error) {
                console.error('Error checking raffle pulls:', error);
                throw error;
            }
            }

                    // Pull raffle winner
        async viewRaffleOwners(): Promise<ViewRaffleOwnersResponse> {
            try {
                return (await this.getRandomRaffleClient()).viewRaffleOwners()
            } catch (error) {
                console.error('Error checking raffle pulls:', error);
                throw error;
            }
            }
            
}

export const aoHelpers = new AOHelpers();
