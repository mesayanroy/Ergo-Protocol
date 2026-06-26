export async function mockSetup(): Promise<void> {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing RPC_URL in environment");
  }

  console.log(`Setting up mock tokens and oracle feeds over ${rpcUrl}`);
}