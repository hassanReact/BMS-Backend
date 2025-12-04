import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import {createProject,getProject,editProject,deleteProject } from "../controllers/project.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../core/config/multer.js";
//LandLord Routes........................................................

router.post("/register", asyncHandler(createProject));
router.put("/edit", asyncHandler(editProject));
router.patch("/delete", asyncHandler(deleteProject));
router.get("/getProject", asyncHandler(getProject));

export default router;