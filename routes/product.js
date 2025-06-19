import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByVendor,
} from '../controllers/product.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';
import { uploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { processImages } from '../util/processProductImages.js';

const router = express.Router();

router
  .route('/')
  .get(getProducts)
  .post(authMiddleware, authorize('vendor'), uploadMiddleware.array('productImages', 5), processImages, createProduct);

router
  .route('/:id')
  .get(getProduct)
  .put(authMiddleware, authorize('vendor', 'superadmin'), uploadMiddleware.array('productImages', 5), processImages, updateProduct)
  .delete(authMiddleware, authorize('vendor', 'superadmin'), deleteProduct);

router.get('/vendor/:vendorId', getProductsByVendor);

export default router;
 