import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint",
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderRole: {
    type: String,
    enum: ["tenant", "staff", "companyAdmin"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  readBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["tenant", "staff", "companyAdmin"] }
    }
  ]
}, { timestamps: true });

commentSchema.pre("save", function (next) {
  // If sender is not already in readBy, add them
  const alreadyRead = this.readBy?.some(entry =>
    entry.userId.toString() === this.senderId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({
      userId: this.senderId,
      role: this.senderRole
    });
  }

  next();
});

export default mongoose.model("Comment", commentSchema);
