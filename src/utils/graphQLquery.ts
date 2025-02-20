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
