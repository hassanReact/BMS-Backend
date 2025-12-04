import express from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
import { generateUniqueVoucher } from "../controllers/voucherCouter.controller.js";

const router = express.Router();

router.get("/generate-voucher", asyncHandler(generateUniqueVoucher));

export default router;
