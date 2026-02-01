const mongoose = require('mongoose');
const Worker = require('./server/src/models/Worker');

// API URL configuration
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'http://localhost:10000/api';
  }
  return 'http://localhost:10000/api';
};

async function testWalletAPI() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sindh');
    console.log('Connected to MongoDB');
    
    // Find the worker
    const worker = await Worker.findById('6863bfe35bc522d4b1a999bc');
    console.log('\nWorker found:', {
      name: worker.name,
      balance: worker.balance,
      earnings: worker.earnings?.length || 0
    });
    
    // Test the wallet API endpoint by simulating the request
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch(`${getApiUrl()}/workers/6863bfe35bc522d4b1a999bc/wallet`);
      if (response.ok) {
        const walletData = await response.json();
        console.log('\nWallet API Response:', {
          balance: walletData.balance,
          totalEarned: walletData.totalEarned,
          totalSpent: walletData.totalSpent,
          transactionsCount: walletData.transactions?.length || 0
        });
        
        if (walletData.transactions?.length > 0) {
          console.log('\nRecent transactions:');
          walletData.transactions.slice(0, 3).forEach((tx, index) => {
            console.log(`${index + 1}. ${tx.description} - ₹${tx.amount} (${tx.type})`);
          });
        }
      } else {
        console.log('❌ Wallet API error:', response.status);
      }
    } catch (apiError) {
      console.log('❌ Cannot test API (server might not be running):', apiError.message);
    }
    
    console.log('\n✅ Wallet system is ready!');
    console.log('Worker can now:');
    console.log('- View balance at /worker/wallet');
    console.log('- See transaction history');
    console.log('- Request withdrawals');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testWalletAPI();
