use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Side {
    Yes,
    No,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MarketStatus {
    Open,
    Resolved(Side),
}

#[contracttype]
#[derive(Clone)]
pub struct Market {
    pub creator: Address,
    pub question: String,
    pub deadline: u64,
    pub status: MarketStatus,
    pub total_yes: i128,
    pub total_no: i128,
    pub pool_balance: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Position {
    pub yes_shares: i128,
    pub no_shares: i128,
    pub claimed: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    NextMarketId,
    Market(u64),
    Position(u64, Address),
}
