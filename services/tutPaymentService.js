const { ethers } = require('ethers');
const User = require('../models/user');
const TokenBalance = require('../models/tokenBalance');
const TokenTransaction = require('../models/tokenTransaction');

// TUTToken Contract ABI (minimal for payment operations)
const TUT_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function redeem(uint256 amount, uint256 reason) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Redeemed(address indexed from, uint256 amount, uint256 reason)"
];

// Contract configuration with multiple RPC fallbacks
const CONTRACT_CONFIG = {
  sepolia: {
    address: '0xeaCb0FcF7652b7a62a1d3CD052C2545710fd2d28',
    chainId: 11155111,
    rpcUrls: [
      process.env.SEPOLIA_RPC_URL,
      process.env.INFURA_PROJECT_ID ? `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}` : null,
      'https://rpc.sepolia.org',
      'https://sepolia.drpc.org',
      'https://ethereum-sepolia.publicnode.com',
      'https://sepolia.gateway.tenderly.co'
    ].filter(Boolean)
  },
  mainnet: {
    address: process.env.TUT_MAINNET_ADDRESS || '0x0000000000000000000000000000000000000000',
    chainId: 1,
    rpcUrls: [
      process.env.MAINNET_RPC_URL,
      process.env.INFURA_PROJECT_ID ? `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}` : null,
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://eth.drpc.org'
    ].filter(Boolean)
  }
};

