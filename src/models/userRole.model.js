
import mongoose from "mongoose";

const userRoleSchema = mongoose.Schema(
    {
        userId:{
         type:mongoose.Schema.Types.ObjectId,
         ref:"User",
         required:true,
        },

        roleId:{
         type:mongoose.Schema.Types.ObjectId,
         ref:"Role",
         required:true,
        },

        companyId:{
         type:mongoose.Schema.Types.ObjectId,
         ref:"Company",
         default:null,
        },

        Status:{
            type:String,
            enum:["active","inactive"],
            default:"active",
        },
    },
    {
        timestamps:true,
    }
);

userRoleSchema.index(
    {userId:1},
    {unique:true}
);

export default mongoose.model("userRole",userRoleSchema)