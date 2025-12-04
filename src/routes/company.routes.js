import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {companyRegistration, universalLogin, getAllCompany,editCompany,totalData,updateWhataapStatus, deleteCompany,changePassword,totalActiveCompany,commentAndResolved,addSubcriptionPlan,getCompanyById,changestatus,addSMTPMailPassword,updateMailStatus,companySubscriptionDetails} from "../controllers/company.controller.js"
import { transaction } from "../middlewares/transaction.middleware.js";

router.post("/register", asyncHandler(companyRegistration));
router.get("/getAllCompanies", asyncHandler(getAllCompany))
router.post("/login", asyncHandler(universalLogin));
router.put("/edit", asyncHandler(editCompany));
router.patch("/delete", asyncHandler(deleteCompany));

router.patch("/addMailPassword", asyncHandler(addSMTPMailPassword));
router.get("/getComplaints", asyncHandler(commentAndResolved));
router.get("/getCompanyById", asyncHandler(getCompanyById));

router.patch("/changestatus", asyncHandler(changestatus));
router.patch("/updateMailStatus", asyncHandler(updateMailStatus));
router.patch("/updateWhataapStatus", asyncHandler(updateWhataapStatus));
router.patch("/addSubcriptionPlan",transaction, asyncHandler(addSubcriptionPlan));
router.get("/getCompananySubcription", asyncHandler(companySubscriptionDetails));
router.get("/totalActiveCompany", asyncHandler(totalActiveCompany));

router.get("/totalData", asyncHandler(totalData));
router.patch("/changePassword", asyncHandler(changePassword))


export default router;
