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
    BaseClientConfigBuilder,
    ProviderActivity,
} from 'ao-js-sdk';
import { connect, createDataItemSigner, dryrun, message } from "@permaweb/aoconnect";

// Minimum tokens needed to stake for new stakers - 10000 tokens with 9 decimals
export const MINIMUM_STAKE_AMOUNT = '10000000000000';
export const TOKEN_DECIMALS = 9;
export const RAFFLEPROCESS = "0zuEwuXXnNBPQ6u-eUTGfMkKbSy1zeHKfxbiocvD_y0";
// Logger.setLogLevel(LogLevel.DEBUG)
export interface ProviderDetailsInput {
    name: string;
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
    private _redemptionClient: any | null = null;

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
        this._tokenClient = new TokenClient(new BaseClientConfigBuilder()
        .withProcessId("rPpsRk9Rm8_SJ1JF8m9_zjTalkv9Soaa_5U0tYUloeY")
        .build())
        // .withAOConfig({
        //     CU_URL: "https://cu.randao.net", // Primary CU
        //    MU_URL: "https://mu.randao.net", 
        //     MODE: 'legacy'
        // }).build());
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

    async getRedemptionClient(): Promise<any> {
        if (!this._redemptionClient) {
            // Try to dynamically import RedemptionClient
            try {
                const aoSdk = await import('ao-js-sdk');
                const RedemptionClient = (aoSdk as any).RedemptionClient;
                
                if (!RedemptionClient) {
                    throw new Error('RedemptionClient not found in ao-js-sdk');
                }
                
                this._redemptionClient = await this.initializeClient<any>(
                    this._redemptionClient,
                    RedemptionClient
                );
            } catch (error) {
                console.error('RedemptionClient not available in ao-js-sdk:', error);
                throw new Error('RedemptionClient is not available in the current ao-js-sdk version. Please update ao-js-sdk to use token redemption.');
            }
        }
        return this._redemptionClient;
    }

    // Cache for getAllProviderInfo to prevent redundant API calls
    private _providersCache: ProviderInfoAggregate[] | null = null;
    private _providersCacheTimestamp: number = 0;
    private _providersPromise: Promise<ProviderInfoAggregate[]> | null = null;
    private readonly CACHE_LIFETIME_MS = 300000; // 5 minutes cache lifetime
    


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
        async updateProviderAvalibleRandom(amount: number, providerId?: string): Promise<boolean> {
            try {
                const client = await this.getRandomClient();
                return await client.updateProviderAvailableValues(amount, providerId)
            } catch (error) {
                console.error('Error updating provider avalible values:', error);
                throw error;
            }
        }

    // Stake tokens with optional actorId
    async stakeTokens(amount: string, providerDetails?: ProviderDetailsInput, actorId?: string): Promise<boolean> {
        try {
            const client = await this.getStakingClient();
            if (providerDetails) {
                // Pass actorId to stakeWithDetails if provided
                return await client.stakeWithDetails(amount, providerDetails, actorId);
            }
            // Use new stake method signature with actorId parameter
            if (actorId) {
                return await (client as any).stake(amount, undefined, actorId);
            }
            return await client.stake(amount);
        } catch (error) {
            console.error('Error staking tokens:', error);
            throw error;
        }
    }

    // Stake with details and optional actorId
    async stakeWithDetails(quantity: string, providerDetails?: ProviderDetailsInput, actorId?: string): Promise<boolean> {
        try {
            const client = await this.getStakingClient();
            return await client.stakeWithDetails(quantity, providerDetails, actorId);
        } catch (error) {
            console.error('Error staking with details:', error);
            throw error;
        }
    }

