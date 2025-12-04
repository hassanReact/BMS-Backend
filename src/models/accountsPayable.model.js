import mongoose, { Schema } from "mongoose";

const accountsPayableSchema = new Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        },

        type: {
            type: String,
            enum: ['PurchaseDetails', 'staff', 'ServiceProvider', 'bill'],
            required: true
        },

        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'referenceModel'
        },
        referenceModel: {
            type: String,
            required: true,
            enum: ['PurchaseDetails', 'staff', 'ServiceProvider', 'bill'] // Add your actual model names
        },

        amount: {
            type: Number,
            required: true
        },

        month: {
            type: String,
            required: true
        },
        
        status: {
            type: String,
            enum: ['pending', 'approved'],
            default: 'pending'
        },

        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const AccountsPayable = mongoose.model("AccountsPayable", accountsPayableSchema);

export default AccountsPayable;
