import Product from '../models/product.js';
import cloudinary from '../config/cloudinary.js';
import expressAsyncHandler from 'express-async-handler';

// Get all products
export const getProducts = expressAsyncHandler(async (req, res) => {
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach((el) => delete queryObj[el]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  let query = Product.find(JSON.parse(queryStr)).populate('vendor', 'name businessName');

  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Product.countDocuments();

  query = query.skip(startIndex).limit(limit);

  const products = await query;

  const pagination = {};
  if (endIndex < total) pagination.next = { page: page + 1, limit };
  if (startIndex > 0) pagination.prev = { page: page - 1, limit };

  res.status(200).json({
    success: true,
    count: products.length,
    pagination,
    data: products,
  });
});

// Get single product
export const getProduct = expressAsyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    'vendor',
    'name businessName businessDescription'
  );

  if (!product) {
    throw new Error(`Product not found with id`);
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

// Create product (vendor only)
export const createProduct = expressAsyncHandler(async (req, res) => {
  req.body.vendor = req.user.id;

  if (req.user.role !== 'vendor') {
    throw new Error(`User role ${req.user.role} is not authorized`);
  }

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product,
  });
});

// Update product
export const updateProduct = expressAsyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    throw new Error(`Product not found`);
  }

  if (product.vendor.toString() !== req.user.id && req.user.role !== 'superadmin') {
    throw new Error(`User ${req.user.id} is not authorized to update this product`);
  }

  // Parse list of images the user wants to keep
  const imagesToKeep = req.body.existingImagesToKeep || [];

  // Delete images not in the keep list
  const imagesToDelete = product.images.filter(
    (img) => !imagesToKeep.includes(img.publicId)
  );

  const deletePromises = imagesToDelete.map((image) =>
    cloudinary.uploader.destroy(image.publicId)
  );
  await Promise.all(deletePromises);

  // Build new images array
  const newImages = req.body.images || []; // these are new uploads from `processImages`
  const retainedImages = product.images.filter((img) =>
    imagesToKeep.includes(img.publicId)
  );

  req.body.images = [...retainedImages, ...newImages];

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: product,
  });
});
// export const updateProduct = expressAsyncHandler(async (req, res) => {
//   let product = await Product.findById(req.params.id);

//   if (!product) {
//     throw new Error(`Product not found`);
//   }

//   if (product.vendor.toString() !== req.user.id && req.user.role !== 'superadmin') {
//     throw new Error(`User ${req.user.id} is not authorized to update this product`);
//   }
   
//   if (req.body.images && req.body.images.length > 0) {
//     const deletePromises = product.images.map((image) =>
//       cloudinary.uploader.destroy(image.publicId)
//     );
//     await Promise.all(deletePromises);
//   }

//   product = await Product.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   res.status(200).json({
//     success: true,
//     data: product,
//   });
// });

// Delete product
export const deleteProduct = expressAsyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ErrorResponse(`Product not found with id of ${req.params.id}`, 404);
  }

  if (product.vendor.toString() !== req.user.id && req.user.role !== 'superadmin') {
    throw new Error(`User ${req.user.id} is not authorized to delete this product`, 401);
  }

  const deletePromises = product.images.map((image) =>
    cloudinary.uploader.destroy(image.publicId)
  );
  await Promise.all(deletePromises);

  await product.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Get products by vendor
export const getProductsByVendor = expressAsyncHandler(async (req, res) => {
  const products = await Product.find({ vendor: req.params.vendorId }).populate(
    'vendor',
    'name businessName'
  );

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});
