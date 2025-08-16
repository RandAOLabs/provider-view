import Arweave from 'arweave';

// Initialize an Arweave instance
const apiconf = {host: "arweave-search.goldsky.com"}
const arweave = Arweave.init(apiconf);

const RANDOMPROCCESS = [
  "BPafv2apbvSU0SRZEksMULFtKQQb0KvS7PBTPadFVSQ",
  "XAYnAxAEFhVRwhUyFKZmkeTiazIZClQIELLw6h44Ngc",
  "1dnDvaDRQ7Ao6o1ohTr7NNrN5mp1CpsXFrWm3JJFEs8",
  "2ExUldxQ5NA_hnElSWYq0_lCBgeQQPxPhFbWDFihDEY",
  "KhD1NI6t4dbv0S3-7z2YSQnvpI5jxS9pTRL46AlC5FE",
  "FOarjI5mCtPUUYZ2pRTTNX0erBik0O1g-0I1R4WTl-U",
  "9ZXTvznyUo266uIU8nHPMsAtI8NntFdmsET3M3Hv_FA",
  "yqlD760syDGXBQkC4ccpZFslFLv7uJ8haBMbPtr--Go",
  "UujLOtCfyo3uoKfuozS7cQfTe11BdvWR3Slb65zrR7k",
  "aeu3pyFhfNvw3yWjb3o_WnWBh4f4W-BzWxDqPAbCJjk",
  "ZBSQD_GeGUdQAiixxKy9Ag1rgJvJ_yFUGExwjW6mA7E",
  "8N08BvmC34q9Hxj-YS6eAOd_cSmYqGpezPPHUYWJBhg",
  "F6-mEIweSJgf5hMz9LN5nrMsuXLw6WSV66QzQ05ZtWA",
  "hlaH32FiFy67Rq_MbqLnxcrth4wZt_XW48VXRbAiSfs",
  "fxDfXBlA7bTqjNh4Zl5mLzRW7DL_I9Vhl1CMRRiAmto",
  "lgqfjApWiekA_O3Svv7tNJU1Ol3eZD1_JzWKZ7E4ek8"
];
/**
 * Fetches the total number of matching transactions from Arweave using the count field.
 *
 * @returns {Promise<number>} The total count of matching transactions across all RANDOMPROCCESS values.
 */
export async function getTotalProvided() {
  try {
    console.log('Fetching total transaction count for multiple addresses...');

    // Query each address in the RANDOMPROCCESS array
    const queries = RANDOMPROCCESS.map(async (address) => {
      const queryObject = {
        query: `{
          transactions(
            recipients: ["${address}"],
            tags: [
              { name: "Action", values: ["Reveal-Puzzle-Params"] },
              { name: "Data-Protocol", values: ["ao"] }
            ]
          ) {
            count
          }
        }`
      };

      try {
        const response = await arweave.api.post('/graphql', queryObject);
        const rawCount = response.data?.data?.transactions?.count;
        
        // Convert count to number (handles both string and number returns from API)
        return rawCount ? Number(rawCount) : 0;
      } catch (error) {
        console.error(`Error fetching transaction count for ${address}:`, error);
        return 0;
      }
    });

    // Wait for all queries to complete
    const results = await Promise.all(queries);
    
    // Sum up all the results (ensure numeric addition)
    const total = results.reduce((sum, count) => sum + Number(count), 0);
    
    console.log('Total transactions count:', total);
    return total;
  } catch (error) {
    console.error("Error in fetching total transaction count:", error);
    return 0;
  }
}


export async function pullIdToMessage(pullId: string, userid: string) {
  try {
    console.log('Fetching message for pull ID:', pullId);
    
    const queryObject = {
      query: `{
        transactions(
          recipients: ["${userid}"]
          sort: HEIGHT_DESC
          tags: [
            { name: "Action", values: ["Raffle-Winner"] },
            { name: "Data-Protocol", values: ["ao"] },
            { name: "From-Process", values: ["RQZBPcI-EUVb9rdcbiIN0eggYSJNLgdFuD7G_GztreQ"]},
            { name: "PullId", values: ["${pullId}"]}
          ]
        ) {
          edges {
            node {
              id,
              tags {
                name
                value
              }
            }
          }
        }
      }`
    };

    const response = await arweave.api.post('/graphql', queryObject);
    console.log("response for " + pullId)
    console.log('Pull ID message response:', response.data?.data?.transactions?.edges);
    return response.data?.data?.transactions?.edges || [];
  } catch (error) {
    console.error("Error fetching pull ID message:", error);
    return [];
  }
}

