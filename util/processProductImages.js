import expressAsyncHandler from 'express-async-handler';
import { uploadToCloudinary } from './uploadCloudinary.js';

export const processImages = expressAsyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const uploadPromises = req.files.map((file) =>
    uploadToCloudinary(file.path, 'products')
  );

  try {
    req.body.images = await Promise.all(uploadPromises);
    next();
  } catch (error) {
    throw new Error('Error uploading images to Cloudinary');
  }
});
