export interface AccountData {
  id: string;
  balances: { balance: string; asset_type: string; asset_code?: string }[];
}

export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

export async function fetchAccount(address: string): Promise<AccountData | null> {
  try {
    const res = await fetch(`${HORIZON_TESTNET_URL}/accounts/${address}`);
    if (res.ok) {
      return (await res.json()) as AccountData;
    }
  } catch (err) {
    console.error(`Error querying Horizon for ${address}:`, err);
  }
  return null;
}