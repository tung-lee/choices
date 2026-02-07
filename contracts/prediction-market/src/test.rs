#![cfg(test)]

use crate::types::{MarketStatus, Side};
use crate::{PredictionMarket, PredictionMarketClient};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Address, Env, String};

struct TestSetup<'a> {
    env: Env,
    admin: Address,
    client: PredictionMarketClient<'a>,
    token: token::Client<'a>,
    token_admin: token::StellarAssetClient<'a>,
}

fn setup() -> TestSetup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy SAC token
    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = token::Client::new(&env, &sac.address());
    let token_admin = token::StellarAssetClient::new(&env, &sac.address());

    // Deploy prediction market
    let contract_id = env.register(PredictionMarket, ());
    let client = PredictionMarketClient::new(&env, &contract_id);
    client.initialize(&admin, &sac.address());

    TestSetup {
        env,
        admin,
        client,
        token,
        token_admin,
    }
}

fn create_test_market(s: &TestSetup, deadline_offset: u64) -> u64 {
    let deadline = s.env.ledger().timestamp() + deadline_offset;
    s.client
        .create_market(&s.admin, &String::from_str(&s.env, "Will it rain tomorrow?"), &deadline)
}

// ===== Initialization Tests =====

#[test]
fn test_initialize() {
    let s = setup();
    assert_eq!(s.client.get_market_count(), 0);
}

#[test]
fn test_initialize_twice_fails() {
    let s = setup();
    let token_addr = Address::generate(&s.env);
    let result = s.client.try_initialize(&s.admin, &token_addr);
    assert!(result.is_err());
}

// ===== Create Market Tests =====

#[test]
fn test_create_market() {
    let s = setup();
    let market_id = create_test_market(&s, 3600);
    assert_eq!(market_id, 0);
    assert_eq!(s.client.get_market_count(), 1);

    let market = s.client.get_market(&market_id);
    assert_eq!(market.status, MarketStatus::Open);
    assert_eq!(market.total_yes, 0);
    assert_eq!(market.total_no, 0);
    assert_eq!(market.pool_balance, 0);
}

#[test]
fn test_create_multiple_markets() {
    let s = setup();
    let id0 = create_test_market(&s, 3600);
    let id1 = create_test_market(&s, 7200);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(s.client.get_market_count(), 2);
}

#[test]
fn test_create_market_past_deadline_fails() {
    let s = setup();
    // Set ledger timestamp to 1000
    s.env.ledger().with_mut(|li| li.timestamp = 1000);
    let result = s.client.try_create_market(
        &s.admin,
        &String::from_str(&s.env, "Test?"),
        &500, // past deadline
    );
    assert!(result.is_err());
}

// ===== Buy Shares Tests =====

#[test]
fn test_buy_yes_shares() {
    let s = setup();
    let alice = Address::generate(&s.env);
    s.token_admin.mint(&alice, &10_000_000);

    let market_id = create_test_market(&s, 3600);
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);

    let market = s.client.get_market(&market_id);
    assert_eq!(market.total_yes, 10_000_000);
    assert_eq!(market.total_no, 0);
    assert_eq!(market.pool_balance, 10_000_000);

    let pos = s.client.get_position(&market_id, &alice);
    assert_eq!(pos.yes_shares, 10_000_000);
    assert_eq!(pos.no_shares, 0);
    assert_eq!(pos.claimed, false);

    assert_eq!(s.token.balance(&alice), 0);
}

#[test]
fn test_buy_no_shares() {
    let s = setup();
    let bob = Address::generate(&s.env);
    s.token_admin.mint(&bob, &20_000_000);

    let market_id = create_test_market(&s, 3600);
    s.client
        .buy_shares(&bob, &market_id, &Side::No, &20_000_000);

    let market = s.client.get_market(&market_id);
    assert_eq!(market.total_yes, 0);
    assert_eq!(market.total_no, 20_000_000);
    assert_eq!(market.pool_balance, 20_000_000);
}

#[test]
fn test_buy_multiple_times() {
    let s = setup();
    let alice = Address::generate(&s.env);
    s.token_admin.mint(&alice, &30_000_000);

    let market_id = create_test_market(&s, 3600);
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);
    s.client
        .buy_shares(&alice, &market_id, &Side::No, &20_000_000);

    let pos = s.client.get_position(&market_id, &alice);
    assert_eq!(pos.yes_shares, 10_000_000);
    assert_eq!(pos.no_shares, 20_000_000);
}

