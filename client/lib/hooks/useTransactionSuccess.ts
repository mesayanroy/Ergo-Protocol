export function useTransactionSuccess(
  refetchMarkets: () => any,
  refetchPosition: () => any,
  refetchBalances: () => any
) {
  return async (txHash: string) => {
    console.log("Transaction confirmed:", txHash);
    try {
      await Promise.all([
        refetchMarkets(),
        refetchPosition(),
        refetchBalances()
      ]);
    } catch (e) {
      console.error("Error refreshing dashboard state after transaction:", e);
    }
  };
}