class TUTPaymentService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.currentNetwork = null;
  }

  // Initialize the service with network configuration
  async initialize(network = 'sepolia') {
    const config = CONTRACT_CONFIG[network];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }

    if (config.address === '0x0000000000000000000000000000000000000000') {
      throw new Error(`TUT contract not deployed on ${network} network`);
    }

    console.log(`Initializing TUT service for ${network}:`, {
      address: config.address,
      chainId: config.chainId,
      rpcUrls: config.rpcUrls
    });

    // Try each RPC URL until one works
    let lastError = null;
    for (let i = 0; i < config.rpcUrls.length; i++) {
      const rpcUrl = config.rpcUrls[i];
      try {
        console.log(`Trying RPC URL ${i + 1}/${config.rpcUrls.length}: ${rpcUrl}`);
        
        // Initialize provider
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers.Contract(config.address, TUT_TOKEN_ABI, this.provider);
        this.currentNetwork = network;

        // Test the connection
        const networkInfo = await this.provider.getNetwork();
        console.log(`✅ TUT Payment Service initialized on ${network} network. Connected to chainId: ${networkInfo.chainId} using ${rpcUrl}`);

        return true;
      } catch (error) {
        console.log(`❌ RPC URL ${i + 1} failed: ${error.message}`);
        lastError = error;
        continue;
      }
    }

    // If all RPC URLs failed
    console.error(`All RPC URLs failed for ${network} network`);
    throw new Error(`Failed to connect to ${network} network. Last error: ${lastError?.message}`);
  }

  // Get user's TUT balance from blockchain
  async getTUTBalance(userWalletAddress) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      console.log(`Checking TUT balance for address: ${userWalletAddress}`);
      console.log(`Using contract address: ${this.contract.target}`);
      
      const balance = await this.contract.balanceOf(userWalletAddress);
      const formattedBalance = ethers.formatEther(balance);
      
      console.log(`Raw balance: ${balance.toString()}`);
      console.log(`Formatted balance: ${formattedBalance} TUT`);
      
      return formattedBalance;
    } catch (error) {
      console.error('Error getting TUT balance:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason
      });
      throw new Error(`Failed to get TUT balance: ${error.message}`);
    }
  }

  // Check if user has sufficient TUT balance
  async hasSufficientBalance(userWalletAddress, requiredAmount) {
    try {
      const balance = await this.getTUTBalance(userWalletAddress);
      return parseFloat(balance) >= parseFloat(requiredAmount);
    } catch (error) {
      console.error('Error checking TUT balance:', error);
      return false;
    }
  }

  // Process TUT payment (this would typically be called from frontend)
  async processTUTPayment(fromAddress, toAddress, amount, orderId) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // Check if user has sufficient balance
      const hasBalance = await this.hasSufficientBalance(fromAddress, amount);
      if (!hasBalance) {
        throw new Error('Insufficient TUT balance');
      }

      // Convert amount to wei
      const amountWei = ethers.parseEther(amount.toString());

      // For now, we'll simulate the transaction
      // In a real implementation, this would be handled by the frontend
      // using MetaMask or another wallet provider
      const transactionData = {
        from: fromAddress,
        to: toAddress,
        amount: amount,
        amountWei: amountWei.toString(),
        orderId: orderId,
        timestamp: new Date(),
        status: 'pending'
      };

      console.log('TUT Payment transaction data:', transactionData);

      // Return transaction data for frontend to process
      return {
        success: true,
        transactionData,
        message: 'TUT payment initiated. Please confirm the transaction in your wallet.'
      };

    } catch (error) {
      console.error('Error processing TUT payment:', error);
      throw error;
    }
  }

  // Update user's token balance in database after successful payment
  async updateUserTokenBalance(userId, amount, transactionType = 'purchase', orderId = null) {
    try {
      // Find or create token balance record
      let tokenBalance = await TokenBalance.findOne({ user: userId });
      
      if (!tokenBalance) {
        tokenBalance = new TokenBalance({
          user: userId,
          balance: 0
        });
      }

      // Deduct the amount from balance
      tokenBalance.balance = Math.max(0, tokenBalance.balance - amount);

      // Add transaction record
      tokenBalance.transactions.push({
        type: transactionType,
        amount: -amount, // Negative amount for deduction
        description: `TUT payment for order ${orderId || 'N/A'}`,
        reference: orderId,
        referenceType: 'order',
        date: new Date()
      });

      await tokenBalance.save();

      // Create token transaction record
      const tokenTransaction = new TokenTransaction({
        user: userId,
        type: 'purchase',
        amount: amount,
        description: `TUT payment for order ${orderId}`,
        reference: orderId,
        status: 'completed'
      });

      await tokenTransaction.save();

      console.log(`Updated token balance for user ${userId}: deducted ${amount} TUT`);
      return true;

    } catch (error) {
      console.error('Error updating token balance:', error);
      throw error;
    }
  }

  // Verify TUT payment transaction (using redeem logic like discount system)
  async verifyTUTPayment(transactionHash, expectedAmount, expectedFrom) {
    try {
      if (!this.provider) {
        await this.initialize();
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed or not found');
      }

      // Parse Redeemed event from the transaction (same as discount redemption)
      const redeemedEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed && parsed.name === 'Redeemed';
        } catch {
          return false;
        }
      });

      if (!redeemedEvent) {
        throw new Error('Redeemed event not found in transaction');
      }

      const parsedEvent = this.contract.interface.parseLog(redeemedEvent);
      const { from, amount, reason } = parsedEvent.args;

      // Verify the transaction details
      const actualAmount = ethers.formatEther(amount);
      const isValid = 
        from.toLowerCase() === expectedFrom.toLowerCase() &&
        parseFloat(actualAmount) === parseFloat(expectedAmount) &&
        reason.toString() === '10'; // 10 = REDEMPTION reason code

      return {
        success: isValid,
        transactionHash,
        from: from,
        amount: actualAmount,
        reason: reason.toString(),
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      console.error('Error verifying TUT payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get current network
  getCurrentNetwork() {
    return this.currentNetwork;
  }

  // Get contract address
  getContractAddress() {
    if (!this.currentNetwork) return null;
    return CONTRACT_CONFIG[this.currentNetwork].address;
  }
}

// Create singleton instance
const tutPaymentService = new TUTPaymentService();

module.exports = tutPaymentService;
