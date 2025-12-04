import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { createServiceProvider, getServiceProviders, editServiceProvider, deleteServiceProvider, invoiceProvider } from "../controllers/serviceprovider.controller.js";
import { upload } from "../core/config/multer.js";
//LandLord Routes........................................................

router.post("/register", upload.single('agreement'), asyncHandler(createServiceProvider));
router.put("/edit", asyncHandler(editServiceProvider));
router.patch("/delete", asyncHandler(deleteServiceProvider));
router.get("/getServiceProviders", asyncHandler(getServiceProviders));
router.post("/invoice", asyncHandler(invoiceProvider));

export default router;
