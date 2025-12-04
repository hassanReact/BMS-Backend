import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import {createSubscription ,getAllSubscriptions,editSubscriptions,deleteSubscriptions,getSubTransaction,getAllSubTransaction} from "../controllers/subscription.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../core/config/multer.js";
//LandLord Routes........................................................

router.post("/register", asyncHandler(createSubscription));
router.put("/edit", asyncHandler(editSubscriptions));
router.patch("/delete", asyncHandler(deleteSubscriptions));
router.get("/getSubscription", asyncHandler(getAllSubscriptions));
router.get("/getSubTransaction", asyncHandler(getSubTransaction));
router.get("/getAllSubTransaction", asyncHandler(getAllSubTransaction));

export default router;
