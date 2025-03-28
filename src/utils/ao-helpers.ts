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
    IRandAOService,
    Logger,
    LogLevel,
    BaseClientConfigBuilder
} from 'ao-process-clients';
import { RNG_TOKEN_PROCESS_ID } from 'ao-process-clients/dist/src/processes_ids';

// Minimum tokens needed to stake for new stakers
export const MINIMUM_STAKE_AMOUNT = '100000000000000000000';
export const TOKEN_DECIMALS = 18;
export const RAFFLEPROCESS = "0zuEwuXXnNBPQ6u-eUTGfMkKbSy1zeHKfxbiocvD_y0";
// Logger.setLogLevel(LogLevel.DEBUG)
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
        this._tokenClient = new TokenClient(new BaseClientConfigBuilder().withProcessId(RNG_TOKEN_PROCESS_ID).build());
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
    private _providersPromise: Promise<ProviderInfoAggregate[]> | null = null;
    private readonly CACHE_LIFETIME_MS = 300000; // 5 minutes cache lifetime
    
    /**
     * Get all provider information in one call with promise memoization and caching.
     * This is the primary method for getting provider data - use this whenever possible.
     * - Returns cached data if available and not expired
     * - Returns the same promise for concurrent calls to avoid duplicate queries
     * - Caches the result for future calls
     */
    async getAllProvidersInfo(): Promise<ProviderInfoAggregate[]> {
        try {
            // Check if we have a valid cache
            const now = Date.now();
            if (this._providersCache && (now - this._providersCacheTimestamp) < this.CACHE_LIFETIME_MS) {
                console.log('Using cached provider information');
                return this._providersCache;
            }
            
            // If there's an in-flight request, return that promise instead of starting a new one
            if (this._providersPromise) {
                console.log('Joining existing provider information request');
                return this._providersPromise;
            }
            
            console.log('Fetching fresh provider information');
            
            // Create and store the promise
            this._providersPromise = (async () => {
                try {
                    const service = await this.getRandAOService();
                    const providers = await service.getAllProviderInfo();
                    console.log(providers);
                    
                    // Update cache
                    this._providersCache = providers;
                    this._providersCacheTimestamp = now;
                    
                    return providers;
                } finally {
                    // Clear the promise reference when done (success or failure)
                    // This allows a retry on the next call if this one failed
                    this._providersPromise = null;
                }
            })();
            
            // Return the promise
            return this._providersPromise;
        } catch (error) {
            console.error('Error getting all provider info:', error);
            throw error;
        }
    }
    
    // /**
    //  * Legacy compatibility method - maps the new format to the old format.
    //  * Internal implementation uses the cached data to avoid additional API calls.
    //  */
    // async getAllProvidersInfo(): Promise<ProviderInfoAggregate[]> {
    //     try {
    //      return await this.getAllProviderInfo();
    //     } catch (error) {
    //         console.error('Error in backward compatibility getAllProvidersInfo:', error);
    //         throw error;
    //     }
    // }
    
    /**
     * Legacy compatibility method - gets a single provider's info.
     * Uses the cached data from getAllProvidersInfo when possible to avoid additional API calls.
     */
    async getProviderInfo(providerId: string): Promise<ProviderInfoAggregate> {
        console.log(`Getting provider info for: ${providerId}`);
        
        try {
            // First try to find the provider in the cached data
            const allProviders = await this.getAllProvidersInfo();
            const provider = allProviders.find(p => p.providerId === providerId);
            
            if (provider) {
                console.log('Provider found in cached data');
                return provider;
            }
            
            // If not found in cache, fall back to direct API call
            console.log('Provider not found in cache, making direct API call');
            const service = await this.getRandAOService();
            const returnvalue = await service.getAllInfoForProvider(providerId);
            return returnvalue;
        } catch (error) {
            console.error('Error in getProviderInfo:', error);
            throw error;
        }
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

        // Update provider details
        async updateProviderAvalibleRandom(amount:number): Promise<boolean> {
            try {
                const client = await this.getRandomClient();
                return await client.updateProviderAvailableValues(amount)
            } catch (error) {
                console.error('Error updating provider avalible values:', error);
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
