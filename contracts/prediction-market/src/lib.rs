#![no_std]

mod errors;
mod types;

#[cfg(test)]
mod test;

use errors::Error;
use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, String};
use types::{DataKey, Market, MarketStatus, Position, Side};

const BUMP_THRESHOLD: u32 = 17_280; // ~1 day in ledgers
const EXTEND_TO: u32 = 518_400; // ~30 days in ledgers

fn bump_instance(env: &Env) {
    env.storage().instance().extend_ttl(BUMP_THRESHOLD, EXTEND_TO);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, BUMP_THRESHOLD, EXTEND_TO);
}

fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("not initialized")
}

fn get_token(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .expect("not initialized")
}

fn get_market(env: &Env, market_id: u64) -> Result<Market, Error> {
    let key = DataKey::Market(market_id);
    let market: Market = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::MarketNotFound)?;
    bump_persistent(env, &key);
    Ok(market)
}

fn save_market(env: &Env, market_id: u64, market: &Market) {
    let key = DataKey::Market(market_id);
    env.storage().persistent().set(&key, market);
    bump_persistent(env, &key);
}

fn get_position(env: &Env, market_id: u64, user: &Address) -> Position {
    let key = DataKey::Position(market_id, user.clone());
    let pos = env.storage().persistent().get(&key).unwrap_or(Position {
        yes_shares: 0,
        no_shares: 0,
        claimed: false,
    });
    if env.storage().persistent().has(&key) {
        bump_persistent(env, &key);
    }
    pos
}

fn save_position(env: &Env, market_id: u64, user: &Address, position: &Position) {
    let key = DataKey::Position(market_id, user.clone());
    env.storage().persistent().set(&key, position);
    bump_persistent(env, &key);
}

fn get_next_market_id(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::NextMarketId)
        .unwrap_or(0)
}

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {
    /// Initialize the contract with admin address and XLM SAC token address.
    /// Can only be called once.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::NextMarketId, &0u64);
        bump_instance(&env);
        Ok(())
    }

    /// Create a new prediction market. Returns the market ID.
    pub fn create_market(
        env: Env,
        creator: Address,
        question: String,
        deadline: u64,
    ) -> Result<u64, Error> {
        creator.require_auth();
        bump_instance(&env);

        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(Error::InvalidDeadline);
        }

        let market_id = get_next_market_id(&env);
        let market = Market {
            creator: creator.clone(),
            question,
            deadline,
            status: MarketStatus::Open,
            total_yes: 0,
            total_no: 0,
            pool_balance: 0,
        };

        save_market(&env, market_id, &market);
        env.storage()
            .instance()
            .set(&DataKey::NextMarketId, &(market_id + 1));

        env.events()
            .publish((symbol_short!("create"), market_id), creator);

        Ok(market_id)
    }

    /// Buy YES or NO shares for a market. Amount is in stroops (1 XLM = 10_000_000).
    pub fn buy_shares(
        env: Env,
        buyer: Address,
        market_id: u64,
        side: Side,
        amount: i128,
    ) -> Result<(), Error> {
        buyer.require_auth();
        bump_instance(&env);

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut market = get_market(&env, market_id)?;

        if market.status != MarketStatus::Open {
            return Err(Error::MarketClosed);
        }

        let now = env.ledger().timestamp();
        if now >= market.deadline {
            return Err(Error::MarketClosed);
        }

        // Transfer XLM from buyer to contract
        let token_address = get_token(&env);
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);

        // Update market totals
        match side {
            Side::Yes => market.total_yes += amount,
            Side::No => market.total_no += amount,
        }
        market.pool_balance += amount;

        // Update user position
        let mut position = get_position(&env, market_id, &buyer);
        match side {
            Side::Yes => position.yes_shares += amount,
            Side::No => position.no_shares += amount,
        }

        save_market(&env, market_id, &market);
        save_position(&env, market_id, &buyer, &position);

        env.events().publish(
            (symbol_short!("buy"), market_id, buyer),
            (side, amount),
        );

        Ok(())
    }

    /// Resolve a market. Only admin can call. Deadline must have passed.
    pub fn resolve_market(env: Env, market_id: u64, outcome: Side) -> Result<(), Error> {
        let admin = get_admin(&env);
        admin.require_auth();
        bump_instance(&env);

        let mut market = get_market(&env, market_id)?;

        if market.status != MarketStatus::Open {
            return Err(Error::MarketAlreadyResolved);
        }

        let now = env.ledger().timestamp();
        if now < market.deadline {
            return Err(Error::DeadlineNotReached);
        }

        market.status = MarketStatus::Resolved(outcome.clone());
        save_market(&env, market_id, &market);

        env.events()
            .publish((symbol_short!("resolve"), market_id), outcome);

        Ok(())
    }

    /// Claim winnings from a resolved market.
    pub fn claim_winnings(env: Env, user: Address, market_id: u64) -> Result<i128, Error> {
        user.require_auth();
        bump_instance(&env);

        let market = get_market(&env, market_id)?;
        let mut position = get_position(&env, market_id, &user);

        if position.claimed {
            return Err(Error::AlreadyClaimed);
        }

        let winning_side = match &market.status {
            MarketStatus::Resolved(side) => side.clone(),
            MarketStatus::Open => return Err(Error::MarketNotResolved),
        };

        let user_winning_shares = match winning_side {
            Side::Yes => position.yes_shares,
            Side::No => position.no_shares,
        };

        let total_winning_shares = match winning_side {
            Side::Yes => market.total_yes,
            Side::No => market.total_no,
        };

        // Calculate payout
        let payout = if total_winning_shares == 0 {
            // No winners: refund proportionally
            let user_total = position.yes_shares + position.no_shares;
            let total_shares = market.total_yes + market.total_no;
            if total_shares == 0 {
                0
            } else {
                (user_total * market.pool_balance) / total_shares
            }
        } else if user_winning_shares == 0 {
            0
        } else {
            (user_winning_shares * market.pool_balance) / total_winning_shares
        };

        // Mark as claimed before transfer (checks-effects-interactions)
        position.claimed = true;
        save_position(&env, market_id, &user, &position);

        // Transfer payout
        if payout > 0 {
            let token_address = get_token(&env);
            let token_client = token::Client::new(&env, &token_address);
            token_client.transfer(&env.current_contract_address(), &user, &payout);
        }

        env.events()
            .publish((symbol_short!("claim"), market_id, user), payout);

        Ok(payout)
    }

    // === View Functions ===

    /// Get market data by ID.
    pub fn get_market(env: Env, market_id: u64) -> Result<Market, Error> {
        bump_instance(&env);
        get_market(&env, market_id)
    }

    /// Get a user's position in a market.
    pub fn get_position(env: Env, market_id: u64, user: Address) -> Position {
        bump_instance(&env);
        get_position(&env, market_id, &user)
    }

    /// Get total number of markets created.
    pub fn get_market_count(env: Env) -> u64 {
        bump_instance(&env);
        get_next_market_id(&env)
    }
}
