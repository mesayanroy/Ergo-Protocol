import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { Contract, Asset, Operation, Address, TransactionBuilder, BASE_FEE, Networks, scValToNative, Keypair, rpc, nativeToScVal, Horizon, Account } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const adminSecret = process.env.ADMIN_SECRET_KEY || 'SDUFSOYWDGZT2UXR2VJDPOPQ62TDU5MRDUQRZY2V7322ITVOFSG4DWGR';
const adminKeypair = Keypair.fromSecret(adminSecret);
const adminAddress = adminKeypair.publicKey();

console.log(`Using Admin Address: ${adminAddress}`);

async function getAccount(address) {
  for (let i = 0; i < 5; i++) {
    try {
      return await server.getAccount(address);
    } catch (err) {
      console.log(`Failed to load account, retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error(`Failed to load account ${address}`);
}

const horizonServer = new Horizon.Server('https://horizon-testnet.stellar.org');

async function sendClassicTx(tx) {
  try {
    const response = await horizonServer.submitTransaction(tx);
    return response;
  } catch (err) {
    if (err.response && err.response.data && err.response.data.extras) {
      console.error("Classic Tx failed:", JSON.stringify(err.response.data.extras.result_codes));
    }
    throw err;
  }
}

async function getHorizonAccount(address) {
  for (let i = 0; i < 5; i++) {
    try {
      return await horizonServer.loadAccount(address);
    } catch (err) {
      console.log(`Failed to load Horizon account, retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error(`Failed to load Horizon account ${address}`);
}

async function sendTx(tx) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(adminKeypair);
  const response = await server.sendTransaction(prepared);
  if (response.status === 'ERROR') {
    throw new Error(`Submission failed: ${JSON.stringify(response)}`);
  }
  
  let status = response.status;
  let txResult = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await server.getTransaction(response.hash);
    status = txResult.status;
    if (status === 'SUCCESS' || status === 'FAILED') {
      break;
    }
  }
  
  if (status !== 'SUCCESS') {
    throw new Error(`Transaction execution failed or timed out: ${JSON.stringify(txResult)}`);
  }
  return txResult;
}

function stripTargetFeatures(wasmBytes) {
  if (wasmBytes[0] !== 0x00 || wasmBytes[1] !== 0x61 || wasmBytes[2] !== 0x73 || wasmBytes[3] !== 0x6d) {
    return wasmBytes;
  }
  
  const out = [];
  for (let i = 0; i < 8; i++) {
    out.push(wasmBytes[i]);
  }
  
  let offset = 8;
  while (offset < wasmBytes.length) {
    const sectionId = wasmBytes[offset];
    offset += 1;
    
    let size = 0;
    let shift = 0;
    const sizeBytes = [];
    while (true) {
      const byte = wasmBytes[offset];
      offset += 1;
      sizeBytes.push(byte);
      size |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) {
        break;
      }
      shift += 7;
    }
    
    const sectionData = wasmBytes.slice(offset, offset + size);
    offset += size;
    
    let isTargetFeatures = false;
    if (sectionId === 0) {
      let customOffset = 0;
      let nameLen = 0;
      let nameShift = 0;
      while (true) {
        const byte = sectionData[customOffset];
        customOffset += 1;
        nameLen |= (byte & 0x7f) << nameShift;
        if (!(byte & 0x80)) {
          break;
        }
        nameShift += 7;
      }
      
      const nameBytes = sectionData.slice(customOffset, customOffset + nameLen);
      const name = Buffer.from(nameBytes).toString('utf8');
      if (name === 'target_features') {
        isTargetFeatures = true;
      }
    }
    
    if (isTargetFeatures) {
      console.log(`  Stripping target_features custom section (size: ${size})`);
    } else {
      out.push(sectionId);
      out.push(...sizeBytes);
      out.push(...sectionData);
    }
  }
  
  return Buffer.from(out);
}