    // Update provider actor
    async updateProviderActor(providerId: string, actorId: string): Promise<boolean> {
        try {
            const client = await this.getStakingClient();
            return await (client as any).updateProviderActor(providerId, actorId);
        } catch (error) {
            console.error('Error updating provider actor:', error);
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

    /**
     * TODO put this in the client sdk so it not a raw call here
     * Reinitialize a provider by sending a message to the RandAO process
     * Only providers with value -2 can be reinitialized and will be set to 0
     * @param providerId The provider ID to reinitialize
     * @param wallet The wallet to use for signing
     * @param providerInfo Provider info from context - required since getProviderInfo is no longer available
     * @returns The message ID
     */
    async reinitProvider(providerId: string, wallet: any, providerInfo: ProviderInfoAggregate): Promise<string> {
        try {
            // We now require provider data to be passed from the ProviderContext
            if (!providerInfo) {
                throw new Error('Provider information is required for reinitialization');
            }
            
            const randClient = await this.getRandomClient();
            const processId = await randClient.getProcessId();
            const randomBalance = providerInfo?.providerActivity?.random_balance;
            const targetValue = providerInfo?.providerActivity?.random_balance; // Get the target value from the provider activity
            
            // Only check for -2 if we're doing a reinitialization (target = 0)
            if (targetValue === 0 && randomBalance !== -2) {
                throw new Error(`Provider ${providerId} has a value of ${randomBalance} which is not eligible for reinitialization. Only providers with value -2 can be reinitialized.`);
            }
            
            // Use connect with the proper RandAO URLs to ensure we're hitting the right endpoint
            const { message: configuredMessage } = connect({
                MU_URL: "https://ur-mu.randao.net",
                CU_URL: "https://ur-cu.randao.net",
                GATEWAY_URL: "https://arweave.net",
                MODE: "legacy"
            });
            
            // Set the target value based on the provider's current random_balance
            let tags = [
                { name: "Action", value: "Reinitialize-Provider" },
                { name: "ProviderId", value: providerId },
                { name: "Target-Value", value: "0" },
            ];

            let id = await configuredMessage({
                process: processId,
                tags,
                signer: createDataItemSigner(wallet),
            });
            
            return id;
        } catch (error) {
            console.error(`Error reinitializing provider ${providerId}:`, error);
            throw error;
        }
    }

        /**
     * Claim random rewards for a provider
     * @returns Promise that resolves when rewards are claimed
     */
        async claimRandomRewards(): Promise<void> {
            try {
                const client = await this.getRandomClient();
                await client.claimRewards();
            } catch (error) {
                console.error('Error claiming random rewards:', error);
                throw error;
            }
        }

        /**
         * Get user info for a specific address
         * @param address The wallet address to get info for
         * @returns Promise that resolves to user info
         */
        async getUserInfo(address: string): Promise<any> {
            try {
                const client = await this.getRandomClient();
                return await client.getUserInfo(address);
            } catch (error) {
                console.error('Error getting user info:', error);
                throw error;
            }
        }

        /**
         * Prepay tokens for future random requests
         * @param amount The amount to prepay (in raw token units)
         * @param address The wallet address
         * @returns Promise that resolves to prepay result
         */
        async prepayTokens(amount: number, address: string): Promise<any> {
            try {
                const client = await this.getRandomClient();
                return await client.prepay(amount, address);
            } catch (error) {
                console.error('Error prepaying tokens:', error);
                throw error;
            }
        }

        /**
         * Create a random request
         * @param providerIds Array of provider IDs to use
         * @param numProviders Number of providers needed
         * @param callbackId Callback ID for the request
         * @returns Promise that resolves to request result
         */
        async createRandomRequest(providerIds: string[], numProviders: number, callbackId: string): Promise<any> {
            try {
                const client = await this.getRandomClient();
                return await client.createRequest(providerIds, numProviders, callbackId);
            } catch (error) {
                console.error('Error creating random request:', error);
                throw error;
            }
        }

        /**
         * Redeem tokens using a redemption code
         * @param code The redemption code to use
         * @returns Promise that resolves to redemption result
         */
        async redeemTokens(code: string): Promise<any> {
            try {
                const client = await this.getRedemptionClient();
                return await client.redeemCode(code);
            } catch (error) {
                console.error('Error redeeming tokens:', error);
                throw error;
            }
        }

}

export const aoHelpers = new AOHelpers();
