import { useStellarWallet } from '../stellar-wallet';
import { server, NETWORK_PASSPHRASE } from '../rpc';
import { TransactionBuilder } from '@stellar/stellar-sdk';
import { buildSupplyTx, buildBorrowTx, buildRepayTx, buildWithdrawTx, buildApproveTx } from '../transactions';
import { config } from '../config';

export function useTransactionBuilder(userAddress: string | null) {
  const { signTransaction } = useStellarWallet();

  const ASSETS: Record<string, string> = {
    xlm_shared: (config.assets as any).XLM || '',
    usdc_shared: (config.assets as any).USDC || '',
    eurc_shared: (config.assets as any).EURC || '',
    xlm_satellite: (config.assets as any).XLM || '',
    usdc_satellite: (config.assets as any).USDC || '',
    eurc_satellite: (config.assets as any).EURC || '',
    ergo_satellite: (config.assets as any).ERGO || '',
    wbtc_satellite: (config.assets as any).wBTC || '',
    weth_satellite: (config.assets as any).wETH || '',
  };

  const getAssetForMarket = (marketId: string): string => {
    return ASSETS[marketId.toLowerCase()] || '';
  };

  const submitAndConfirm = async (signedXdr: string): Promise<string> => {
    const sendRes = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
    if (sendRes.status === "ERROR") {
      throw new Error((sendRes as any).errorResult || "Submission failed");
    }

    let status: any = sendRes.status;
    let txResult;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      txResult = await server.getTransaction(sendRes.hash);
      status = txResult.status;
      if (status === "SUCCESS" || status === "FAILED") {
        break;
      }
    }

    if (status !== "SUCCESS") {
      throw new Error("Transaction execution failed or timed out.");
    }
    return sendRes.hash;
  };

  const executeSupply = async (marketId: string, amount: bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const assetId = getAssetForMarket(marketId);
    if (!assetId) throw new Error(`Asset not found for market ${marketId}`);
    
    // Step 1: Approve
    const approveXdr = await buildApproveTx(userAddress, assetId, amount);
    const rawApproveTx = TransactionBuilder.fromXDR(approveXdr, NETWORK_PASSPHRASE);
    const preparedApproveTx = await server.prepareTransaction(rawApproveTx);
    const signedApproveXdr = await signTransaction(preparedApproveTx.toXDR());
    await submitAndConfirm(signedApproveXdr);

    // Step 2: Supply
    const unsignedXdr = await buildSupplyTx(userAddress, marketId, amount);
    const rawTx = TransactionBuilder.fromXDR(unsignedXdr, NETWORK_PASSPHRASE);
    const preparedTx = await server.prepareTransaction(rawTx);
    const signedXdr = await signTransaction(preparedTx.toXDR());
    return await submitAndConfirm(signedXdr);
  };

  const executeBorrow = async (marketId: string, amount: bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const unsignedXdr = await buildBorrowTx(userAddress, marketId, amount);
    const rawTx = TransactionBuilder.fromXDR(unsignedXdr, NETWORK_PASSPHRASE);
    const preparedTx = await server.prepareTransaction(rawTx);
    const signedXdr = await signTransaction(preparedTx.toXDR());
    return await submitAndConfirm(signedXdr);
  };

  const executeRepay = async (marketId: string, amount: bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const assetId = getAssetForMarket(marketId);
    if (!assetId) throw new Error(`Asset not found for market ${marketId}`);

    // Step 1: Approve
    const approveXdr = await buildApproveTx(userAddress, assetId, amount);
    const rawApproveTx = TransactionBuilder.fromXDR(approveXdr, NETWORK_PASSPHRASE);
    const preparedApproveTx = await server.prepareTransaction(rawApproveTx);
    const signedApproveXdr = await signTransaction(preparedApproveTx.toXDR());
    await submitAndConfirm(signedApproveXdr);

    // Step 2: Repay
    const unsignedXdr = await buildRepayTx(userAddress, marketId, amount);
    const rawTx = TransactionBuilder.fromXDR(unsignedXdr, NETWORK_PASSPHRASE);
    const preparedTx = await server.prepareTransaction(rawTx);
    const signedXdr = await signTransaction(preparedTx.toXDR());
    return await submitAndConfirm(signedXdr);
  };

  const executeWithdraw = async (marketId: string, amount: bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const unsignedXdr = await buildWithdrawTx(userAddress, marketId, amount);
    const rawTx = TransactionBuilder.fromXDR(unsignedXdr, NETWORK_PASSPHRASE);
    const preparedTx = await server.prepareTransaction(rawTx);
    const signedXdr = await signTransaction(preparedTx.toXDR());
    return await submitAndConfirm(signedXdr);
  };

  return { executeSupply, executeBorrow, executeRepay, executeWithdraw };
}
