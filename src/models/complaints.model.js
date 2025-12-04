import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema(
  {
    tenantName: {
      type: String,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property"
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant"
    },
    concernTopic: {
      type: String,
    },
    description: {
      type: String
    },
    comment: {
      type: String
    },
    status: {
      type: Boolean,
      default: false
    },
    assignedName: {
      type: String,
      default: ""
    },
    assignedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
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
  { timestamps: true },
);

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;

