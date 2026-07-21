# 🔌 Backend API Reference

The Express backend server exposes JSON endpoints to synchronize the indexer data and provide auxiliary dashboard functions.

## Primary Endpoints

- `GET /api/proposals`: Retrieves all governance proposals.
- `POST /api/proposals`: Creates a new proposal entry.
- `POST /api/faucet`: Distributes testnet assets.
- `GET /api/admin/metrics`: Fetches protocol indexer stats.
