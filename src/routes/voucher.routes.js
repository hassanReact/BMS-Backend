import express from 'express';
import * as voucherController from '../controllers/voucher.controller.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

const router = express.Router();

// Get all vouchers (with pagination/filtering)
router.get('/getAllVoucher', asyncHandler(voucherController.getAllVouchers));

// Get voucher statistics
router.get('/stats', asyncHandler(voucherController.getVoucherStats));

// Get single voucher by ID
router.get('/getVoucher/:id', asyncHandler(voucherController.getVoucherById));

// Update voucher
router.put('/update/:id', asyncHandler(voucherController.updateVoucher));

// Delete voucher
router.delete('/delete/:id', asyncHandler(voucherController.deleteVoucher));

// Bulk delete vouchers
router.post('/bulk-delete', asyncHandler(voucherController.bulkDeleteVouchers));

export default router;
