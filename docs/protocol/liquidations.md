# ⚡ Dutch Curve Liquidation auctions

To protect pool solvency, positions that drop below a Health Factor of `1.00` are immediately subjected to Dutch curve liquidation auctions.

## Auction Curve Mechanics

- **Linear Discount**: The collateral purchase discount starts at 0% and scales linearly to a maximum of 10% over the duration of the auction.
- **Bad Debt Coverage**: Liquidators pay the outstanding debt to the Core Pool and receive the borrower's collateral at the current curve discount.
- **Solvency Safety**: Prevents systemic bad debt accumulation while giving liquidators arbitrage incentives.
