import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import {createBlock,getBlock,editBlock,deleteBlock } from "../controllers/block.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../core/config/multer.js";
//LandLord Routes........................................................

router.post("/register", asyncHandler(createBlock));
router.put("/edit", asyncHandler(editBlock));
router.patch("/delete", asyncHandler(deleteBlock));
router.get("/getBlock", asyncHandler(getBlock));

export default router;