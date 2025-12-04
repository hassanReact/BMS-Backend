import mongoose, { Schema } from "mongoose";

const maintenanceSchema = new Schema({
  propertyType: {
    type: String,
    enum: ['Vacant', 'Occupied'],
    required: true
  },
  maintenanceAmount: {
    type: Number,
    min: 0
  },
  surchargeAmount: {
    type: Number,
    min: 0
  },
  date: {
    type: String,
    required: true
  },
  dueDate: {
    type: String,
    required: true
  },
  maintenanceMonth: {
    type: String,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
  },
},
  { timestamps: true },
)

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);

export default Maintenance;