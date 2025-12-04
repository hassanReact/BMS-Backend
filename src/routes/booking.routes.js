import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
// import { createBooking } from "../services/booking.services.js";
import { createBooking, getAllBooking,editBooking,getBooking ,getBookingById,breakTheBooking,PropertyOnNotice,createbill} from "../controllers/booking.controller.js";


router.post("/create", asyncHandler(createBooking));
router.post("/createBill", asyncHandler(createbill));
router.put("/editBooking", asyncHandler(editBooking));
router.get("/getBooking", asyncHandler(getBooking));
router.get("/allBooking", asyncHandler(getAllBooking));
router.get("/getBookingById", asyncHandler(getBookingById));
router.patch("/breakTheBooking", asyncHandler(breakTheBooking));

router.get("/propertyOnNotice", asyncHandler(PropertyOnNotice));


export default router;

