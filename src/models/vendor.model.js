import mongoose, { Schema } from "mongoose";

const vendorSchema = new Schema({
    vendorName: {
        type: String,
        required: true,
    },
    vendorEmail: {
        type: String,
        required: true,
    },
    vendorContact: {
        type: String,
        required: true,
    },
    vendorAccountNo: {
        type: String,
        required: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    description: {
        type: String,
        required: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    }
},
    { timestamps: true },
);

const Vendor = new mongoose.model("Vendor", vendorSchema);

export default Vendor;