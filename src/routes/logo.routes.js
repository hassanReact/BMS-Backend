import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { authMiddleware } from "../middlewares/auth.middleware.js";
//LandLord Routes........................................................
import { logoUpload,getUplaod } from "../controllers/logo.controller.js";
import { upload } from "../core/config/multer.js";

router.patch("/uploadLogo",upload.single('file'), asyncHandler(logoUpload));
router.get("/getUplaod", asyncHandler(getUplaod));

export default router;
