import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { uploadWaterBills } from "../core/config/multer.js";
import { createbill, getAllBill, billVoucher, getBillForT, getBillById, reporterDetails, changeBillStatus, deleteBill, getAllUnpaidBillForAgent, getBillForTPending, getBillByCreaterBy, totalPaidBills, getBillByBookingId, getMonthlyBillData, getTotalSales, totalYearlySales, totalPendingBills, getMonthlyPaidForTenant, getMonthlyPaidBillsForAgent, getBillSummaryBetweenDates, bulkUploadWaterBills, updateBill } from "../controllers/bill.controller.js";


router.post("/createBill", asyncHandler(createbill));
router.post("/reporterDetails", asyncHandler(reporterDetails));
router.get("/getAllBill", asyncHandler(getAllBill));
router.get("/getBillForT", asyncHandler(getBillForT));
router.get("/getBillForTPending", asyncHandler(getBillForTPending));
router.patch("/changeBillStatus", asyncHandler(changeBillStatus));
router.get("/getBillById", asyncHandler(getBillById));
router.patch("/DeleteBill", asyncHandler(deleteBill));
router.patch("/updateBill/:id", asyncHandler(updateBill));
router.get("/getBillByAgentId", asyncHandler(getBillByCreaterBy));
router.get("/getBillByBookingId", asyncHandler(getBillByBookingId));
router.get("/getMonthlyBillData", asyncHandler(getMonthlyBillData));
router.get("/getTotalSales", asyncHandler(getTotalSales));
router.get("/totalYearlySales", asyncHandler(totalYearlySales));
router.get("/totalPendingBills", asyncHandler(totalPendingBills));
router.get("/totalPaidBills", asyncHandler(totalPaidBills));
router.get("/getAllUnpaidBillForAgent", asyncHandler(getAllUnpaidBillForAgent));
router.get("/getMonthlyBillOfTenants", asyncHandler(getMonthlyPaidForTenant));
router.get("/getMonthlyPaidBillsForAgent", asyncHandler(getMonthlyPaidBillsForAgent))
router.get("/getBillSummaryBetweenDates", asyncHandler(getBillSummaryBetweenDates))
router.post("/bulkUploadWaterBills", uploadWaterBills.single('file'), asyncHandler(bulkUploadWaterBills))
router.post("/billVoucher", asyncHandler(billVoucher))

export default router;

