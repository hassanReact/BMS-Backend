import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { authMiddleware } from "../middlewares/auth.middleware.js";
//LandLord Routes........................................................
import { createType,getAllTypes,editTypes,deleteTypes } from "../controllers/types.controller.js";

router.post("/createType",  asyncHandler(createType));
router.get("/getAllTypes", asyncHandler(getAllTypes));
router.put("/editType", asyncHandler(editTypes));
router.delete("/delete", asyncHandler(deleteTypes))
export default router;
