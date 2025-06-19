import authController from "../controllers/auth.js";
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadMiddleware } from "../middlewares/uploadMiddleware.js";


const router = express.Router();
router.post("/register",   uploadMiddleware.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'businessLogo', maxCount: 1 },
    { name: 'businessDocument', maxCount: 1 },
  ]), authController.createUser);
router.post("/login", authController.login);
router.get("/", authMiddleware, authController.auth);
router.get("/check-vendor-status", authMiddleware, authController.checkVendorStatus);
router.post("/change-password", authMiddleware, authController.changePassword);
router.post("/forget-password", authController.forgotPasswordToken);
router.post("/reset-password", authController.resetPassword);

export default router;
