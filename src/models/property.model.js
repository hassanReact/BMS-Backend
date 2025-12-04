import mongoose, { Schema } from "mongoose";


const propertySchema = new Schema(
  {
    propertyname: {
      type: String
    },
    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Type"
    },
    description: {
      type: String
    },
    files: {
      type: [String]
    },
    address: {
      type: String
    },
    zipcode: {
      type: String
    },
    maintencanceHistory: [
      {
        Month: { type: String },
        status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
        maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Maintenance' }
      },
    ],
    maplink: {
      type: String
    },
    rent: {
      type: Number,
      min: 0
    },
    area: {
      type: Number,
      min: 0
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner"
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant"
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project"
    },
    blockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block"
    },
    accountName: {
      type: String
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
    isVacant: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true },
);

// propertySchema.pre('save', function(next) {
//   if (this.tenantId) {
//     this.isVacant = !this.tenantId,
//     next();
//   }
// })
const Property = mongoose.model("Property", propertySchema);

export default Property;
