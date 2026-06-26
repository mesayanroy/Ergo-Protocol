export async function deployMainnet(): Promise<void> {
  const rpcUrl = process.env.RPC_URL;
  const networkPassphrase = process.env.NETWORK_PASSPHRASE;
  if (!rpcUrl || !networkPassphrase) {
    throw new Error("Missing RPC_URL or NETWORK_PASSPHRASE in environment");
  }

  console.log(`Deploying Ergo Protocol to mainnet via ${rpcUrl}`);
}