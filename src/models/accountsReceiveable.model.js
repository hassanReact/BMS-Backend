import mongoose, { Schema } from "mongoose";

const accountsReceivableSchema = new Schema({
  type: {
    type: String,
    enum: ['Maintenance', 'Bill'],
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
    enum: ['Maintenance', 'Bill']  // ✅ Use Mongoose model names here
  },

  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },

  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  propertyName: { type: String },
  
  month: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },

  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}, { timestamps: true });


const AccountsReceivable = mongoose.model('AccountsReceivable', accountsReceivableSchema);

export default AccountsReceivable;
