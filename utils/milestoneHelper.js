const emailService = require('../services/emailService');
const User = require('../models/user');
const Order = require('../models/order');
const TokenBalance = require('../models/tokenBalance');

/**
 * Check and send TUT token milestone emails
 */
async function checkTUTTokenMilestones(userId, newTokenBalance) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) return;

    const milestones = [100, 500, 1000];
    const reachedMilestone = milestones.find(m => newTokenBalance >= m && newTokenBalance < m + 50); // Within 50 tokens of milestone
    
    if (reachedMilestone) {
      await emailService.sendTUTTokenMilestoneEmail({
        userEmail: user.email,
        userName: user.name,
        milestoneData: {
          tokenAmount: reachedMilestone
        }
      });
    }
  } catch (error) {
    console.error('Error checking TUT token milestones:', error);
  }
}

/**
 * Check and send account anniversary email
 */
async function checkAccountAnniversary(userId) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email || !user.createdAt) return;

    const now = new Date();
    const accountAge = now.getFullYear() - user.createdAt.getFullYear();
    const monthDiff = now.getMonth() - user.createdAt.getMonth();
    
    // Check if it's the anniversary month (same month as creation)
    if (monthDiff === 0 && accountAge > 0) {
      // Get user stats
      const orderCount = await Order.countDocuments({ user: userId });
      const treeCount = user.adoptedTrees?.length || 0;
      const tokenBalance = await TokenBalance.findOne({ user: userId });
      const tokenAmount = tokenBalance?.balance || 0;

      await emailService.sendAccountAnniversaryEmail({
        userEmail: user.email,
        userName: user.name,
        anniversaryData: {
          years: accountAge,
          orderCount,
          treeCount,
          tokenBalance: tokenAmount
        }
      });
    }
  } catch (error) {
    console.error('Error checking account anniversary:', error);
  }
}

module.exports = {
  checkTUTTokenMilestones,
  checkAccountAnniversary
};

