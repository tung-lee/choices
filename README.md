# Stellar Prediction Market

Binary (YES/NO) prediction market on Stellar testnet using Soroban smart contracts.

## How It Works

1. Anyone creates a market with a question and deadline
2. Users buy YES or NO shares with XLM (1:1 fixed pricing)
3. After deadline, admin resolves the market outcome
4. Winners claim proportional payouts from the pool

**Payout formula**: `your_winning_shares / total_winning_shares * pool_balance`

## Prerequisites

- [Rust](https://rustup.rs/) (1.89+)
- [Node.js](https://nodejs.org/) (20+)
- [Freighter Wallet](https://freighter.app/) browser extension

## Quick Start

```bash
# 1. Setup tooling
bash scripts/setup.sh

# 2. Run contract tests
cargo test --manifest-path contracts/prediction-market/Cargo.toml

# 3. Deploy to testnet
bash scripts/deploy.sh

# 4. Start frontend
cd frontend && npm run dev
```

## Project Structure

```
contracts/prediction-market/    # Soroban smart contract (Rust)
  src/
    lib.rs                      # Contract logic (8 functions)
    types.rs                    # Market, Position, Side, DataKey
    errors.rs                   # ContractError enum
    test.rs                     # 23 unit tests
frontend/                       # React + Vite + TailwindCSS
  src/
    lib/stellar.ts              # RPC client, helpers
    hooks/useWallet.tsx         # Freighter wallet integration
    hooks/useContract.ts        # Contract interaction hooks
    components/                 # MarketCard, WalletButton, Layout
    pages/                      # Markets, CreateMarket, MarketDetail, Admin
scripts/
  deploy.sh                    # Build + deploy + initialize
  setup.sh                     # Environment setup
```

## Contract Functions

| Function | Description |
|----------|-------------|
| `initialize(admin, token)` | Set admin and XLM SAC address (one-time) |
| `create_market(creator, question, deadline)` | Create new market |
| `buy_shares(buyer, market_id, side, amount)` | Buy YES/NO shares |
| `resolve_market(market_id, outcome)` | Admin resolves after deadline |
| `claim_winnings(user, market_id)` | Winners claim proportional payout |
| `get_market(market_id)` | View market data |
| `get_position(market_id, user)` | View user's position |
| `get_market_count()` | Total markets created |

## Tech Stack

- **Contract**: Rust + Soroban SDK 22
- **Frontend**: React 19 + TypeScript + Vite 7 + TailwindCSS 4
- **Wallet**: Freighter
- **Network**: Stellar Testnet
- **Token**: Native XLM (via Stellar Asset Contract)

## Testing

```bash
cargo test --manifest-path contracts/prediction-market/Cargo.toml
```

23 tests covering: initialization, market creation, share buying, resolution, proportional payouts, refunds, authorization, deadline enforcement, double-claim prevention, and full end-to-end flow.

## Configuration

Frontend env vars in `frontend/.env`:

```
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_CONTRACT_ID=<your_deployed_contract_id>
```

The deploy script automatically updates `VITE_CONTRACT_ID`.
