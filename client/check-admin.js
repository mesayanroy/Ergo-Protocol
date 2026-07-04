import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const adminPublic = 'GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL';

async function main() {
  console.log(`Checking admin public key on Testnet: ${adminPublic}`);
  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${adminPublic}`);
    if (res.ok) {
      const data = await res.json();
      const balance = data.balances.find(b => b.asset_type === 'native')?.balance;
      console.log(`Admin account exists! Native balance: ${balance} XLM`);
    } else {
      console.log(`Admin account does not exist or not funded. Status: ${res.status}`);
      console.log(`Attempting to fund admin account via Friendbot...`);
      const friendbotRes = await fetch(`https://friendbot.stellar.org/?addr=${adminPublic}`);
      if (friendbotRes.ok) {
        console.log(`Success! Admin account funded via Friendbot.`);
        const retryRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${adminPublic}`);
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const balance = retryData.balances.find(b => b.asset_type === 'native')?.balance;
          console.log(`Admin account native balance now: ${balance} XLM`);
        }
      } else {
        console.log(`Friendbot funding failed! Status: ${friendbotRes.status}`);
      }
    }
  } catch (err) {
    console.error('Error checking/funding admin:', err);
  }
}

main().catch(console.error);
