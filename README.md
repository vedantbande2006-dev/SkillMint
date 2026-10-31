# SkillMint

SkillMint is an editorially art-directed micro-work marketplace starter. It is intentionally explicit about what is illustrative versus connected to a real network.

## Current status

### Implemented in this starter
- Responsive React + TypeScript workboard with search and category filters.
- Local-only task draft creation with a clear non-persistence warning.
- Domain task transition guards and exact integer token amount helpers, with unit tests.
- Express API scaffold with wallet nonce/signature authentication, hashed server sessions, rate limits, validation, task discovery and task publishing endpoints.
- PostgreSQL Prisma schema for users, tasks, applications, submissions, payments, sessions and reviews.
- Bridge Wallet adapter boundary that fails closed instead of silently falling back to another wallet.
- Minimal ERC-20-style escrow contract prototype with role-guarded dispute resolution and reentrancy guard.
- Environment placeholders for network and token details.
- Visual Proof Ledger that does not fabricate transaction data.

### Not yet implemented / not production-ready
- Repository-specific integration (this is a standalone starter, not an audit of an existing repository).
- Official Bridge Wallet provider/SDK integration.
- Verified Coral token contract, decimals and token behavior.
- API, authentication, PostgreSQL persistence, migrations and private object storage.
- Escrow dispute resolution, timeout/refund policy, fee policy, comprehensive contract tests and audit.
- Event indexer, transaction reconciliation, real proof ledger and end-to-end tests.
- Deployment scripts and verified explorer links.

**Do not deploy the contract or use real funds yet.** The contract is a starting point for review, not an audited financial product. Its dispute state deliberately has no unilateral resolution function; a documented resolution mechanism is required before production use.

## Requirements
- Node.js 20+
- npm
- A Solidity toolchain such as Foundry or Hardhat for contract compilation/testing

## Run the UI

```bash
npm install
npm run dev
```

## Run the API

Start PostgreSQL and set the backend values in `.env` using `.env.example` as a template. Then run:

```bash
npm run db:generate
npm run db:migrate
npm run dev:api
```

The API exposes `/health`, `/api/auth/nonce`, `/api/auth/verify`, `/api/auth/logout`, `/api/me`, and `/api/tasks`. Authentication uses a one-time signed challenge and an HTTP-only cookie session. Configure `AUTH_DOMAIN`, HTTPS, trusted origins and operational session cleanup before deployment. The frontend is not yet wired to all API workflows.

## Validate frontend

```bash
npm test
npm run build
```

## Protocol research notes

- MST's official site describes MST as an EVM-compatible Layer 1 and identifies BridgeKey as its wallet product: https://www.mstblockchain.com/ and https://mstblockchain.com/.
- MST mainnet information is also listed by thirdweb with chain ID 4646 and RPC `https://4646.rpc.thirdweb.com`: https://thirdweb.com/mst.
- These facts do **not** establish the Coral testnet's current chain configuration or identify the requested Coral token contract. The implementation intentionally leaves those values unset.

## Network verification gates
Before setting `.env` values or deploying:
1. Confirm official Coral network ID, RPC, explorer and gas token.
2. Confirm the canonical MSTC Coral token contract from an authoritative source and inspect decimals and transfer behavior.
3. Confirm the exact Bridge Wallet product and supported dApp integration API.
4. Add contract tests and threat-model review.
5. Deploy only to a supported test network with explicit authorization.

Never put private keys, seed phrases, or production secrets in frontend environment variables.
