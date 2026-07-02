# Health Factor & Liquidation Risk

The **Health Factor (HF)** is a numeric representation of the safety of a user's borrowing position relative to their deposited collateral. A health factor above 1.0 represents a healthy position, whereas dropping below 1.0 makes the position eligible for Dutch curve liquidation.

---

## 1. Health Factor Formula

$$\text{Health Factor} = \frac{\sum_{i} (\text{Supplied Balance}_i \times \text{Price}_i \times \text{Liability Factor}_i)}{\sum_{j} (\text{Borrowed Balance}_j \times \text{Price}_j)}$$

Where:
- **Price**: The asset price in USD returned by the Oracle Aggregator.
- **Liability Factor (LF)**: The maximum proportion of debt that can be borrowed against the collateral (similar to Liquidation Threshold, represented in basis points).
- **Scale**: The final health factor is scaled by 10,000, where `10,000` represents a health factor of exactly `1.0`.

---

## 2. Worked Example Simulation

### Initial Setup
- **User Deposits (Collateral)**: 10,000 XLM
- **XLM Price**: $0.11
- **XLM Liability Factor (LF)**: 80% (0.80)
- **User Borrows (Debt)**: 700 USDC
- **USDC Price**: $1.00

#### Step 1: Calculate Collateral Value in USD
$$\text{Collateral Value} = 10,000 \times \$0.11 \times 0.80 = \$880.00$$

#### Step 2: Calculate Borrowed Value in USD
$$\text{Borrowed Value} = 700 \times \$1.00 = \$700.00$$

#### Step 3: Calculate Initial Health Factor
$$\text{Health Factor} = \frac{\$880.00}{\$700.00} = 1.2571 \quad (12,571 \text{ bps})$$

Since $1.2571 > 1.0$, the borrowing position is **Safe**.

---

## 3. Market Drop Simulation

### Scenario A: XLM drops to $0.09
- **Collateral Value**: $10,000 \times \$0.09 \times 0.80 = \$720.00$
- **Borrowed Value**: $700 \times \$1.00 = \$700.00$
- **New Health Factor**:
  $$\text{Health Factor} = \frac{\$720.00}{\$700.00} = 1.0285 \quad (10,285 \text{ bps})$$
- **Status**: **Warning** (Healthy, but close to liquidation threshold).

### Scenario B: XLM drops to $0.088
- **Collateral Value**: $10,000 \times \$0.088 \times 0.80 = \$704.00$
- **Borrowed Value**: $700 \times \$1.00 = \$700.00$
- **New Health Factor**:
  $$\text{Health Factor} = \frac{\$704.00}{\$700.00} = 1.0057 \quad (10,057 \text{ bps})$$
- **Status**: **Near Liquidation** (High risk).

### Scenario C: XLM drops to $0.087
- **Collateral Value**: $10,000 \times \$0.087 \times 0.80 = \$696.00$
- **Borrowed Value**: $700 \times \$1.00 = \$700.00$
- **New Health Factor**:
  $$\text{Health Factor} = \frac{\$696.00}{\$700.00} = 0.9942 \quad (9,942 \text{ bps})$$
- **Status**: **Liquidation Triggered** ($HF < 1.0$). 
  - Anyone can now call `create_liquidation_auction` in the Liquidation Engine.
  - The position's collateral is placed in a Dutch auction, allowing searcher bots to settle the debt at a discount.
