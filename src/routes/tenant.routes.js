import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { upload } from "../core/config/multer.js";

import { createTenant ,tenantLogin, getTenants, editTenant, getTenantsById, deleteTenantById,mybookings,getMyTenants,bulkUploadTenants,getAllTenants,uploadDocuments,getAllDocs,deleteTenantDocs, changePasswordTenant, mypropertie} from "../controllers/tenant.controller.js";
// import { authMiddleware } from "../middlewares/auth.middleware.js";

router.post("/register", upload.array('files', 10), asyncHandler(createTenant));
router.get("/getTenants", asyncHandler(getTenants));
router.get("/getTenantById", asyncHandler(getTenantsById));
router.put("/editTenant", asyncHandler(editTenant));
router.post("/login", asyncHandler(tenantLogin));
router.patch("/delete", asyncHandler(deleteTenantById));
router.get("/getMyTenants",asyncHandler(getMyTenants));
router.get("/mybooking", asyncHandler(mybookings));
router.get("/myproperties", asyncHandler(mypropertie));
router.get("/getAllTenants", asyncHandler(getAllTenants));

router.post("/tenantDoc", upload.single('files'), asyncHandler(uploadDocuments));
router.get("/getAllDocs", asyncHandler(getAllDocs));
router.delete("/deleteDoc",asyncHandler(deleteTenantDocs) );
router.post("/bulkUploadTenants",upload.single('files'),asyncHandler(bulkUploadTenants) );

router.patch("/changePassword", asyncHandler(changePasswordTenant));
 

export default router;