import mongoose, { Schema } from "mongoose";


const bookingSchema = new Schema(
  {
    bookingNo: {
      type: String
    },
    accountName: {
      type: String
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property"
    },
    ownerId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner'
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant"
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    startingDate: {
      type: Date,
    },
    endingDate: {
      type: Date,
    },
    advanceAmount: {
      type: Number
    },
    rentAmount: {
      type: Number,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project"
    },
    blockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId
    },
    isDeleted: {
      type: Boolean,
      default: false
    },

    vacantNotice: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true },
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
