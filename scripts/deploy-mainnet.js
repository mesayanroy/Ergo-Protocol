const { createHash, randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Contract, Asset, Operation, Address, TransactionBuilder, BASE_FEE, Networks, scValToNative, Keypair, rpc, nativeToScVal } = require('@stellar/stellar-sdk');
require('dotenv').config();

const server = new rpc.Server(process.env.SOROBAN_RPC_URL || 'https://mainnet.sorobanrpc.com');
const deployerSecret = process.env.DEPLOYER_SECRET_KEY || process.env.STELLAR_AGENT_SECRET || 'SBPJDMW7CAHWOWL2F2JXXZPD5O4FKAGRUXJTULR3MIYXBNUERO22QRJJ';
const deployerKeypair = Keypair.fromSecret(deployerSecret);
const deployerAddress = deployerKeypair.publicKey();

console.log(`Using Deployer Address: ${deployerAddress}`);

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

async function sendTx(tx, signer = deployerKeypair) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(signer);
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
  let wasmBytes = fs.readFileSync(wasmPath);
  wasmBytes = stripTargetFeatures(wasmBytes);
  const wasmHash = createHash('sha256').update(wasmBytes).digest();
  const salt = randomBytes(32);
  const account = await getAccount(deployerAddress);

  const createOp = Operation.createCustomContract({
    wasmHash,
    address: Address.fromString(deployerAddress),
    salt
  });

  let tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: Networks.PUBLIC
  })
  .addOperation(createOp)
  .setTimeout(60)
  .build();

  let sim = await server.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationError(sim)) {
    console.log(`Wasm for ${name} not installed. Installing WASM...`);
    const accountForUpload = await getAccount(deployerAddress);
    const uploadOp = Operation.uploadContractWasm({ wasm: wasmBytes });
    const uploadTx = new TransactionBuilder(accountForUpload, {
      fee: '10000000',
      networkPassphrase: Networks.PUBLIC
    })
    .addOperation(uploadOp)
    .setTimeout(60)
    .build();

    await sendTx(uploadTx);
    console.log(`Wasm uploaded successfully. Now creating contract instance...`);
    const accountForCreate = await getAccount(deployerAddress);
    const txRetry = new TransactionBuilder(accountForCreate, {
      fee: '10000000',
      networkPassphrase: Networks.PUBLIC
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

async function main() {
  console.log('=== ERGO PROTOCOL — STELLAR MAINNET DEPLOYMENT & SETUP ===');
  
  const latestLedgerRes = await server.getLatestLedger();
  const latestLedger = latestLedgerRes.sequence;
  const approveExpirationLedger = latestLedger + 200000;
  console.log(`Current ledger: ${latestLedger}, setting approve expiration to: ${approveExpirationLedger}`);

  const baseWasmDir = path.resolve(__dirname, '../target/wasm32-unknown-unknown/release');

  // 1. Deploy Contracts (Reuse already successfully deployed instances to save XLM)
  const oracle = 'CCZIMNOOYPBJBVAXOOIPSI2SJNR6R3LBEEZNDIEI2H2YVTYASAVI772H';
  const compliance = 'CBL5WKK2WQ4XGGN25DW3OP2LIGI5GUDLBXNQ76ZLFQLU3RRBBAPGQTLU';
  const ergoToken = 'CDILV5HTHZGWQYRL6TJP3MUTSCRXXQSAUHBMASXPZVC2BS4I3QUE5IDQ';
  
  const governance = compliance;
  const backstop = compliance;

  console.log(`Using already deployed Oracle Aggregator: ${oracle}`);
  console.log(`Using already deployed Compliance: ${compliance}`);
  console.log(`Using already deployed Ergo Token: ${ergoToken}`);
  console.log(`Using fallback Compliance for Governance: ${governance}`);
  console.log(`Using fallback Compliance for Backstop: ${backstop}`);

  const liquidationEngine = await deployContract(`${baseWasmDir}/liquidation_engine.wasm`, 'Liquidation Engine');
  const corePool = await deployContract(`${baseWasmDir}/core_pool.wasm`, 'Core Pool');

  // Asset configurations
  const xlmSac = 'CBDQT2IMEY25DRDZNBDUJWBCV6L4D3DERXKYIH65ZDNLY7BWPYQOO5AI';
  const usdc = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';
  const eurc = 'CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV';

  console.log('\n--- INITIALIZING CONTRACTS ---');

  const callContract = async (contractId, method, args) => {
    const account = await getAccount(deployerAddress);
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(account, {
      fee: '10000000',
      networkPassphrase: Networks.PUBLIC
    })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();
    await sendTx(tx);
  };

  // Step A: Initialize Oracle Aggregator
  console.log('Initializing Oracle Aggregator...');
  await callContract(oracle, 'initialize', [
    Address.fromString(deployerAddress).toScVal()
  ]);

  // Step B: Initialize Compliance
  console.log('Initializing Compliance...');
  await callContract(compliance, 'initialize', [
    Address.fromString(deployerAddress).toScVal()
  ]);

  // Step C: Initialize Ergo Token
  console.log('Initializing Ergo Token...');
  await callContract(ergoToken, 'initialize', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal(7, { type: 'u32' }),
    nativeToScVal('Ergo Protocol Token', { type: 'string' }),
    nativeToScVal('ERGO', { type: 'string' })
  ]);

  // Mint 1B ERGO to Treasury
  const treasuryAddress = 'GCIK6IVUIIIBJ4MVYIFBPQSMHMCN4SKF3HWLXFUZNLJYVN4UEQVHZ5BA';
  console.log('Minting 1B ERGO to treasury...');
  await callContract(ergoToken, 'mint', [
    Address.fromString(treasuryAddress).toScVal(),
    nativeToScVal(10000000000000000n, { type: 'i128' })
  ]);

  // Governance and Backstop are skipped on Mainnet for budget reasons (Compliance is used as fallback)
  /*
  // Step D: Initialize Governance
  console.log('Initializing Governance...');
  await callContract(governance, 'initialize', [
    Address.fromString(deployerAddress).toScVal()
  ]);

  // Whitelist targets in Governance
  console.log('Whitelisting targets in Governance...');
  await callContract(governance, 'set_whitelisted', [
    Address.fromString(deployerAddress).toScVal(),
    Address.fromString(corePool).toScVal(),
    nativeToScVal(true, { type: 'bool' })
  ]);
  await callContract(governance, 'set_whitelisted', [
    Address.fromString(deployerAddress).toScVal(),
    Address.fromString(oracle).toScVal(),
    nativeToScVal(true, { type: 'bool' })
  ]);
  await callContract(governance, 'set_whitelisted', [
    Address.fromString(deployerAddress).toScVal(),
    Address.fromString(compliance).toScVal(),
    nativeToScVal(true, { type: 'bool' })
  ]);
  await callContract(governance, 'set_whitelisted', [
    Address.fromString(deployerAddress).toScVal(),
    Address.fromString(backstop).toScVal(),
    nativeToScVal(true, { type: 'bool' })
  ]);
  await callContract(governance, 'set_whitelisted', [
    Address.fromString(deployerAddress).toScVal(),
    Address.fromString(liquidationEngine).toScVal(),
    nativeToScVal(true, { type: 'bool' })
  ]);

  // Step E: Initialize Backstop
  console.log('Initializing Backstop...');
  await callContract(backstop, 'initialize', [
    Address.fromString(governance).toScVal(),
    Address.fromString(liquidationEngine).toScVal(),
    Address.fromString(usdc).toScVal()
  ]);
  */

  // Step F: Initialize Liquidation Engine
  console.log('Initializing Liquidation Engine...');
  await callContract(liquidationEngine, 'initialize', [
    Address.fromString(deployerAddress).toScVal(),
    Address.fromString(corePool).toScVal(),
    Address.fromString(backstop).toScVal(),
    Address.fromString(usdc).toScVal()
  ]);

  // Step G: Initialize Core Pool
  console.log('Initializing Core Pool...');
  await callContract(corePool, 'initialize', [
    Address.fromString(deployerAddress).toScVal()
  ]);

  // Register Core Pool dependencies
  console.log('Registering Core Pool Dependencies...');
  await callContract(corePool, 'set_dependency', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('oracle', { type: 'symbol' }),
    Address.fromString(oracle).toScVal()
  ]);
  await callContract(corePool, 'set_dependency', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('backstop', { type: 'symbol' }),
    Address.fromString(backstop).toScVal()
  ]);
  await callContract(corePool, 'set_dependency', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('compliance', { type: 'symbol' }),
    Address.fromString(compliance).toScVal()
  ]);
  await callContract(corePool, 'set_dependency', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('liquidation_engine', { type: 'symbol' }),
    Address.fromString(liquidationEngine).toScVal()
  ]);
  await callContract(corePool, 'set_dependency', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('governance', { type: 'symbol' }),
    Address.fromString(governance).toScVal()
  ]);

  console.log('\n--- WIRING ORACLES IN AGGREGATOR ---');
  const reflectorMainnet = 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN';
  console.log('Registering Reflector Price Feeds...');
  await callContract(oracle, 'register_feed', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('XLM', { type: 'symbol' }),
    Address.fromString(reflectorMainnet).toScVal()
  ]);
  await callContract(oracle, 'register_feed', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('USDC', { type: 'symbol' }),
    Address.fromString(reflectorMainnet).toScVal()
  ]);
  await callContract(oracle, 'register_feed', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('EURC', { type: 'symbol' }),
    Address.fromString(reflectorMainnet).toScVal()
  ]);

  const soroswapRouter = 'CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH';
  console.log('Registering Soroswap TWAP DEX Feed...');
  await callContract(oracle, 'register_feed', [
    Address.fromString(deployerAddress).toScVal(),
    nativeToScVal('XLM', { type: 'symbol' }),
    Address.fromString(soroswapRouter).toScVal()
  ]);

  console.log('\n--- CREATING LENDING POOL MARKETS ---');

  const createPoolMarket = async (marketId, assetAddress, cf, liqThreshold, poolType, emode, ceiling) => {
    console.log(`Creating market ${marketId}...`);
    await callContract(corePool, 'create_market', [
      Address.fromString(deployerAddress).toScVal(),
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
  await createPoolMarket('ergo_satellite', ergoToken, 6500, 7000, 1, 0, 1000000000000n);

  console.log('\n--- TREASURY SEEDING PREPARATION ---');
  const treasurySecret = process.env.TREASURY_SECRET_KEY;
  if (!treasurySecret) {
    console.log('⚠️ TREASURY_SECRET_KEY not set in environment. Skipping protocol liquidity seeding.');
  } else {
    try {
      const treasuryKeypair = Keypair.fromSecret(treasurySecret);
      console.log(`Executing Treasury Seeding under: ${treasuryAddress}`);

      const seedLiquidity = async (marketId, assetAddress, amount) => {
        console.log(`Seeding initial liquidity for ${marketId}...`);
        const approveAccount = await getAccount(treasuryAddress);
        const approveContract = new Contract(assetAddress);
        const approveTx = new TransactionBuilder(approveAccount, {
          fee: '10000000',
          networkPassphrase: Networks.PUBLIC
        })
        .addOperation(approveContract.call('approve', 
          Address.fromString(treasuryAddress).toScVal(),
          Address.fromString(corePool).toScVal(),
          nativeToScVal(amount, { type: 'i128' }),
          nativeToScVal(approveExpirationLedger, { type: 'u32' })
        ))
        .setTimeout(60)
        .build();
        await sendTx(approveTx, treasuryKeypair);

        const supplyAccount = await getAccount(treasuryAddress);
        const supplyContract = new Contract(corePool);
        const supplyTx = new TransactionBuilder(supplyAccount, {
          fee: '10000000',
          networkPassphrase: Networks.PUBLIC
        })
        .addOperation(supplyContract.call('supply',
          Address.fromString(treasuryAddress).toScVal(),
          nativeToScVal(marketId, { type: 'symbol' }),
          nativeToScVal(amount, { type: 'i128' })
        ))
        .setTimeout(60)
        .build();
        await sendTx(supplyTx, treasuryKeypair);
        console.log(`✓ Seeding for ${marketId} complete.`);
      };

      await seedLiquidity('xlm_shared', xlmSac, 1000000000000n);
      await seedLiquidity('usdc_shared', usdc, 100000000000n);
      await seedLiquidity('eurc_shared', eurc, 50000000000n);
    } catch (e) {
      console.error('❌ Failed seeding treasury liquidity:', e.message || e);
    }
  }

  console.log('\n--- EXPORTING ADDRESSES ---');
  console.log(`NEXT_PUBLIC_CORE_POOL_CONTRACT_ID=${corePool}`);
  console.log(`NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID=${oracle}`);
  console.log(`NEXT_PUBLIC_BACKSTOP_CONTRACT_ID=${backstop}`);
  console.log(`NEXT_PUBLIC_LIQUIDATION_ENGINE_CONTRACT_ID=${liquidationEngine}`);
  console.log(`NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID=${governance}`);
  console.log(`NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID=${compliance}`);
  console.log(`NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID=${ergoToken}`);

  console.log('\n--- WRITING ADDRESSES TO ENV FILES ---');
  const fs = require('fs');

  const updateEnvFile = (filePath, updates) => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [key, val] of Object.entries(updates)) {
      const regex = new RegExp(`^(${key}=).*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `$1${val}`);
      } else {
        content += `\n${key}=${val}`;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Automatically updated ${path.basename(filePath)}`);
  };

  const clientUpdates = {
    NEXT_PUBLIC_CORE_POOL_CONTRACT_ID: `'${corePool}'`,
    NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID: `'${oracle}'`,
    NEXT_PUBLIC_BACKSTOP_CONTRACT_ID: `'${backstop}'`,
    NEXT_PUBLIC_LIQUIDATION_ENGINE_CONTRACT_ID: `'${liquidationEngine}'`,
    NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID: `'${governance}'`,
    NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID: `'${compliance}'`,
    NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID: `'${ergoToken}'`
  };

  const serverUpdates = {
    CORE_POOL_CONTRACT_ID: corePool,
    ORACLE_AGGREGATOR_CONTRACT_ID: oracle,
    BACKSTOP_CONTRACT_ID: backstop,
    LIQUIDATION_ENGINE_CONTRACT_ID: liquidationEngine,
    GOVERNANCE_CONTRACT_ID: governance,
    COMPLIANCE_CONTRACT_ID: compliance,
    NEXT_PUBLIC_CORE_POOL_CONTRACT_ID: corePool,
    NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID: oracle,
    NEXT_PUBLIC_BACKSTOP_CONTRACT_ID: backstop,
    NEXT_PUBLIC_LIQUIDATION_ENGINE_CONTRACT_ID: liquidationEngine,
    NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID: governance,
    NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID: compliance,
    NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID: ergoToken
  };

  updateEnvFile(path.join(__dirname, '../.env.local'), clientUpdates);
  updateEnvFile(path.join(__dirname, '../client/.env.local'), clientUpdates);
  updateEnvFile(path.join(__dirname, '../server/.env'), serverUpdates);
}

main().catch(console.error);
