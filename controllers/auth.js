import expressAsyncHandler from "express-async-handler";
import User from "../models/user.js";
import { generateToken } from "../config/jwtToken.js";
import { createStripeAccount, createAccountLink, getAccountStatus } from "../services/stripe.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../services/emailService.js";


const createUser = expressAsyncHandler(async (req, res) => {
    const { email, role, name } = req.body;

    if (!email || !role) {
        res.status(400);
        throw new Error("Email, Role is required");
    }

    const validRoles = ['customer', 'vendor', 'superadmin'];
    if (!validRoles.includes(role)) {
        throw new Error('Invalid user role');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        res.status(409);
        throw new Error("User with this email already exists");
    }

    const userData = {
        ...req.body
    };

    if (req.files?.avatar) {
        const result = await uploadToCloudinary(req.files.avatar[0].path, 'avatars');
        userData.avatar = {
            url: result.url,
            public_id: result.publicId
        };
    }

    if (req.files?.businessLogo) {
        const result = await uploadToCloudinary(req.files.businessLogo[0].path, 'business/logos');
        userData.businessLogo = {
            url: result.url,
            public_id: result.publicId
        };
    }

    if (req.files?.businessDocument) {
        const result = await uploadToCloudinary(req.files.businessDocument[0].path, 'business/documents');
        userData.businessDocument = {
            url: result.url,
            public_id: result.publicId
        };
    }
    const user = await User.create(userData);

    if (role === 'vendor') {
        try {
            const stripeAccount = await createStripeAccount(user);
            user.stripeAccountId = stripeAccount.id;
            await user.save();
        } catch (err) {
            await User.findByIdAndDelete(user._id);
            throw new Error('Failed to create vendor payment account');
        }
    }
    const token = user.getVerificationToken();
    // await sendVerificationEmail(user.email, token);

    // TODO: send email 
    await user.save();
    res.status(201).json({
        user,
        message: 'Verification email sent',

    });
});

export const verifyEmail = expressAsyncHandler(async (req, res, next) => {
    const { verificationToken } = req.params;
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
        throw new Error('Invalid or expired token');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;

    let onboardingUrl = null;
    if (user.role === 'vendor' && user.stripeAccountId) {
        try {
            const accountLink = await createAccountLink(user.stripeAccountId);
            onboardingUrl = accountLink.url;
        } catch (err) {
            console.error('Failed to create Stripe onboarding link:', err);
        }
    }
    await user.save();
    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        token,
        data: {
            message: 'Email verified successfully',
            ...(user.role === 'vendor' && {
                requiresOnboarding: !!onboardingUrl,
                onboardingUrl,
            }),
        },
    });
});

export const resendVerificationEmail = expressAsyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    if (user.isVerified) {
        throw new Error('Email is already verified');
    }

    const verificationToken = user.getVerificationToken();
    await user.save();
    // await sendVerificationEmail(user.email, verificationToken);

    //TODO : send email
    res.status(200).json({
        success: true,
        message: 'Verification email resent',
    });
});

export const checkVendorStatus = expressAsyncHandler(async (req, res) => {
  const vendor = await User.findById(req.user.id);

  if (!vendor || vendor.role !== 'vendor') {
    throw new Error('Vendor account not found');
  }

  if (!vendor.isVerified) {
    throw new Error('Please verify your email before logging in');
  }

  if (!vendor.stripeAccountId) {
    throw new ErrorResponse('Payment account not set up');
  }

  const accountStatus = await getAccountStatus(vendor.stripeAccountId);
  console.log(accountStatus)

  if (!accountStatus.detailsSubmitted) {
    const accountLink = await createAccountLink(vendor.stripeAccountId);
    return res.status(200).json({
      success: true,
      data: {
        status: 'onboarding_required',
        onboardingUrl: accountLink.url,
      },
    });
  }

  if (!accountStatus.chargesEnabled || !accountStatus.payoutsEnabled) {
    return res.status(200).json({
      success: true,
      data: {
        status: 'pending_approval',
        requirements: accountStatus.currentlyDue,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'active',
      message: 'Vendor account is fully set up',
    },
  });
});


const login = expressAsyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error("Email and Password are required");
    }

    const findUser = await User.findOne({ email }).select("+password");

    if (findUser && (await findUser.isPasswordMatched(password))) {
        findUser.lastLogin = new Date();
        await findUser.save();
        if (!findUser.isVerified) {
            throw new Error('Please verify your email before logging in');
        }
        res.status(200).json({
            user: findUser.toJSON(),
            token: generateToken(findUser._id),
            message: 'Login successful',
        });
    } else {
        res.status(401);
        throw new Error("Invalid Crendtials: Check your email and password");
    }
});

const auth = expressAsyncHandler(async (req, res) => {
    const { _id } = req.user;

    try {
        const user = await User.findById(_id);
        if (!user) {
            const error = new Error("user not found!");
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json(user);
    } catch (error) {
        throw new Error(error);
    }
});

export const forgotPasswordToken = expressAsyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        const error = new Error("User not found with this email");
        error.statusCode = 404;
        throw error;
    }
    try {
        const token = await user.createPasswordResetToken();
        await user.save();
        // await createForgotPasswordEmail(user, token);
        res.json(token);
    } catch (error) {
        throw new Error(error);
    }
});

export const resetPassword = expressAsyncHandler(async (req, res) => {
    const { password, token } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) throw new Error(" Token Expired, Please try again later");
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.json({ message: "Password Reset Successful" });
});

export const changePassword = expressAsyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error("Previous Password and new Password are required");
    }
    const user = req.user;
    const isMatch = await user.isPasswordMatched(currentPassword);
    if (!isMatch) {
        const error = new Error("Current password is incorrect");
        error.statusCode = 400;
        throw error;
    }
    const isNewPasswordSameAsOld = await user.isPasswordMatched(newPassword);
    if (isNewPasswordSameAsOld) {
        const error = new Error(
            "New password cannot be the same as the old password"
        );
        error.statusCode = 400;
        throw error;
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
});



export default {
    createUser,
    login,
    auth,
    forgotPasswordToken,
    resetPassword,
    changePassword,
    checkVendorStatus
};