#[test]
fn test_buy_after_deadline_fails() {
    let s = setup();
    let alice = Address::generate(&s.env);
    s.token_admin.mint(&alice, &10_000_000);

    let market_id = create_test_market(&s, 3600);

    // Advance past deadline
    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);

    let result = s
        .client
        .try_buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);
    assert!(result.is_err());
}

#[test]
fn test_buy_zero_amount_fails() {
    let s = setup();
    let alice = Address::generate(&s.env);

    let market_id = create_test_market(&s, 3600);
    let result = s
        .client
        .try_buy_shares(&alice, &market_id, &Side::Yes, &0);
    assert!(result.is_err());
}

#[test]
fn test_buy_nonexistent_market_fails() {
    let s = setup();
    let alice = Address::generate(&s.env);
    s.token_admin.mint(&alice, &10_000_000);

    let result = s
        .client
        .try_buy_shares(&alice, &999, &Side::Yes, &10_000_000);
    assert!(result.is_err());
}

// ===== Resolve Market Tests =====

#[test]
fn test_resolve_market() {
    let s = setup();
    let market_id = create_test_market(&s, 3600);

    // Advance past deadline
    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);

    s.client.resolve_market(&market_id, &Side::Yes);

    let market = s.client.get_market(&market_id);
    assert_eq!(market.status, MarketStatus::Resolved(Side::Yes));
}

#[test]
fn test_resolve_before_deadline_fails() {
    let s = setup();
    let market_id = create_test_market(&s, 3600);

    let result = s.client.try_resolve_market(&market_id, &Side::Yes);
    assert!(result.is_err());
}

#[test]
fn test_resolve_already_resolved_fails() {
    let s = setup();
    let market_id = create_test_market(&s, 3600);

    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);

    s.client.resolve_market(&market_id, &Side::Yes);
    let result = s.client.try_resolve_market(&market_id, &Side::No);
    assert!(result.is_err());
}

// ===== Claim Winnings Tests =====

#[test]
fn test_winner_takes_all() {
    let s = setup();
    let alice = Address::generate(&s.env);
    let bob = Address::generate(&s.env);
    s.token_admin.mint(&alice, &10_000_000); // 1 XLM
    s.token_admin.mint(&bob, &20_000_000); // 2 XLM

    let market_id = create_test_market(&s, 3600);

    // Alice bets YES, Bob bets NO
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);
    s.client
        .buy_shares(&bob, &market_id, &Side::No, &20_000_000);

    // Resolve as YES
    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);
    s.client.resolve_market(&market_id, &Side::Yes);

    // Alice wins entire pool (30M stroops = 3 XLM)
    let payout = s.client.claim_winnings(&alice, &market_id);
    assert_eq!(payout, 30_000_000);
    assert_eq!(s.token.balance(&alice), 30_000_000);

    // Bob gets nothing
    let payout_bob = s.client.claim_winnings(&bob, &market_id);
    assert_eq!(payout_bob, 0);
    assert_eq!(s.token.balance(&bob), 0);
}

#[test]
fn test_proportional_payout() {
    let s = setup();
    let alice = Address::generate(&s.env);
    let bob = Address::generate(&s.env);
    let charlie = Address::generate(&s.env);

    s.token_admin.mint(&alice, &10_000_000); // 1 XLM
    s.token_admin.mint(&bob, &20_000_000); // 2 XLM
    s.token_admin.mint(&charlie, &30_000_000); // 3 XLM

    let market_id = create_test_market(&s, 3600);

    // Alice: 1 XLM YES, Bob: 2 XLM YES, Charlie: 3 XLM NO
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);
    s.client
        .buy_shares(&bob, &market_id, &Side::Yes, &20_000_000);
    s.client
        .buy_shares(&charlie, &market_id, &Side::No, &30_000_000);

    // Pool = 6 XLM. Resolve YES. Total YES = 3 XLM.
    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);
    s.client.resolve_market(&market_id, &Side::Yes);

    // Alice: 1/3 of 60M = 20M stroops
    let payout_alice = s.client.claim_winnings(&alice, &market_id);
    assert_eq!(payout_alice, 20_000_000);

    // Bob: 2/3 of 60M = 40M stroops
    let payout_bob = s.client.claim_winnings(&bob, &market_id);
    assert_eq!(payout_bob, 40_000_000);

    // Charlie: 0
    let payout_charlie = s.client.claim_winnings(&charlie, &market_id);
    assert_eq!(payout_charlie, 0);
}

