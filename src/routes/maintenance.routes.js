import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { createMaintenance, getMaintenance, editMaintenance, deleteMaintenance, applyMaintainance } from "../controllers/maintenance.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../core/config/multer.js";
//LandLord Routes........................................................

router.post("/register", asyncHandler(createMaintenance));
router.put("/edit", asyncHandler(editMaintenance));
router.patch("/delete", asyncHandler(deleteMaintenance));
router.get("/getMaintenance", asyncHandler(getMaintenance));
router.post('/apply', asyncHandler(applyMaintainance));

export default router;