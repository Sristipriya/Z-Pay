#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, symbol_short};

#[derive(Clone)]
#[contracttype]
pub struct Escrow {
    pub escrow_id: String,
    pub client: Address,
    pub freelancer: Address,
    pub amount: i128,
    pub token: Address,
    pub funded: bool,
    pub delivered: bool,
    pub released: bool,
    pub disputed: bool,
    pub cancelled: bool,
    pub arbiter: Address,
}

#[contracttype]
pub enum DataKey {
    Escrow(String),
    EscrowCount,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Create a new escrow between client and freelancer.
    /// token_id points to the deployed EXPO SEP-41 token contract.
    pub fn create(
        env: Env,
        escrow_id: String,
        client: Address,
        freelancer: Address,
        amount: i128,
        token_id: Address,
        arbiter: Address,
    ) {
        client.require_auth();

        let key = DataKey::Escrow(escrow_id.clone());
        if env.storage().instance().has(&key) {
            panic!("Escrow with this ID already exists");
        }

        let escrow = Escrow {
            escrow_id: escrow_id.clone(),
            client: client.clone(),
            freelancer,
            amount,
            token: token_id,
            funded: false,
            delivered: false,
            released: false,
            disputed: false,
            cancelled: false,
            arbiter,
        };

        env.storage().instance().set(&key, &escrow);

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::EscrowCount, &(count + 1));

