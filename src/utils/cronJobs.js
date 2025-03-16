const cron = require('node-cron');
const User = require('../models/user.model');

const initCronJobs = () => {
  // Schedule job to run every 6 hours to clean up expired OTPs
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running scheduled task: Cleaning up expired OTPs...');
    
    try {
      const currentDate = new Date();
      
      // Find all users with expired OTPs
      const users = await User.find({
        'OTP.expiresIn': { $lt: currentDate }
      });
      
      // Update each user to remove expired OTPs
      let updatedCount = 0;
      
      for (const user of users) {
        // Filter out expired OTPs
        const validOTPs = user.OTP.filter(otp => otp.expiresIn > currentDate);
        
        // If OTPs were removed, update the user
        if (validOTPs.length !== user.OTP.length) {
          user.OTP = validOTPs;
          await user.save();
          updatedCount++;
        }
      }
      
      console.log(`Cleaned up expired OTPs for ${updatedCount} users`);
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  });
  
  console.log('CRON jobs initialized');
};

module.exports = { initCronJobs };