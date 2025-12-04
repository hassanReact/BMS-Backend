import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
import { createstaff, deleteStaff,changeStatusOfJob, editstaff, getAllJobs, getAllStaff, getStaffById, staffLogin, changePassword } from "../controllers/staff.controller.js";

const router = Router();

router.post("/register", asyncHandler(createstaff));
router.post("/login", asyncHandler(staffLogin));
router.put("/edit", asyncHandler(editstaff));
router.get("/getAllStaff", asyncHandler(getAllStaff));
router.delete("/delete/:id", asyncHandler(deleteStaff));
router.get("/getStaffById", asyncHandler(getStaffById));
router.patch("/changePassword", asyncHandler(changePassword));
router.get("/getAllJobs", asyncHandler(getAllJobs));
router.put("/update-job", asyncHandler(changeStatusOfJob));

export default router;