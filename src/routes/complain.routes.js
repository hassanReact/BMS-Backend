import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { authMiddleware } from "../middlewares/auth.middleware.js";
//LandLord Routes........................................................
// import { userLogin,userRegistration } from "../controllers/user.controller.js";
import { complainRegistration, allComplain, assignStaff, editComplain, deleteComplain, allComplainForCompany, resolveComplain, getComplainById, addCommentToComplain, getAllComplainCompanyAgent } from "../controllers/complaint.controller.js";

router.post("/register", asyncHandler(complainRegistration));
router.get("/allComplain", asyncHandler(allComplain));
router.put("/editComplain", asyncHandler(editComplain));
router.patch("/delete", asyncHandler(deleteComplain));

router.get("/allComplainForCompany", asyncHandler(allComplainForCompany));
router.get("/getComplainById", asyncHandler(getComplainById));

router.patch("/resolveComplain", asyncHandler(resolveComplain));
router.patch("/addCommentToComplain", asyncHandler(addCommentToComplain))

router.get("/getAllComplainCompanyAgent", asyncHandler(getAllComplainCompanyAgent));

router.put("/assignedStaff", asyncHandler(assignStaff))


export default router;
