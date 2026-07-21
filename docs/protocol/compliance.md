# 🛡️ Compliance Gate & Role-Based Access

The Compliance contract provides institutional-grade access gates for permissioned pools within Ergo Protocol.

## Compliance Mechanics

- **Allowlist Checks**: Before any supply, borrow, or transfer action, the Core Pool queries the Compliance gate.
- **Dedicated Issuers**: Designated market issuers (configured by the admin) have exclusive rights to manage the allowlist for their respective assets.
- **Audit Logging**: All list updates and access overrides are permanently logged on-chain.
