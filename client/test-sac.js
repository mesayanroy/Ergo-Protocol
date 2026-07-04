import { Asset, Networks } from '@stellar/stellar-sdk';

const adminAddress = 'GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL';
const assets = ['USDC', 'EURC', 'wBTC', 'wETH', 'ERGO'];

assets.forEach(code => {
  const asset = new Asset(code, adminAddress);
  const contractId = asset.contractId(Networks.TESTNET);
  console.log(`${code} SAC Contract ID: ${contractId}`);
});
