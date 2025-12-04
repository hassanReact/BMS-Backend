import mongoose, { Schema } from "mongoose";


const transactionalAccountsSchema = new Schema(
  {
    accountName: {
      type: String
    },
    accountNumber:{
        type: String,
        min: 0 
      },
    details:{
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
    
    const TransactionalAccounts = mongoose.model("TranstionalAccounts", transactionalAccountsSchema);
    
    export default TransactionalAccounts;