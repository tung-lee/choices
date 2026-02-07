# Tech Stack

## Smart Contract
- **Language**: Rust (`#![no_std]`)
- **SDK**: `soroban-sdk` (latest stable)
- **Build target**: `wasm32-unknown-unknown`
- **CLI**: `stellar-cli` for build/deploy/invoke

## Frontend
- **Framework**: React 19 + TypeScript
- **Build tool**: Vite 6
- **Styling**: TailwindCSS v4 (CSS-native config)
- **Wallet**: Freighter (`@stellar/freighter-api`)
- **SDK**: `@stellar/stellar-sdk`

## Network
- **Chain**: Stellar Testnet
- **RPC**: `https://soroban-testnet.stellar.org`
- **Faucet**: Friendbot (`https://friendbot.stellar.org`)
- **Token**: Native XLM via Stellar Asset Contract (SAC)
- **Amounts**: All in stroops (1 XLM = 10,000,000 stroops)

## Dev Tools
- `stellar-cli` for contract management
- `cargo test` for Soroban unit tests
- Generated TypeScript bindings for frontend type safety
