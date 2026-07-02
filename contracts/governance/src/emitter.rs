use soroban_sdk::{Address, Env, Symbol, IntoVal, token};

/// Emits governance event placeholders.
pub fn emit_action(env: &Env, action: Symbol) {
    env.events().publish((Symbol::new(env, "GovAction"),), action);
}

/// Mints/distributes governance token rewards to backstop depositors proportional to their pool shares.
pub fn distribute_emissions(
    env: &Env,
    backstop: Address,
    gov_token: Address,
    pool_id: u32,
    user: Address,
    base_rewards: i128,
) {
    // Fetch user share from backstop (in bps: 0 to 10,000)
    let share: i128 = env.invoke_contract(
        &backstop,
        &Symbol::new(env, "calculate_share"),
        soroban_sdk::vec![env, pool_id.into_val(env), user.clone().into_val(env)],
    );

    if share > 0 {
        let reward_amt = base_rewards.saturating_mul(share) / 10_000;
        if reward_amt > 0 {
            // Mint governance token rewards to backstop depositor
            let token_client = token::StellarAssetClient::new(env, &gov_token);
            token_client.mint(&user, &reward_amt);
        }
    }
}