export async function raffleRandomResponses() {
  try {
    console.log('Fetching raffle random responses...');
    
    const queryObject = {
      query: `{
        transactions(
          recipients: ["RQZBPcI-EUVb9rdcbiIN0eggYSJNLgdFuD7G_GztreQ"]
          sort: HEIGHT_DESC
          tags: [
            { name: "Action", values: ["Random-Response"] },
            { name: "Data-Protocol", values: ["ao"] },
            { name: "From-Process", values: ["1dnDvaDRQ7Ao6o1ohTr7NNrN5mp1CpsXFrWm3JJFEs8"]}
          ]
        ) {
          edges {
            node {
              id
            }
          }
        }
      }`
    };

    const response = await arweave.api.post('/graphql', queryObject);
    console.log('Raffle random responses:', response.data?.data?.transactions?.edges);
    return response.data?.data?.transactions?.edges || [];
  } catch (error) {
    console.error("Error fetching raffle random responses:", error);
    return [];
  }
}

export async function creditNoticeFetcher(callbackId: string) {
  try {
    console.log('Fetching credit notice for callback ID:', callbackId);
    
    const queryObject = {
      query: `{
        transactions(
          recipients: ["1dnDvaDRQ7Ao6o1ohTr7NNrN5mp1CpsXFrWm3JJFEs8"]
          sort: HEIGHT_DESC
          tags: [
            { name: "Action", values: ["Credit-Notice"] },
            { name: "Data-Protocol", values: ["ao"] },
            { name: "From-Process", values: ["5ZR9uegKoEhE9fJMbs-MvWLIztMNCVxgpzfeBVE3vqI"]},
            { name: "X-CallbackId", values: ["${callbackId}"]}
          ]
        ) {
          edges {
            node {
              id
            }
          }
        }
      }`
    };

    const response = await arweave.api.post('/graphql', queryObject);
    console.log('Credit notice response:', response.data?.data?.transactions?.edges);
    return response.data?.data?.transactions?.edges || [];
  } catch (error) {
    console.error("Error fetching credit notice:", error);
    return [];
  }
}

/**
 * Fetches the total random count provided by a specific provider across all RANDOMPROCCESS values.
 * 
 * @param {string} provider_id - The provider's wallet address
 * @returns {Promise<number>} The total count of random provided by this provider across all RANDOMPROCCESS
 */
export async function getProviderTotalRandom(provider_id: string) {
  try {
    console.log('Fetching provider total random count...');
    
    // Query each address in the RANDOMPROCCESS array for this specific provider
    const queries = RANDOMPROCCESS.map(async (address) => {
      const queryObject = {
        query: `{
          transactions(
            recipients: ["${address}"],
            owners: ["${provider_id}"],
            tags: [
              { name: "Action", values: ["Reveal-Puzzle-Params"] },
              { name: "Data-Protocol", values: ["ao"] }
            ]
          ) {
            count
          }
        }`
      };

      try {
        const response = await arweave.api.post('/graphql', queryObject);
        const rawCount = response.data?.data?.transactions?.count;
        
        // Convert count to number (handles both string and number returns from API)
        return rawCount ? Number(rawCount) : 0;
      } catch (error) {
        console.error(`Error fetching transaction count for ${address}:`, error);
        return 0;
      }
    });

    // Wait for all queries to complete
    const results = await Promise.all(queries);
    
    // Sum up all the results (ensure numeric addition)
    const total = results.reduce((sum, count) => sum + Number(count), 0);
    
    console.log('Provider total random count:', total);
    return total;
  } catch (error) {
    console.error("Error fetching provider total random:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response,
      stack: error.stack
    });
    return 0;
  }
}
