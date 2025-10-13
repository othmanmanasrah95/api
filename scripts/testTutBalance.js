const tutPaymentService = require('../services/tutPaymentService');

// Test script to debug TUT balance checking
async function testTutBalance() {
  console.log('Testing TUT balance checking...\n');
  
  // Replace with your actual wallet address
  const testWalletAddress = '0x742d35Cc6634C0532925a3b8D0C0C4C4C4C4C4C4'; // Replace with actual address
  
  const networks = ['sepolia', 'mainnet'];
  
  for (const network of networks) {
    console.log(`\n=== Testing ${network.toUpperCase()} Network ===`);
    
    try {
      console.log(`Initializing TUT service for ${network}...`);
      await tutPaymentService.initialize(network);
      
      console.log(`Getting balance for address: ${testWalletAddress}`);
      const balance = await tutPaymentService.getTUTBalance(testWalletAddress);
      
      console.log(`✅ SUCCESS: Balance = ${balance} TUT`);
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log('Error details:', error);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testTutBalance().catch(console.error);
