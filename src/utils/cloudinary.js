const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { AppError } = require('../middlewares/error.middleware');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Upload file to Cloudinary
const uploadFile = async (filePath, folderName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folderName,
      resource_type: 'auto'
    });
    
    // Remove file from server after upload
    fs.unlinkSync(filePath);
    
    return {
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    // Remove file from server if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw new AppError(`Failed to upload file: ${error.message}`, 500);
  }
};

// Delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new AppError(`Failed to delete file: ${error.message}`, 500);
  }
};

// Update file in Cloudinary (delete old one and upload new one)
const updateFile = async (oldPublicId, newFilePath, folderName) => {
  try {
    // If old file exists, delete it
    if (oldPublicId) {
      await deleteFile(oldPublicId);
    }
    
    // Upload new file
    return await uploadFile(newFilePath, folderName);
  } catch (error) {
    throw new AppError(`Failed to update file: ${error.message}`, 500);
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  updateFile
};