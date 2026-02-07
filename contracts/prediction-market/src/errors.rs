use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    MarketNotFound = 4,
    MarketClosed = 5,
    MarketNotResolved = 6,
    MarketAlreadyResolved = 7,
    DeadlineNotReached = 8,
    InvalidAmount = 9,
    NothingToClaim = 10,
    AlreadyClaimed = 11,
    InvalidDeadline = 12,
}
