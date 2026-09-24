import mongoose, { Schema } from "mongoose";


const blockSchema = new Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project"
    },
    blockName: {
        type: String
    },
    description:{
      type: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    companyId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
  },
  { timestamps: true },
);

const Block = mongoose.model("Block", blockSchema);

export default Block;