const User = require('../models/user.model');
const { encryptData, decryptData } = require('../models/user.model'); // Extract encryption functions to a separate file

const migrateMobileNumbers = async () => {
  try {
    console.log('Starting mobile number encryption migration...');

    // Find all users with mobile numbers
    const users = await User.find({ mobileNumber: { $exists: true, $ne: null } });
    
    let migratedCount = 0;
    for (const user of users) {
      // Get the raw mobile number from the database
      const rawMobileNumber = user.get('mobileNumber', null, { getters: false });
      
      // Check if it's already encrypted (basic check)
      const hexRegex = /^[0-9a-fA-F]+$/;
      if (!hexRegex.test(rawMobileNumber) && rawMobileNumber) {
        // Encrypt the mobile number
        const encryptedNumber = encryptData(rawMobileNumber);
        
        // Update directly in the database to bypass getters/setters
        await User.updateOne(
          { _id: user._id },
          { $set: { mobileNumber: encryptedNumber } }
        );
        
        migratedCount++;
      }
    }
    
    console.log(`Migration completed. Encrypted ${migratedCount} mobile numbers.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

module.exports = { migrateMobileNumbers };