async function deployContract(wasmPath, name) {
  const tempWasmPath = wasmPath + '.tmp';
  try {
    console.log(`\nOptimizing ${name} with wasm-opt...`);
    execSync(`npx wasm-opt --mvp-features "${wasmPath}" -o "${tempWasmPath}"`);
    if (fs.existsSync(tempWasmPath)) {
      wasmPath = tempWasmPath;
    } else {
      console.warn(`Warning: wasm-opt did not produce output for ${name}, using unoptimized version.`);
    }
  } catch (err) {
    console.warn(`Warning: wasm-opt failed for ${name}, using unoptimized version:`, err.message);
  }
  let wasmBytes = fs.readFileSync(wasmPath);
  if (fs.existsSync(tempWasmPath)) {
    fs.unlinkSync(tempWasmPath);
  }
  wasmBytes = stripTargetFeatures(wasmBytes);
  const wasmHash = createHash('sha256').update(wasmBytes).digest();
  const salt = randomBytes(32);

  const account = await getAccount(adminAddress);

  // Build createContract transaction
  const createOp = Operation.createCustomContract({
    wasmHash,
    address: Address.fromString(adminAddress),
    salt
  });

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
  .addOperation(createOp)
  .setTimeout(60)
  .build();

  let sim = await server.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationError(sim)) {
    console.log(`Wasm for ${name} not installed. Installing WASM...`);
    
    const accountForUpload = await getAccount(adminAddress);
    const uploadOp = Operation.uploadContractWasm({ wasm: wasmBytes });
    const uploadTx = new TransactionBuilder(accountForUpload, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(uploadOp)
    .setTimeout(60)
    .build();

    await sendTx(uploadTx);
    console.log(`Wasm uploaded successfully. Now creating contract instance...`);
    
    const accountForCreate = await getAccount(adminAddress);
    const txRetry = new TransactionBuilder(accountForCreate, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(createOp)
    .setTimeout(60)
    .build();
    
    sim = await server.simulateTransaction(txRetry);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Create contract simulation failed after upload: ${sim.error}`);
    }
    tx = txRetry;
  }

  const contractId = scValToNative(sim.result.retval);
  console.log(`Instantiating ${name} as contract ID: ${contractId}`);

  await sendTx(tx);
  console.log(`✓ ${name} deployed successfully.`);
  return contractId;
}

const deriveKeypair = (symbol) => {
  const hash = createHash('sha256').update(adminSecret + symbol).digest();
  return Keypair.fromRawEd25519Seed(hash);
};

async function ensureAccountExists(keypair) {
  const addr = keypair.publicKey();
  try {
    await server.getAccount(addr);
    console.log(`Account ${addr} already exists.`);
  } catch (err) {
    console.log(`Creating and funding account ${addr}...`);
    const adminAcc = await getHorizonAccount(adminAddress);
    const tx = new TransactionBuilder(adminAcc, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
     .addOperation(Operation.createAccount({
      destination: addr,
      startingBalance: '5.0'
    }))
    .setTimeout(60)
    .build();
    tx.sign(adminKeypair);
    await sendClassicTx(tx);
    console.log(`✓ Account ${addr} created.`);
  }
}

async function ensureTrustline(asset) {
  try {
    const acc = await getHorizonAccount(adminAddress);
    const hasTrust = acc.balances.some(b => b.asset_code === asset.code && b.asset_issuer === asset.issuer);
    if (hasTrust) {
      console.log(`Trustline for ${asset.code} already exists.`);
      return;
    }
  } catch (err) {}

  console.log(`Creating trustline for ${asset.code}...`);
  const adminAcc = await getHorizonAccount(adminAddress);
  const tx = new TransactionBuilder(adminAcc, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
   .addOperation(Operation.changeTrust({ asset }))
  .setTimeout(60)
  .build();
  tx.sign(adminKeypair);
  await sendClassicTx(tx);
  console.log(`✓ Trustline for ${asset.code} created.`);
}

async function ensureAdminTokens(asset, issuerKeypair) {
  const acc = await getHorizonAccount(adminAddress);
  const balanceItem = acc.balances.find(b => b.asset_code === asset.code && b.asset_issuer === asset.issuer);
  const balance = balanceItem ? parseFloat(balanceItem.balance) : 0;
  if (balance >= 100000000) {
    console.log(`Admin already has ${balance} of ${asset.code}.`);
    return;
  }

  console.log(`Minting/paying 10B ${asset.code} to admin...`);
  const issuerAddress = issuerKeypair.publicKey();
  const issuerAcc = await getHorizonAccount(issuerAddress);
  const tx = new TransactionBuilder(issuerAcc, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
   .addOperation(Operation.payment({
    destination: adminAddress,
    asset,
    amount: '10000000000.0000000'
  }))
  .setTimeout(60)
  .build();
  
  tx.sign(issuerKeypair);
  await sendClassicTx(tx);
  console.log(`✓ Minted 10B ${asset.code} to admin.`);
}

async function getOrCreateSac(asset) {
  const contractId = asset.contractId(Networks.TESTNET);
  console.log(`SAC contract ID for ${asset.code}: ${contractId}`);

  // Check if it's already deployed and active via simulation
  try {
    const dummyAccount = new Account(adminAddress, '0');
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call('decimals'))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (!rpc.Api.isSimulationError(sim)) {
      console.log(`SAC contract for ${asset.code} already deployed and active.`);
      return contractId;
    }
  } catch (err) {
    console.log(`SAC check simulation failed for ${asset.code}:`, err.message);
  }

  // Not deployed or inactive, so wrap it
  console.log(`Wrapping classic asset ${asset.code} to deploy SAC...`);
  const adminAcc = await getAccount(adminAddress);
  const tx = new TransactionBuilder(adminAcc, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
  .addOperation(Operation.createStellarAssetContract({ asset }))
  .setTimeout(60)
  .build();
  tx.sign(adminKeypair);
  await sendTx(tx);
  console.log(`✓ Wrapped token created/SAC deployed for ${asset.code}.`);
  return contractId;
}

async function main() {
  console.log('=== ERGO PROTOCOL — FULL TESTNET DEPLOYMENT & SETUP ===');

  const latestLedgerRes = await server.getLatestLedger();
  const latestLedger = latestLedgerRes.sequence;
  const approveExpirationLedger = latestLedger + 100000;
  console.log(`Current ledger: ${latestLedger}, setting approve expiration to: ${approveExpirationLedger}`);

  const baseWasmDir = '../target/wasm32-unknown-unknown/release';
  
  // 1. Deploy Core Contracts
  const oracle = await deployContract(`${baseWasmDir}/oracle_aggregator.wasm`, 'Oracle Aggregator');
  const backstop = await deployContract(`${baseWasmDir}/backstop.wasm`, 'Backstop');
  const compliance = await deployContract(`${baseWasmDir}/compliance.wasm`, 'Compliance');
  const corePool = await deployContract(`${baseWasmDir}/core_pool.wasm`, 'Core Pool');
  const liquidationEngine = await deployContract(`${baseWasmDir}/liquidation_engine.wasm`, 'Liquidation Engine');
  const governance = await deployContract(`${baseWasmDir}/governance.wasm`, 'Governance');

  // 2. Setup Deterministic Classic Assets & SAC Contracts
  const usdcIssuer = deriveKeypair('USDC_v3');
  const eurcIssuer = deriveKeypair('EURC_v3');
  const wbtcIssuer = deriveKeypair('wBTC_v3');
  const wethIssuer = deriveKeypair('wETH_v3');
  const ergoIssuer = deriveKeypair('ERGO_v3');

  await ensureAccountExists(usdcIssuer);
  await ensureAccountExists(eurcIssuer);
  await ensureAccountExists(wbtcIssuer);
  await ensureAccountExists(wethIssuer);
  await ensureAccountExists(ergoIssuer);

  const usdcAsset = new Asset('USDC', usdcIssuer.publicKey());
  const eurcAsset = new Asset('EURC', eurcIssuer.publicKey());
  const wbtcAsset = new Asset('wBTC', wbtcIssuer.publicKey());
  const wethAsset = new Asset('wETH', wethIssuer.publicKey());
  const ergoAsset = new Asset('ERGO', ergoIssuer.publicKey());

  await ensureTrustline(usdcAsset);
  await ensureTrustline(eurcAsset);
  await ensureTrustline(wbtcAsset);
  await ensureTrustline(wethAsset);
  await ensureTrustline(ergoAsset);

  await ensureAdminTokens(usdcAsset, usdcIssuer);
  await ensureAdminTokens(eurcAsset, eurcIssuer);
  await ensureAdminTokens(wbtcAsset, wbtcIssuer);
  await ensureAdminTokens(wethAsset, wethIssuer);
  await ensureAdminTokens(ergoAsset, ergoIssuer);

  const usdc = await getOrCreateSac(usdcAsset);
  const eurc = await getOrCreateSac(eurcAsset);
  const wbtc = await getOrCreateSac(wbtcAsset);
  const weth = await getOrCreateSac(wethAsset);
  const ergo = await getOrCreateSac(ergoAsset);
  const xlmSac = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // native XLM SAC

  console.log('\n--- INITIALIZING CONTRACTS ---');

  // Helper to call contract methods
  const callContract = async (contractId, method, args) => {
    const account = await getAccount(adminAddress);
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();
    await sendTx(tx);
  };

  // Step A: Initialize Oracle Aggregator
  console.log('Initializing Oracle Aggregator...');
  await callContract(oracle, 'initialize', [
    Address.fromString(adminAddress).toScVal()
  ]);

  // Step B: Initialize Compliance
  console.log('Initializing Compliance...');
  await callContract(compliance, 'initialize', [
    Address.fromString(adminAddress).toScVal()
  ]);

  // Step C: Initialize Core Pool
  console.log('Initializing Core Pool...');
  await callContract(corePool, 'initialize', [
    Address.fromString(adminAddress).toScVal()
  ]);

  // Step D: Set Core Pool Dependencies
  console.log('Registering Core Pool Dependencies...');
  await callContract(corePool, 'set_dependency', [
    Address.fromString(adminAddress).toScVal(),
    nativeToScVal('oracle', { type: 'symbol' }),
    Address.fromString(oracle).toScVal()
  ]);
  await callContract(corePool, 'set_dependency', [
    Address.fromString(adminAddress).toScVal(),
    nativeToScVal('backstop', { type: 'symbol' }),
    Address.fromString(backstop).toScVal()
  ]);
  await callContract(corePool, 'set_dependency', [
    Address.fromString(adminAddress).toScVal(),
    nativeToScVal('compliance', { type: 'symbol' }),
    Address.fromString(compliance).toScVal()
  ]);
  await callContract(corePool, 'set_dependency', [
    Address.fromString(adminAddress).toScVal(),
    nativeToScVal('liquidation_engine', { type: 'symbol' }),
    Address.fromString(liquidationEngine).toScVal()
  ]);

  // Step E: Initialize Backstop
  console.log('Initializing Backstop...');
  await callContract(backstop, 'initialize', [
    Address.fromString(adminAddress).toScVal(), // governance
    Address.fromString(liquidationEngine).toScVal(),
    Address.fromString(usdc).toScVal()
  ]);

  // Step F: Initialize Liquidation Engine
  console.log('Initializing Liquidation Engine...');
  await callContract(liquidationEngine, 'initialize', [
    Address.fromString(adminAddress).toScVal(),
    Address.fromString(corePool).toScVal(),
    Address.fromString(backstop).toScVal(),
    Address.fromString(usdc).toScVal()
  ]);

  // Step G: Initialize Governance
  console.log('Initializing Governance...');
  await callContract(governance, 'initialize', [
    Address.fromString(adminAddress).toScVal()
  ]);

  // Step H: Token Metadata is handled by SAC
  console.log('Skipping token metadata initialization (handled by SAC)...');

  console.log('\n--- CREATING LENDING POOL MARKETS ---');

  const createPoolMarket = async (marketId, assetAddress, cf, liqThreshold, poolType, emode, ceiling) => {
    console.log(`Creating market ${marketId}...`);
    await callContract(corePool, 'create_market', [
      Address.fromString(adminAddress).toScVal(),
      nativeToScVal(marketId, { type: 'symbol' }),
      nativeToScVal(poolType, { type: 'u32' }),
      Address.fromString(assetAddress).toScVal(),
      nativeToScVal(cf, { type: 'u32' }),
      nativeToScVal(liqThreshold, { type: 'u32' }),
      nativeToScVal(emode, { type: 'u32' }),
      nativeToScVal(ceiling, { type: 'i128' })
    ]);
  };

  const maxCeiling = 99999999999999999999n;
  await createPoolMarket('xlm_shared', xlmSac, 7500, 8000, 0, 1, maxCeiling);
  await createPoolMarket('usdc_shared', usdc, 8500, 9000, 0, 1, maxCeiling);
  await createPoolMarket('eurc_shared', eurc, 8500, 9000, 0, 1, maxCeiling);
  await createPoolMarket('wbtc_satellite', wbtc, 7000, 7500, 1, 2, 5_000_000_0000000n);
  await createPoolMarket('weth_satellite', weth, 7500, 8000, 1, 2, 3_000_000_0000000n);
  await createPoolMarket('ergo_satellite', ergo, 6500, 7000, 1, 0, 1_000_000_0000000n);

  console.log('\n--- SETTING DEFAULT COMPLIANCE ISSUERS ---');
  const testUserAddress = 'GARN7A6OJKPR3HAPVIKM6GRUD7KMEHYQ76VJJCO4AAKQ6ETEKFQPQ24T';
  const registerIssuer = async (marketId) => {
    console.log(`Setting issuer for ${marketId} to ${testUserAddress}...`);
    await callContract(compliance, 'set_issuer', [
      Address.fromString(adminAddress).toScVal(),
      nativeToScVal(marketId, { type: 'symbol' }),
      Address.fromString(testUserAddress).toScVal()
    ]);
  };

  await registerIssuer('xlm_shared');
  await registerIssuer('usdc_shared');
  await registerIssuer('eurc_shared');
  await registerIssuer('wbtc_satellite');
  await registerIssuer('weth_satellite');
  await registerIssuer('ergo_satellite');

  console.log('\n--- SEEDING INITIAL POOL LIQUIDITY ---');

  const seedLiquidity = async (marketId, assetAddress, amount) => {
    console.log(`Seeding initial liquidity for ${marketId}...`);
    // 1. Approve Core Pool
    await callContract(assetAddress, 'approve', [
      Address.fromString(adminAddress).toScVal(),
      Address.fromString(corePool).toScVal(),
      nativeToScVal(amount, { type: 'i128' }),
      nativeToScVal(approveExpirationLedger, { type: 'u32' })
    ]);
    // 2. Supply
    await callContract(corePool, 'supply', [
      Address.fromString(adminAddress).toScVal(),
      nativeToScVal(marketId, { type: 'symbol' }),
      nativeToScVal(amount, { type: 'i128' })
    ]);
  };

  // Seed XLM (Requires admin classic wallet balance of XLM, which has 10,000, let's seed 1,000 XLM)
  await seedLiquidity('xlm_shared', xlmSac, 1000_0000000n);
  await seedLiquidity('usdc_shared', usdc, 50_000_0000000n);
  await seedLiquidity('eurc_shared', eurc, 30_000_0000000n);
  await seedLiquidity('wbtc_satellite', wbtc, 5_0000000n);
  await seedLiquidity('weth_satellite', weth, 50_0000000n);
  await seedLiquidity('ergo_satellite', ergo, 10_000_0000000n);

  console.log('\n--- WRITING DEPLOYED ADDRESSES TO ENV ---');

  const testnetEnv = `
# ── Stellar Testnet Contract Configuration (Automated) ──────────────
NEXT_PUBLIC_TESTNET_CORE_POOL_CONTRACT_ID='${corePool}'
NEXT_PUBLIC_TESTNET_ORACLE_AGGREGATOR_CONTRACT_ID='${oracle}'
NEXT_PUBLIC_TESTNET_BACKSTOP_CONTRACT_ID='${backstop}'
NEXT_PUBLIC_TESTNET_LIQUIDATION_ENGINE_CONTRACT_ID='${liquidationEngine}'
NEXT_PUBLIC_TESTNET_GOVERNANCE_CONTRACT_ID='${governance}'
NEXT_PUBLIC_TESTNET_COMPLIANCE_CONTRACT_ID='${compliance}'

# ── Stellar Testnet Asset Contracts (SACs) / Tokens (Automated) ─────
NEXT_PUBLIC_TESTNET_XLM_SAC='${xlmSac}'
NEXT_PUBLIC_TESTNET_USDC_CONTRACT_ID='${usdc}'
NEXT_PUBLIC_TESTNET_EURC_CONTRACT_ID='${eurc}'
NEXT_PUBLIC_TESTNET_WBTC_CONTRACT_ID='${wbtc}'
NEXT_PUBLIC_TESTNET_WETH_CONTRACT_ID='${weth}'
NEXT_PUBLIC_TESTNET_ERGO_TOKEN_CONTRACT_ID='${ergo}'

# ── Stellar Testnet Classic Asset Issuers (Automated) ───────────────
NEXT_PUBLIC_TESTNET_USDC_ISSUER='${usdcIssuer.publicKey()}'
NEXT_PUBLIC_TESTNET_EURC_ISSUER='${eurcIssuer.publicKey()}'
NEXT_PUBLIC_TESTNET_WBTC_ISSUER='${wbtcIssuer.publicKey()}'
NEXT_PUBLIC_TESTNET_WETH_ISSUER='${wethIssuer.publicKey()}'
NEXT_PUBLIC_TESTNET_ERGO_ISSUER='${ergoIssuer.publicKey()}'
`;

  const appendToEnv = (filePath) => {
    let content = '';
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
      // Remove any previously appended automated testnet sections to prevent duplicates
      content = content.split('# ── Stellar Testnet Contract Configuration (Automated)')[0].trim();
    }
    fs.writeFileSync(filePath, content + '\n' + testnetEnv.trim() + '\n');
  };

  appendToEnv('.env.local');
  appendToEnv('../.env.local');

  const serverEnvPath = '../server/.env';
  if (fs.existsSync(serverEnvPath)) {
    let serverEnv = fs.readFileSync(serverEnvPath, 'utf8');
    // If server network is public/mainnet, keep public envs, but let's write testnet variants too
    if (serverEnv.includes('TESTNET_CORE_POOL_CONTRACT_ID')) {
      serverEnv = serverEnv.replace(/TESTNET_CORE_POOL_CONTRACT_ID=.*/, `TESTNET_CORE_POOL_CONTRACT_ID=${corePool}`);
    } else {
      serverEnv += `\nTESTNET_CORE_POOL_CONTRACT_ID=${corePool}\n`;
    }
    fs.writeFileSync(serverEnvPath, serverEnv);
  }

  console.log('\n=== DEPLOYMENT AND SETUP COMPLETE! ===');
  console.log('All contracts deployed, initialized, and seeded.');
}

main().catch(console.error);
