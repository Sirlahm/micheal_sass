import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        maxlength: [30, 'Name cannot exceed 30 characters'],
        minlength: [3, 'Name should have more than 3 characters']
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
        minlength: [6, 'Password should be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['customer', 'vendor', 'superadmin'],
        default: 'customer'
    },
    avatar: {
        public_id: String,
        url: String,
    },
    phone: String,
    shippingAddress: {
        address: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
    },
    billingAddress: {
        address: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    stripeCustomerId: String,

    //Vendor
    businessEmail: String,
    businessPhone: String,
    businessAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    businessName: String,
    businessType: String,
    businessRegistrationNumber: String,
    industry: String,
    businessDescription: String,
    businessWebsite: String,
    taxId: String,
    stripeAccountId: String,
    businessLogo: {
        public_id: String,
        url: String,
      },
      businessDocument: {
        public_id: String,
        url: String,
      },
    totalSales: {
        type: Number,
        default: 0
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    // resettoken: String,
    // resetPasswordTokenExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    const salt = await bcrypt.genSaltSync(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
userSchema.methods.isPasswordMatched = async function (enteredPassword) {
    const check = await bcrypt.compare(enteredPassword, this.password)
    console.log(check)
    return check;
};

userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

userSchema.methods.createPasswordResetToken = async function () {
    const resettoken = crypto.randomBytes(32).toString("hex");
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resettoken)
        .digest("hex");
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 60 minutes
    return resettoken;
};

userSchema.methods.getVerificationToken = function() {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    this.verificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    this.verificationTokenExpire = Date.now() + 30 * 60 * 1000;
  
    return verificationToken;
  };

export default mongoose.model("User", userSchema);
