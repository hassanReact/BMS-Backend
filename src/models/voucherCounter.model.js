import mongoose from "mongoose";

const voucherCounterSchema = new mongoose.Schema({
  prefix: { type: String, required: true, unique: true }, // e.g., "VCH", "P", "S"
  counter: { type: Number, default: 1, unique: true },
});

export const VoucherCounter = mongoose.model("VoucherCounter", voucherCounterSchema);
