import { 
    ProviderStakingClient, 
    TokenClient, 
    RandomClient, 
    ProviderProfileClient, 
    GetOpenRandomRequestsResponse, 
    RaffleClient, 
    ViewPullsResponse, 
    ViewEntrantsResponse, 
    ViewRaffleOwnersResponse, 
    RandAOService, 
    ProviderInfoAggregate, 
    IRandAOService
} from 'ao-process-clients';

// Minimum tokens needed to stake for new stakers
export const MINIMUM_STAKE_AMOUNT = '100000000000000000000';
export const TOKEN_DECIMALS = 18;
export const RAFFLEPROCESS = "0zuEwuXXnNBPQ6u-eUTGfMkKbSy1zeHKfxbiocvD_y0";

export interface ProviderDetailsInput {
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
    private _randAOService: IRandAOService | null = null;

    // Use a unified approach for client initialization to handle possible inconsistencies
    private async initializeClient<T>(
        clientRef: T | null, 
        ClientClass: any, 
        methodName: string = 'autoConfiguration'
    ): Promise<T> {
        if (!clientRef) {
            try {
                // Try to use the static method if it exists
                if (typeof ClientClass[methodName] === 'function') {
                    return await ClientClass[methodName]();
                } else {
                    // Fallback to constructor if the static method doesn't exist
                    return new ClientClass();
                }
            } catch (error) {
                console.error(`Error initializing client with ${methodName}:`, error);
                // Last resort fallback
                return new ClientClass();
            }
        }
        return clientRef as T;
    }

    async getStakingClient(): Promise<ProviderStakingClient> {
        this._providerstakingClient = await this.initializeClient<ProviderStakingClient>(
            this._providerstakingClient,
            ProviderStakingClient
        );
        return this._providerstakingClient;
    }

    async getTokenClient(): Promise<TokenClient> {
        this._tokenClient = await this.initializeClient<TokenClient>(
            this._tokenClient,
            TokenClient
        );
        return this._tokenClient;
    }

    async getRandomClient(): Promise<RandomClient> {
        this._randomClient = await this.initializeClient<RandomClient>(
            this._randomClient,
            RandomClient
        );
        return this._randomClient;
    }

    async getProviderProfileClient(): Promise<ProviderProfileClient> {
        this._providerProfileClient = await this.initializeClient<ProviderProfileClient>(
            this._providerProfileClient,
            ProviderProfileClient
        );
        return this._providerProfileClient;
    }

    async getRandomRaffleClient(): Promise<RaffleClient> {
        this._randomRaffleClient = await this.initializeClient<RaffleClient>(
            this._randomRaffleClient,
            RaffleClient
        );
        return this._randomRaffleClient;
    }

    async getRandAOService(): Promise<IRandAOService> {
        if (!this._randAOService) {
            this._randAOService = await RandAOService.autoConfiguration()
        }
        return this._randAOService;
    }

    // Cache for getAllProviderInfo to prevent redundant API calls
    private _providersCache: ProviderInfoAggregate[] | null = null;
    private _providersCacheTimestamp: number = 0;
    private readonly CACHE_LIFETIME_MS = 30000; // 30 seconds cache lifetime
    
    /**
     * Get all provider information in one call with caching.
     * This is the primary method for getting provider data - use this whenever possible.
     */
    async getAllProviderInfo(): Promise<ProviderInfoAggregate[]> {
        try {
            // Check if we have a valid cache
            const now = Date.now();
            if (this._providersCache && (now - this._providersCacheTimestamp) < this.CACHE_LIFETIME_MS) {
                console.log('Using cached provider information');
                return this._providersCache;
            }
            
            console.log('Fetching fresh provider information');
            const service = await this.getRandAOService();
            const providers = await service.getAllProviderInfo();
            console.log(providers)
            
            // Update cache
            this._providersCache = providers;
            this._providersCacheTimestamp = now;
            
            return providers;
        } catch (error) {
            console.error('Error getting all provider info:', error);
            throw error;
        }
    }
    
    /**
     * Get a single provider's information from the cache.
     * This doesn't make a new API call - it uses the cached data from getAllProviderInfo.
     */
    getProviderFromCache(providerId: string): ProviderInfoAggregate | undefined {
        if (!this._providersCache) {
            console.warn('Cache is empty, cannot get provider from cache');
            return undefined;
        }
        
        return this._providersCache.find(p => p.providerId === providerId);
    }
    
