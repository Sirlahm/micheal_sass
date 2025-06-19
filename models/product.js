import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        type: {
            type: String,
            enum: ['product', 'service'],
            default : 'product',
            required: true,
        },
        category: {
            type: String,
            enum: [
                'Electronics',
                'Clothing',
                'Home',
                'Books',
                'Beauty',
                'Toys',
                'Services',
                'Other'
            ],
            required: true,
        },
        images: [
            {
                url: String,
                publicId: String,
            },
        ],
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Service specific fields
        duration: Number, // in minutes
        location: String,
        // Product specific fields
        weight: Number,
        dimensions: {
            length: Number,
            width: Number,
            height: Number,
        },
        sku: String,
        reviews: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            name: {
                type: String,
                required: true
            },
            rating: {
                type: Number,
                required: true
            },
            comment: {
                type: String,
                required: true
            }
        }],
    },
    { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
export default Product;
