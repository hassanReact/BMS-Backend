import mongoose, { Schema } from "mongoose";


const subscriptionSchema = new Schema(
  {
    title: {
      type: String
    },
    noOfDays: {
      type: String
    },
    amount: {
      type: String
    },
    discount: {
      type: String
    },
    discription: {
      type: String
    },
    isDeleted:{
      type: Boolean,
      default: false
    }
  },
  { timestamps: true },
);


const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
