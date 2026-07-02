# Developer API Reference

This document outlines the Ergo Protocol API endpoints, parameter payloads, and example JSON response schemas.

---

## 1. Authentication Endpoints

### POST `/api/v1/auth/challenge`
Generates a cryptographic SEP-10 challenge payload for authentication.

- **Request Body**:
  ```json
  {
    "address": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  }
  ```
- **Response Schema**:
  ```json
  {
    "challenge": "SEP10-Challenge:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN:428913:ergo-protocol.vercel.app",
    "network": "Test SDF Network ; September 2015",
    "signature": "c2lnbmF0dXJlX2RlbW9fYmFzZTY0X3N0cmluZ19oZXJl..."
  }
  ```

### POST `/api/v1/auth/verify`
Validates the user's challenge signature and issues a JWT token.

- **Request Body**:
  ```json
  {
    "challenge": "SEP10-Challenge:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN:428913:ergo-protocol.vercel.app",
    "signature": "dXNlcl9zaWduYXR1cmVfYmFzZTY0...",
    "address": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  }
  ```
- **Response Schema**:
  ```json
  {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "address": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "expiresIn": "24h"
  }
  ```

---

## 2. Markets Endpoints

### GET `/api/v1/markets`
Retrieves statistics for all active markets.

- **Response Schema**:
  ```json
  [
    {
      "id": "usdc",
      "symbol": "USDC",
      "name": "USD Coin",
      "logo": "/logo_usdc.png",
      "price": 1.0,
      "poolType": "Shared Core",
      "active": true,
      "permissioned": false,
      "collateralFactor": 0.75,
      "liquidationThreshold": 0.8,
      "debtCeiling": "Unlimited",
      "emodeCategory": 1,
      "totalSupplied": 52400000,
      "totalBorrowed": 31200000,
      "borrowRate": 4.25,
      "supplyRate": 2.85
    }
  ]
  ```

### GET `/api/v1/markets/:marketId`
Fetches parameters and oracle feed connections for a specific market.

- **Response Schema**:
  ```json
  {
    "id": "usdc",
    "symbol": "USDC",
    "name": "USD Coin",
    "price": 1.0,
    "oracleConnection": {
      "status": "connected",
      "lastChecked": "2026-07-02T21:00:00Z",
      "feedCount": 2,
      "primaryFeed": "CBKF3DIVWXW37KIWM74WFZRYFMWBLJZFMB6GUP3MVGUSUPKJTJVLNPJ"
    }
  }
  ```

---

## 3. Positions & Caching Endpoints

### GET `/api/v1/positions/:address`
Fetches a user's supplying and borrowing positions.

- **Response Schema**:
  ```json
  [
    {
      "user_address": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "market_symbol": "XLM",
      "supplied": 10000,
      "borrowed": 1200,
      "delegated": 0,
      "health_factor": 1.84
    }
  ]
  ```

### GET `/api/v1/positions/:address/history`
Fetches a user's transaction history.

- **Response Schema**:
  ```json
  [
    {
      "id": 1,
      "user_address": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "tx_hash": "tx_hash_1",
      "action": "supply",
      "market_id": "xlm",
      "amount": 10000,
      "asset_code": "XLM",
      "status": "success",
      "ledger": 12491,
      "created_at": "2026-07-02T20:30:00.000Z"
    }
  ]
  ```

---

## 4. Oracle & Price Endpoints

### GET `/api/v1/oracle/:asset`
Returns live oracle aggregate parameters and historical price snapshots.

- **Response Schema**:
  ```json
  {
    "asset": "XLM",
    "price": 0.12,
    "reflectorPrice": 0.12,
    "twapPrice": 0.12,
    "medianPrice": 0.12,
    "deviationBps": 0,
    "circuitBreakerTripped": false,
    "history": []
  }
  ```

---

## 5. Liquidation Auctions

### GET `/api/v1/auctions`
Returns active Dutch curve liquidation auctions.

- **Response Schema**:
  ```json
  [
    {
      "id": 1,
      "user_address": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "pool_id": 7,
      "collateral_asset": "XLM",
      "collateral_amount": 10000,
      "debt_asset": "USDC",
      "debt_amount": 500,
      "start_ledger": 14912,
      "active": true
    }
  ]
  ```

---

## 6. Governance Proposals

### GET `/api/v1/proposals`
Returns paginated governance proposals.

- **Response Schema**:
  ```json
  {
    "page": 1,
    "limit": 10,
    "total": 1,
    "proposals": [
      {
        "id": 1,
        "proposer": "GBX...GOV",
        "target_contract": "CCPool...XYZ",
        "action_name": "PAUSE",
        "votes_for": 15000,
        "votes_against": 450,
        "end_time": 1783026354,
        "executed": false
      }
    ]
  }
  ```

---

## 7. Backstop & Insurance

### GET `/api/v1/backstop/:poolId`
Returns insurance pool parameters and shortfalls.

- **Response Schema**:
  ```json
  {
    "pool_id": "xlm_shared",
    "total_balance": 1250000,
    "worst_case_shortfall": 45000,
    "coverage_ratio": 27.77
  }
  ```

---

## 8. Compliance & Allowlisting

### POST `/api/v1/compliance/authorize`
Issuer allowlists a user for permissioned RWA markets.

- **Request Body**:
  ```json
  {
    "marketId": "eurc_shared",
    "userAddress": "GDK...USER",
    "issuerAddress": "GBI...ISSUER",
    "message": "Allowlist:GDK...USER",
    "signature": "aXNzdWVyX3NpZ25hdHVyZV9iYXNlNjQ..."
  }
  ```
- **Response Schema**:
  ```json
  {
    "status": "success",
    "marketId": "eurc_shared",
    "userAddress": "GDK...USER",
    "kycVerified": true,
    "authorizedBy": "GBI...ISSUER"
  }
  ```
