import mongoose,{ Schema } from "mongoose";
import { type } from "os";
import { isNumberObject } from "util/types";


const billSchema = new Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant'
  },
  propertyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property'
  },
  billingMonth: { 
    type: Date, 
    required: true 
  },
  rentAmount: { 
    type: Number, 
    min: 0 
  },
  extraCharges: [
    {
      serviceName: { type: String },
      price: { type: Number},
    },
  ],
  extraAmount: { 
    type: Number, 
    min: 0
  },
  electricityUnit: { 
    type: Number, 
    min: 0 
  },
  electricityRate: { 
    type: Number, 
    min: 0 
  },
  electricityBillAmount: { 
    type: Number, 
    min: 0 
  },
  totalBillAmount: { 
    type: Number, 
    min: 0 
  },
  invoiceNo: { 
    type: String, 
  },
  billDuration: { 
    type: Number, 
    min: 1 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
  },
  note:{
    type: String
  },
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking'
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company'
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
  },
  totalBillAmountAfterGST:{
    type: Number
  },
  totalgst:{
    type: Number
  },
  status:{
    type: Boolean,
    default: false
  },
  paymentType:{
    type: String,
  },
  gstpercent:{
    type: Number
  },
  isDeleted:{
    type: Boolean,
    default: false
  },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
},
{ timestamps: true },
);


const Bill = mongoose.model('Bill', billSchema);

export default Bill;

