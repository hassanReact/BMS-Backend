import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { upload } from "../core/config/multer.js";

import {
  ownerLogin,
  ownerRegistration,
  getAllOwner,
  editOwner,
  deleteOwner,
  getOwnerById,
  getPropertyByOwnerId,
  bulkUploadOwner,
  getOwnerProperties,
  getOwnerPropertiesById
} from "../controllers/owner.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

router.post("/register", asyncHandler(ownerRegistration));
router.get("/getAllOwner", asyncHandler(getAllOwner));
router.get("/getOwnerProperties", asyncHandler(getOwnerProperties));
router.get("/getOwnerPropertiesById", asyncHandler(getOwnerPropertiesById));
router.post("/login", asyncHandler(ownerLogin));
router.put("/edit", asyncHandler(editOwner) );
router.patch("/delete", asyncHandler(deleteOwner));
router.get("/getOwnerById", asyncHandler(getOwnerById));
router.get("/getPropertyByOwnerId", asyncHandler(getPropertyByOwnerId));

router.post("/bulkUploadOwner",upload.single('files'),asyncHandler(bulkUploadOwner) );



export default router;
