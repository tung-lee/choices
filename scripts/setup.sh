#!/bin/bash
set -e

echo "=== Stellar Prediction Market - Environment Setup ==="
echo ""

# Check Rust
if command -v rustc >/dev/null 2>&1; then
  echo "Rust: $(rustc --version)"
else
  echo "Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
fi

# Add WASM target
echo "Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# Install stellar CLI
if command -v stellar >/dev/null 2>&1; then
  echo "Stellar CLI: $(stellar --version)"
else
  echo "Installing stellar CLI (this may take a few minutes)..."
  cargo install stellar-cli --locked
fi

# Check Node.js
if command -v node >/dev/null 2>&1; then
  echo "Node.js: $(node --version)"
else
  echo "Error: Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd "$(dirname "$0")/../frontend"
npm install

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "  1. Run: bash scripts/deploy.sh"
echo "  2. Start frontend: cd frontend && npm run dev"
