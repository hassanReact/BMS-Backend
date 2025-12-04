import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
const router = Router();
import { createAccountsPayable, editAccountsPayable, getAccountsPayable, deleteAccountsPayable, getAccountsPayableById, postVoucherForVendor, postVoucherForPurchase, postVoucherForServiceProvider } from "../controllers/accountsPayable.controller.js";

router.post("/register", asyncHandler(createAccountsPayable));
router.put("/edit", asyncHandler(editAccountsPayable));
router.patch("/delete", asyncHandler(deleteAccountsPayable));
router.get("/getAccountsPayable", asyncHandler(getAccountsPayable));
router.get("/getById", asyncHandler(getAccountsPayableById));
router.post("/postVendorVoucher", asyncHandler(postVoucherForVendor))
router.post("/postPurchaseVoucher", asyncHandler(postVoucherForPurchase))
router.post("/postServiceProviderVoucher", asyncHandler(postVoucherForServiceProvider))

export default router;