#[test]
fn test_no_winners_refund() {
    let s = setup();
    let alice = Address::generate(&s.env);
    let bob = Address::generate(&s.env);

    s.token_admin.mint(&alice, &10_000_000);
    s.token_admin.mint(&bob, &20_000_000);

    let market_id = create_test_market(&s, 3600);

    // Both bet YES
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);
    s.client
        .buy_shares(&bob, &market_id, &Side::Yes, &20_000_000);

    // Resolve as NO -- no winners
    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);
    s.client.resolve_market(&market_id, &Side::No);

    // Both get proportional refund
    let payout_alice = s.client.claim_winnings(&alice, &market_id);
    assert_eq!(payout_alice, 10_000_000); // 1/3 of 30M

    let payout_bob = s.client.claim_winnings(&bob, &market_id);
    assert_eq!(payout_bob, 20_000_000); // 2/3 of 30M
}

#[test]
fn test_double_claim_fails() {
    let s = setup();
    let alice = Address::generate(&s.env);
    s.token_admin.mint(&alice, &10_000_000);

    let market_id = create_test_market(&s, 3600);
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);

    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);
    s.client.resolve_market(&market_id, &Side::Yes);

    s.client.claim_winnings(&alice, &market_id);
    let result = s.client.try_claim_winnings(&alice, &market_id);
    assert!(result.is_err());
}

#[test]
fn test_claim_from_open_market_fails() {
    let s = setup();
    let alice = Address::generate(&s.env);
    s.token_admin.mint(&alice, &10_000_000);

    let market_id = create_test_market(&s, 3600);
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);

    let result = s.client.try_claim_winnings(&alice, &market_id);
    assert!(result.is_err());
}

#[test]
fn test_claim_with_no_position() {
    let s = setup();
    let alice = Address::generate(&s.env);
    let bob = Address::generate(&s.env);
    s.token_admin.mint(&alice, &10_000_000);

    let market_id = create_test_market(&s, 3600);
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &10_000_000);

    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 3601);
    s.client.resolve_market(&market_id, &Side::Yes);

    // Bob has no position, payout should be 0
    let payout = s.client.claim_winnings(&bob, &market_id);
    assert_eq!(payout, 0);
}

// ===== View Function Tests =====

#[test]
fn test_get_market_not_found() {
    let s = setup();
    let result = s.client.try_get_market(&999);
    assert!(result.is_err());
}

#[test]
fn test_get_position_no_position() {
    let s = setup();
    let alice = Address::generate(&s.env);
    let market_id = create_test_market(&s, 3600);

    let pos = s.client.get_position(&market_id, &alice);
    assert_eq!(pos.yes_shares, 0);
    assert_eq!(pos.no_shares, 0);
    assert_eq!(pos.claimed, false);
}

// ===== Full End-to-End Flow =====

#[test]
fn test_full_flow() {
    let s = setup();
    let alice = Address::generate(&s.env);
    let bob = Address::generate(&s.env);

    // Fund users
    s.token_admin.mint(&alice, &50_000_000); // 5 XLM
    s.token_admin.mint(&bob, &50_000_000); // 5 XLM

    // Create market
    let market_id = s.client.create_market(
        &s.admin,
        &String::from_str(&s.env, "Will ETH hit $10k?"),
        &(s.env.ledger().timestamp() + 86400), // 1 day
    );

    // Alice buys 3 XLM YES
    s.client
        .buy_shares(&alice, &market_id, &Side::Yes, &30_000_000);

    // Bob buys 2 XLM NO
    s.client
        .buy_shares(&bob, &market_id, &Side::No, &20_000_000);

    // Verify market state
    let market = s.client.get_market(&market_id);
    assert_eq!(market.total_yes, 30_000_000);
    assert_eq!(market.total_no, 20_000_000);
    assert_eq!(market.pool_balance, 50_000_000);

    // Verify balances
    assert_eq!(s.token.balance(&alice), 20_000_000); // 5 - 3 = 2 XLM left
    assert_eq!(s.token.balance(&bob), 30_000_000); // 5 - 2 = 3 XLM left

    // Advance time and resolve as YES
    s.env
        .ledger()
        .with_mut(|li| li.timestamp = li.timestamp + 86401);
    s.client.resolve_market(&market_id, &Side::Yes);

    // Alice claims: only YES buyer, gets entire pool (5 XLM)
    let payout = s.client.claim_winnings(&alice, &market_id);
    assert_eq!(payout, 50_000_000);
    assert_eq!(s.token.balance(&alice), 70_000_000); // 2 + 5 = 7 XLM

    // Bob gets nothing
    let payout_bob = s.client.claim_winnings(&bob, &market_id);
    assert_eq!(payout_bob, 0);
    assert_eq!(s.token.balance(&bob), 30_000_000); // unchanged
}