    /**
     * Legacy compatibility method - maps the new format to the old format.
     * Internal implementation uses the cached data to avoid additional API calls.
     */
    async getAllProvidersInfo(): Promise<any[]> {
        try {
            // Use the cached data from getAllProviderInfo
            const aggregateInfo = await this.getAllProviderInfo();
            
            // Map the new format to the old format for backward compatibility
            return aggregateInfo.map(provider => this.convertToLegacyFormat(provider));
        } catch (error) {
            console.error('Error in backward compatibility getAllProvidersInfo:', error);
            throw error;
        }
    }
    
    /**
     * Legacy compatibility method - gets a single provider's info in the old format.
     * Internal implementation uses the cached data to avoid additional API calls.
     */
    async getProviderInfo(providerId?: string): Promise<any> {
        if (!providerId) {
            return null;
        }
        
        // First try to get from cache
        const cachedProviders = this._providersCache;
        let provider: ProviderInfoAggregate | undefined;
        
        if (cachedProviders) {
            // Use the cached data if available
            provider = cachedProviders.find(p => p.providerId === providerId);
        } else {
            // If not in cache, fetch all providers (which will update the cache)
            const allProviders = await this.getAllProviderInfo();
            provider = allProviders.find(p => p.providerId === providerId);
        }
        
        if (!provider) {
            return null;
        }
        
        // Convert to legacy format
        return this.convertToLegacyFormat(provider);
    }
    
    /**
     * Helper method to convert a ProviderInfoAggregate to the legacy format.
     * This is used by both getAllProvidersInfo and getProviderInfo for consistency.
     */
    private convertToLegacyFormat(provider: ProviderInfoAggregate): any {
        // Ensure we have the data structures needed
        const providerInfo = provider.providerInfo || {} as any;
        
        // Handle the case where provider_details might be a string or an object
        let providerDetails: any = providerInfo.provider_details;
        if (typeof providerDetails === 'string') {
            try {
                providerDetails = JSON.parse(providerDetails);
            } catch (e) {
                providerDetails = {};
            }
        }
        
        return {
            provider_id: provider.providerId,
            provider_details: {
                stake: providerInfo.stake || { amount: "0" },
                provider_details: providerDetails || {},
                created_at: providerInfo.created_at || Date.now(),
                provider_id: provider.providerId
            },
            stake: providerInfo.stake || { amount: "0" },
            created_at: providerInfo.created_at || Date.now(),
            active: (providerInfo as any)?.active ? 1 : 0,
            random_balance: (provider.providerActivity as any)?.available || 0
        };
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
    async updateProviderDetails(details: ProviderDetailsInput): Promise<string> {
        try {
            const client = await this.getProviderProfileClient();
            return await client.updateDetails(details);
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
                return await client.stakeWithDetails(amount, providerDetails);
            }
            return await client.stake(amount);
        } catch (error) {
            console.error('Error staking tokens:', error);
            throw error;
        }
    }


        // Get information for a specific provider
        private async retryOperation<T>(
            operation: () => Promise<T>,
            maxRetries: number = 3,
            baseDelay: number = 1000,
            context: string = ''
        ): Promise<T> {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await operation();
                } catch (error) {
                    const isLastAttempt = attempt === maxRetries;
                    const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff

                    if (error instanceof Error && 
                        (error.message.includes('CORS') || 
                         error.message.includes('Failed to fetch') ||
                         error.message.includes('Network Error'))) {
                        console.warn(`Attempt ${attempt}/${maxRetries} failed for ${context}: Network/CORS error`);
                    } else {
                        console.error(`Attempt ${attempt}/${maxRetries} failed for ${context}:`, error);
                    }

                    if (isLastAttempt) {
                        throw error;
                    }

                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            throw new Error(`Failed after ${maxRetries} attempts`);
        }

        async getProviderAvalibleRandom(providerId?: string): Promise<any> {
            try {
                console.log(`Fetching info for provider: ${providerId || 'current user'}`);
                const client = await this.getRandomClient();
                
                return await this.retryOperation(
                    async () => {
                        try {
                            const result = await client.getProviderAvailableValues(providerId||"");
                            return result.availibleRandomValues;
                        } catch (error) {
                            // If we get a CORS error or network error on the last retry, return 0
                            if (error instanceof Error && 
                                (error.message.includes('CORS') || 
                                 error.message.includes('Failed to fetch') ||
                                 error.message.includes('Network Error'))) {
                                return 0;
                            }
                            throw error;
                        }
                    },
                    3,
                    1000,
                    `getProviderAvalibleRandom for ${providerId}`
                );
            } catch (error) {
                console.error('Error getting provider info:', error);
                return 0;
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
            console.log(userId)
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
