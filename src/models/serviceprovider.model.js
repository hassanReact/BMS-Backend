import mongoose, { Schema } from "mongoose";

const serviceProviderSchema = new Schema(
  {
    name: {
      type: String,
    },
    numOfStaff: {
      type: Number,
    },
    phoneNo: {
      type: String,
    },
    workType: {
      type: String,
    },
    monthlyCharges: {
      type: Number,
      min: 0
    },
    address: {
      type: String,
    },
    agreement: {
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
  },
  { timestamps: true }
);


const ServiceProvider = mongoose.model("ServiceProvider", serviceProviderSchema);

export default ServiceProvider;
