import express from "express"
import { asyncHandler } from "../utils/asyncWrapper.js";
import { addComment, getComments, markCommentsAsRead, newMessages } from "../controllers/comments.controller.js";

const router = express.Router();

router.post("/addComment", asyncHandler(addComment));
router.get("/:complaintId", asyncHandler(getComments));
router.put("/markAsRead", asyncHandler(markCommentsAsRead));
router.get("/new-messages/:complaintId/:userId", asyncHandler(newMessages));

export default router;