#!/bin/bash
set -e

echo "=== Stellar Prediction Market - Testnet Deployment ==="
echo ""

# Check prerequisites
command -v stellar >/dev/null 2>&1 || { echo "Error: stellar CLI not installed. Run: cargo install stellar-cli --locked"; exit 1; }

# Create identity if it doesn't exist
if ! stellar keys address dev 2>/dev/null; then
  echo "Creating testnet identity 'dev'..."
  stellar keys generate --global dev --network testnet --fund
  echo "Identity created and funded via Friendbot"
else
  echo "Using existing identity 'dev'"
fi

ADMIN_ADDRESS=$(stellar keys address dev)
echo "Admin address: $ADMIN_ADDRESS"
echo ""

# Build contract
echo "Building contract..."
cd "$(dirname "$0")/../contracts/prediction-market"
stellar contract build
echo "Build complete"
echo ""

# Deploy
echo "Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/prediction_market.wasm \
  --source dev \
  --network testnet)
echo "Contract deployed: $CONTRACT_ID"
echo ""

# Get native XLM SAC address
echo "Getting native XLM SAC address..."
XLM_SAC=$(stellar contract id asset --asset native --network testnet)
echo "XLM SAC: $XLM_SAC"
echo ""

# Initialize contract
echo "Initializing contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source dev \
  --network testnet \
  -- \
  initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$XLM_SAC"
echo "Contract initialized"
echo ""

# Smoke test
echo "Smoke test - getting market count..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source dev \
  --network testnet \
  -- \
  get_market_count
echo ""

# Update frontend .env
cd "$(dirname "$0")/.."
if [ -f frontend/.env ]; then
  if grep -q "VITE_CONTRACT_ID=" frontend/.env; then
    sed -i '' "s|VITE_CONTRACT_ID=.*|VITE_CONTRACT_ID=$CONTRACT_ID|" frontend/.env
  else
    echo "VITE_CONTRACT_ID=$CONTRACT_ID" >> frontend/.env
  fi
  echo "Updated frontend/.env with CONTRACT_ID"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Contract ID: $CONTRACT_ID"
echo "Admin: $ADMIN_ADDRESS"
echo "XLM SAC: $XLM_SAC"
echo ""
echo "To create a test market:"
echo "stellar contract invoke --id $CONTRACT_ID --source dev --network testnet -- create_market --creator $ADMIN_ADDRESS --question '\"Will BTC hit 100k?\"' --deadline $(( $(date +%s) + 86400 ))"
