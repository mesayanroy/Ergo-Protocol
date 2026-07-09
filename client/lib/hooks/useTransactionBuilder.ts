import { useStellarWallet } from '../stellar-wallet';
import { server, NETWORK_PASSPHRASE } from '../rpc';
import { TransactionBuilder } from '@stellar/stellar-sdk';
import { buildSupplyTx, buildBorrowTx, buildRepayTx, buildWithdrawTx, buildApproveTx } from '../transactions';

export function useTransactionBuilder(userAddress: string | null) {
  const { signTransaction } = useStellarWallet();

  const ASSETS: Record<string, string> = {
    xlm_shared: process.env.NEXT_PUBLIC_XLM_SAC || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    usdc_shared: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || 'CB4A545ENTCQZUV33M2QT6RKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5',
    eurc_shared: process.env.NEXT_PUBLIC_EURC_CONTRACT_ID || 'CBGN37EGC2VTOTROLR72BGCXEBZF2JGVHPPPN36IFKLVXBQLY3SXST6E',
    wbtc_satellite: process.env.NEXT_PUBLIC_WBTC_CONTRACT_ID || 'CDJHXKNMRY5UOX4JGAGEPBGR3DKYOBPXPDWXTLSRKPT2FN3SGPS762YE',
    weth_satellite: process.env.NEXT_PUBLIC_WETH_CONTRACT_ID || 'CAUJL5GHJGD3XZTATZZJK5PTKVXUBQEZ2LQFQB7DQTGUN62BFCOR7KXK',
    ergo_satellite: process.env.NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID || 'CCR5A6TLOSX3JTEOHRSCKC3WWUOB4ZHOCEUXKI3NE6MU3XYDYSZVCX57',
    xlm_satellite: process.env.NEXT_PUBLIC_XLM_SAC || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    usdc_satellite: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || 'CB4A545ENTCQZUV33M2QT6RKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5',
    eurc_satellite: process.env.NEXT_PUBLIC_EURC_CONTRACT_ID || 'CBGN37EGC2VTOTROLR72BGCXEBZF2JGVHPPPN36IFKLVXBQLY3SXST6E',
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
