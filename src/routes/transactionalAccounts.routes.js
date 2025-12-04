import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import {createTransactionalAccount, getTransactionalAccount, editTransactionalAccount, deleteTransactionalAccount, getTransactionalAccountById } from "../controllers/transactionalAccounts.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../core/config/multer.js";
//LandLord Routes........................................................

router.post("/register", asyncHandler(createTransactionalAccount));
router.get("/getById/:id", asyncHandler(getTransactionalAccountById));
router.put("/edit", asyncHandler(editTransactionalAccount));
router.patch("/delete", asyncHandler(deleteTransactionalAccount));
router.get("/getTransactionalAccounts", asyncHandler(getTransactionalAccount));

export default router;