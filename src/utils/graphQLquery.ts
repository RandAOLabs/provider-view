import Arweave from 'arweave';

// Initialize an Arweave instance
const apiconf = {host: "arweave-search.goldsky.com"}
const arweave = Arweave.init(apiconf);

/**
 * Fetches the total number of matching transactions from Arweave using the count field.
 *
 * @returns {Promise<number>} The total count of matching transactions.
 */
export async function getTotalProvided() {
  try {
    console.log('Fetching total transaction count...');
    
    const queryObject = {
      query: `{
        transactions(
          recipients: ["yKVS1tYE3MajUpZqEIORmW1J8HTke-6o6o6tnlkFOZQ"],
          tags: [
            { name: "Action", values: ["Post-VDF-Output-And-Proof"] },
            { name: "Data-Protocol", values: ["ao"] }
          ]
        ) {
           count
        }
      }`
    };

    const response = await arweave.api.post('/graphql', queryObject);
    const count = response.data?.data?.transactions?.count || 0;
    console.log('Total transactions count:', count);
    return count;
  } catch (error) {
    console.error("Error fetching transaction count:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response,
      stack: error.stack
    });
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

export async function getProviderTotalRandom(provider_id) {
  try {
    console.log('Fetching provider total random count...');
    
    const queryObject = {
      query: `{
        transactions(
          recipients: ["yKVS1tYE3MajUpZqEIORmW1J8HTke-6o6o6tnlkFOZQ"],
          owners: ["${provider_id}"],
          tags: [
            { name: "Action", values: ["Post-VDF-Output-And-Proof"] },
            { name: "Data-Protocol", values: ["ao"] }
          ]
        ) {
           count
        }
      }`
    };

    const response = await arweave.api.post('/graphql', queryObject);
    const count = response.data?.data?.transactions?.count || 0;
    console.log('Provider total random count:', count);
    return count;
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
