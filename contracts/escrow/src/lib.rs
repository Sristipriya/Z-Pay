#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol, symbol_short, String};

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
    pub fn create(
        env: Env,
        escrow_id: String,
        client: Address,
        freelancer: Address,
        amount: i128,
        token: Address,
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
            token,
            funded: false,
            delivered: false,
            released: false,
            disputed: false,
            arbiter,
        };
        
        env.storage().instance().set(&key, &escrow);
        
        let count: u32 = env.storage().instance().get(&DataKey::EscrowCount).unwrap_or(0);
        env.storage().instance().set(&DataKey::EscrowCount, &(count + 1));
        
        env.events().publish((symbol_short!("created"),), client);
    }
    
    pub fn fund(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("Escrow not found");
        escrow.client.require_auth();
        
        if escrow.funded {
            panic!("Already funded");
        }
        
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&escrow.client, &env.current_contract_address(), &escrow.amount);
        
        escrow.funded = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("funded"),), escrow.amount);
    }
    
    pub fn deliver(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("Escrow not found");
        escrow.freelancer.require_auth();
        
        if !escrow.funded {
            panic!("Not funded");
        }
        if escrow.delivered {
            panic!("Already delivered");
        }
        
        escrow.delivered = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("deliver"),), true);
    }
    
    pub fn release(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("Escrow not found");
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
        
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.freelancer, &escrow.amount);
        
        escrow.released = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("release"),), escrow.amount);
    }
    
    pub fn dispute(env: Env, escrow_id: String) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("Escrow not found");
        
        let is_client = env.current_contract_address() == escrow.client;
        let is_freelancer = env.current_contract_address() == escrow.freelancer;
        
        if !is_client && !is_freelancer {
            if is_client {
                escrow.client.require_auth();
            } else {
                escrow.freelancer.require_auth();
            }
        }
        
        if !escrow.funded {
            panic!("Not funded");
        }
        if escrow.released {
            panic!("Already released");
        }
        
        escrow.disputed = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("dispute"),), true);
    }
    
    pub fn resolve(env: Env, escrow_id: String, pay_freelancer: bool) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("Escrow not found");
        escrow.arbiter.require_auth();
        
        if !escrow.disputed {
            panic!("Not disputed");
        }
        if escrow.released {
            panic!("Already resolved");
        }
        
        let token_client = token::Client::new(&env, &escrow.token);
        let recipient = if pay_freelancer {
            escrow.freelancer.clone()
        } else {
            escrow.client.clone()
        };
        
        token_client.transfer(&env.current_contract_address(), &recipient, &escrow.amount);
        
        escrow.released = true;
        env.storage().instance().set(&key, &escrow);
        env.events().publish((symbol_short!("resolve"),), pay_freelancer);
    }
    
    pub fn get_escrow(env: Env, escrow_id: String) -> Escrow {
        let key = DataKey::Escrow(escrow_id);
        env.storage().instance().get(&key).expect("Escrow not found")
    }
    
    pub fn get_escrow_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::EscrowCount).unwrap_or(0)
    }
}
