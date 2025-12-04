import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { authMiddleware } from "../middlewares/auth.middleware.js";
//LandLord Routes........................................................
import { userLogin,userRegistration } from "../controllers/user.controller.js";

router.post("/register",  asyncHandler(userRegistration));
router.post("/login", asyncHandler(userLogin));

router.post("/user-registeration");
export default router;
