import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {createAnnouncement, getAllAnnouncement,editAnnouncement, deleteAnnounment ,getAnnouncementById} from "../controllers/announcement.controller.js";



router.post("/create", asyncHandler(createAnnouncement));
router.get("/getAllAnnouncement", asyncHandler(getAllAnnouncement));
router.get("/getAnnouncementById", asyncHandler(getAnnouncementById));
router.put("/editAnnouncement", asyncHandler(editAnnouncement));
router.patch("/delete", asyncHandler(deleteAnnounment));


export default router;

