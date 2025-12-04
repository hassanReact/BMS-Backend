import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {createExrtaCharge,editExtraAmount,getAllExtraCharge,getExtraChargeDetailsById,deleteExtraCharge} from "../controllers/extraCharge.controller.js";



router.post("/create", asyncHandler(createExrtaCharge));
router.get("/getAll", asyncHandler(getAllExtraCharge));
router.get("/extraChargeById", asyncHandler(getExtraChargeDetailsById));
router.put("/edit", asyncHandler(editExtraAmount));
router.patch("/delete", asyncHandler(deleteExtraCharge));


export default router;

