import User from "../models/user.js";
import { uploadToCloudinary } from "../util/uploadCloudinary.js";

export const editUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const updateData = {
            ...req.body,
        };

        // Handle avatar upload
        if (req.files?.avatar) {
            const result = await uploadToCloudinary(req.files.avatar[0].path, 'avatars');
            updateData.avatar = {
                url: result.url,
                public_id: result.publicId
            };
        }
    
        if (req.files?.businessLogo) {
            const result = await uploadToCloudinary(req.files.businessLogo[0].path, 'business/logos');
            updateData.businessLogo = {
                url: result.url,
                public_id: result.publicId
            };
        }
    
        if (req.files?.businessDocument) {
            const result = await uploadToCloudinary(req.files.businessDocument[0].path, 'business/documents');
            updateData.businessDocument = {
                url: result.url,
                public_id: result.publicId
            };
        }
       
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            select: "-password",
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        throw new Error(error);

    }
};


export default {
    editUserProfile
}