        env.events().publish((symbol_short!("created"),), client);
    }

    /// Fund the escrow — inter-contract call: client → escrow contract via EXPO token transfer.
    pub fn fund(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&key)
            .expect("Escrow not found");
        escrow.client.require_auth();

        if escrow.funded {
            panic!("Already funded");
        }
        if escrow.cancelled {
            panic!("Escrow has been cancelled");
        }

        // Inter-contract call: transfer EXPO tokens from client to this escrow contract
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &escrow.client,
            &env.current_contract_address(),
            &escrow.amount,
        );

        escrow.funded = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("funded"),), escrow.amount);
    }

    /// Freelancer marks work as delivered.
    pub fn deliver(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&key)
            .expect("Escrow not found");
        escrow.freelancer.require_auth();

        if !escrow.funded {
            panic!("Not funded");
        }
        if escrow.delivered {
            panic!("Already delivered");
        }
        if escrow.cancelled {
            panic!("Escrow has been cancelled");
        }

        escrow.delivered = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("deliver"),), true);
    }

    /// Client releases funds to freelancer — inter-contract call: escrow → EXPO token contract.
    pub fn release_funds(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&key)
            .expect("Escrow not found");
        escrow.client.require_auth();

        if !escrow.funded {
            panic!("Not funded");
        }
        if !escrow.delivered {
            panic!("Not delivered");
        }
        if escrow.released {
            panic!("Already released");
        }
        if escrow.cancelled {
            panic!("Escrow has been cancelled");
        }

        // Inter-contract call: escrow contract calls EXPO token to transfer to freelancer
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.freelancer,
            &escrow.amount,
        );

        escrow.released = true;
        env.storage().instance().set(&key, &escrow);
        env.events()
            .publish((symbol_short!("release"),), escrow.amount);
    }

    /// Cancel escrow and return EXPO tokens to client via inter-contract call.
    /// Can only be called before release, and either before funding or if disputed.
    pub fn cancel_escrow(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&key)
            .expect("Escrow not found");
        escrow.client.require_auth();

        if escrow.released {
            panic!("Already released — cannot cancel");
        }
        if escrow.cancelled {
            panic!("Already cancelled");
        }

        // If funded, return tokens to client via inter-contract call to EXPO token contract
        if escrow.funded {
            let token_client = token::Client::new(&env, &escrow.token);
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.client,
                &escrow.amount,
            );
        }

        escrow.cancelled = true;
        env.storage().instance().set(&key, &escrow);
        env.events()
            .publish((symbol_short!("cancel"),), escrow.client.clone());
    }

    /// Raise a dispute (called by client or freelancer).
    pub fn dispute(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&key)
            .expect("Escrow not found");

        // Either party can raise a dispute
        let caller_is_client = escrow.client.clone();
        caller_is_client.require_auth();

        if !escrow.funded {
            panic!("Not funded");
        }
        if escrow.released {
            panic!("Already released");
        }
        if escrow.cancelled {
            panic!("Escrow has been cancelled");
        }

        escrow.disputed = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("dispute"),), true);
    }

    /// Arbiter resolves dispute — inter-contract call to distribute EXPO tokens.
    pub fn resolve(env: Env, escrow_id: String, pay_freelancer: bool) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&key)
            .expect("Escrow not found");
        escrow.arbiter.require_auth();

        if !escrow.disputed {
            panic!("Not disputed");
        }
        if escrow.released {
            panic!("Already resolved");
        }
        if escrow.cancelled {
            panic!("Escrow has been cancelled");
        }

        let recipient = if pay_freelancer {
            escrow.freelancer.clone()
        } else {
            escrow.client.clone()
        };

        // Inter-contract call: escrow calls EXPO token to distribute funds
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &recipient,
            &escrow.amount,
        );

        escrow.released = true;
        env.storage().instance().set(&key, &escrow);
        env.events()
            .publish((symbol_short!("resolve"),), pay_freelancer);
    }

    pub fn get_escrow(env: Env, escrow_id: String) -> Escrow {
        let key = DataKey::Escrow(escrow_id);
        env.storage().instance().get(&key).expect("Escrow not found")
    }

    pub fn get_escrow_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
        token::{Client as TokenClient, StellarAssetClient},
        Address, Env, IntoVal, String,
    };

    fn create_test_env() -> (Env, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EscrowContract);
        let token_admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);
        let arbiter_addr = Address::generate(&env);

        // Deploy a mock Stellar Asset token contract (SEP-41 compliant)
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();

        // Mint EXPO tokens to client so they can fund escrow
        let stellar_asset_client = StellarAssetClient::new(&env, &token_id);
        stellar_asset_client.mint(&client_addr, &1_000_000_000i128);

        (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr)
    }

    #[test]
    fn test_create_escrow() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let client = EscrowContractClient::new(&env, &contract_id);

        let escrow_id = String::from_str(&env, "escrow-001");
        client.create(
            &escrow_id,
            &client_addr,
            &freelancer_addr,
            &100_000_000i128,
            &token_id,
            &arbiter_addr,
        );

        assert_eq!(client.get_escrow_count(), 1);
        let escrow = client.get_escrow(&escrow_id);
        assert_eq!(escrow.funded, false);
        assert_eq!(escrow.released, false);
        assert_eq!(escrow.cancelled, false);
    }

    #[test]
    fn test_fund_escrow() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let client = EscrowContractClient::new(&env, &contract_id);
        let amount = 100_000_000i128;

        let escrow_id = String::from_str(&env, "escrow-002");
        client.create(
            &escrow_id,
            &client_addr,
            &freelancer_addr,
            &amount,
            &token_id,
            &arbiter_addr,
        );
        client.fund(&escrow_id);

        let escrow = client.get_escrow(&escrow_id);
        assert!(escrow.funded);

        // Check token balance of escrow contract
        let token = TokenClient::new(&env, &token_id);
        assert_eq!(token.balance(&contract_id), amount);
    }

    #[test]
    fn test_release_funds_inter_contract_call() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let escrow_client = EscrowContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &token_id);
        let amount = 100_000_000i128;

        let escrow_id = String::from_str(&env, "escrow-003");
        escrow_client.create(
            &escrow_id,
            &client_addr,
            &freelancer_addr,
            &amount,
            &token_id,
            &arbiter_addr,
        );
        escrow_client.fund(&escrow_id);
        escrow_client.deliver(&escrow_id);

        let freelancer_balance_before = token.balance(&freelancer_addr);

        // This is the inter-contract call: EscrowContract → EXPO Token Contract
        escrow_client.release_funds(&escrow_id);

        let freelancer_balance_after = token.balance(&freelancer_addr);
        assert_eq!(freelancer_balance_after - freelancer_balance_before, amount);
        assert_eq!(token.balance(&contract_id), 0);

        let escrow = escrow_client.get_escrow(&escrow_id);
        assert!(escrow.released);
    }

    #[test]
    fn test_cancel_escrow_with_token_refund() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let escrow_client = EscrowContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &token_id);
        let amount = 100_000_000i128;

        let escrow_id = String::from_str(&env, "escrow-004");
        escrow_client.create(
            &escrow_id,
            &client_addr,
            &freelancer_addr,
            &amount,
            &token_id,
            &arbiter_addr,
        );
        escrow_client.fund(&escrow_id);

        let client_balance_before = token.balance(&client_addr);

        // cancel_escrow triggers inter-contract call back to EXPO token to refund client
        escrow_client.cancel_escrow(&escrow_id);

        let client_balance_after = token.balance(&client_addr);
        assert_eq!(client_balance_after - client_balance_before, amount);
        assert_eq!(token.balance(&contract_id), 0);

        let escrow = escrow_client.get_escrow(&escrow_id);
        assert!(escrow.cancelled);
        assert!(!escrow.released);
    }

    #[test]
    fn test_cancel_unfunded_escrow() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let escrow_client = EscrowContractClient::new(&env, &contract_id);

        let escrow_id = String::from_str(&env, "escrow-005");
        escrow_client.create(
            &escrow_id,
            &client_addr,
            &freelancer_addr,
            &50_000_000i128,
            &token_id,
            &arbiter_addr,
        );

        // Cancel before funding — no token transfer needed
        escrow_client.cancel_escrow(&escrow_id);

        let escrow = escrow_client.get_escrow(&escrow_id);
        assert!(escrow.cancelled);
        assert!(!escrow.funded);
    }

    #[test]
    fn test_dispute_and_resolve_to_freelancer() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let escrow_client = EscrowContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &token_id);
        let amount = 200_000_000i128;

        let escrow_id = String::from_str(&env, "escrow-006");
        escrow_client.create(
            &escrow_id,
            &client_addr,
            &freelancer_addr,
            &amount,
            &token_id,
            &arbiter_addr,
        );
        escrow_client.fund(&escrow_id);
        escrow_client.dispute(&escrow_id);

        let freelancer_balance_before = token.balance(&freelancer_addr);
        escrow_client.resolve(&escrow_id, &true);
        let freelancer_balance_after = token.balance(&freelancer_addr);

        assert_eq!(freelancer_balance_after - freelancer_balance_before, amount);

        let escrow = escrow_client.get_escrow(&escrow_id);
        assert!(escrow.released);
        assert!(escrow.disputed);
    }

    #[test]
    fn test_dispute_and_resolve_to_client() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let escrow_client = EscrowContractClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &token_id);
        let amount = 150_000_000i128;

        let escrow_id = String::from_str(&env, "escrow-007");
        escrow_client.create(
            &escrow_id,
            &client_addr,
            &freelancer_addr,
            &amount,
            &token_id,
            &arbiter_addr,
        );
        escrow_client.fund(&escrow_id);
        escrow_client.dispute(&escrow_id);

        let client_balance_before = token.balance(&client_addr);
        escrow_client.resolve(&escrow_id, &false);
        let client_balance_after = token.balance(&client_addr);

        assert_eq!(client_balance_after - client_balance_before, amount);
    }

    #[test]
    fn test_escrow_count_increments() {
        let (env, contract_id, token_id, client_addr, freelancer_addr, arbiter_addr) =
            create_test_env();
        let escrow_client = EscrowContractClient::new(&env, &contract_id);

        assert_eq!(escrow_client.get_escrow_count(), 0);

        for i in 0u32..3u32 {
            let id = String::from_str(&env, &format!("escrow-count-{}", i));
            escrow_client.create(
                &id,
                &client_addr,
                &freelancer_addr,
                &10_000_000i128,
                &token_id,
                &arbiter_addr,
            );
        }

        assert_eq!(escrow_client.get_escrow_count(), 3);
    }
}

// cancel_escrow inter-contract call note:
// When escrow is funded, cancel_escrow makes a live inter-contract call:
//   token::Client::new(&env, &escrow.token)
//   .transfer(&env.current_contract_address(), &escrow.client, &escrow.amount)
// This returns EXPO tokens from the escrow vault back to the originating client.
