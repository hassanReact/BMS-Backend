import mongoose, { Schema } from "mongoose";
import { type } from "os";

const registrationSchema = new Schema({
    productName: {
        type: String,
        required: true
    },
    productModel: {
        type: String,
        required: true
    },
    productDescription: {
        type: String,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

const purchaseDetailsSchema = new Schema(
    {
        purchaseDetailId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'purchaseDetailId'
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductRegistration',
            required: true
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company"
        },
        productName: {
            type: String,
            required: true
        },
        vendorName: {
            type: String,
            required: true
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true
        },
        status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
        unit: {
            type: String,
            enum: ['kg', 'meter', 'number', 'feet'],
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        unitPerPrice: {
            type: Number,
            required: true
        },
        bill: {
            type: String,
            required: true
        },
        billNumber: {
            type: String,
            required: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const usageDetailsSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductRegistration',
            required: true
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company"
        },
        productName: {
            type: String,
            required: true
        },
        productQuantity: {
            type: Number,
            required: true
        },
        usedFor: {
            type: String,
            enum: ['general', 'resident'],
            required: true
        },
        generalDescription: {
            type: String,
            required: function () {
                return this.usedFor === 'general';
            }
        },
        residentName: {
            type: String,
            required: function () {
                return this.usedFor === 'resident';
            }
        },
        residentId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: function () {
                return this.usedFor === 'resident';
            }
        },
        billingType: {
            type: String,
            enum: ['foc', 'price'],
            required: true
        },
        focDescription: {
            type: String,
            required: function () {
                return this.billingType === 'foc';
            }
        },
        productPrice: {
            type: Number,
            required: function () {
                return this.billingType === 'price';
            }
        },
        priceDescription: {
            type: String,
            required: function () {
                return this.billingType === 'price';
            }
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    }, { timestamps: true }
)

const Inventory = {
    ProductRegistration: mongoose.model('ProductRegistration', registrationSchema),
    PurchaseDetails: mongoose.model('PurchaseDetails', purchaseDetailsSchema),
    UsageDetails: mongoose.model('UsageDetails', usageDetailsSchema)
};

export default Inventory;