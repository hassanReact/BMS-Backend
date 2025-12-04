import express from 'express';
import { asyncHandler } from '../utils/asyncWrapper.js';
import UnifiedVoucherController from '../controllers/UnifiedVoucher.controller.js';
const router = express.Router();
const voucherController = new UnifiedVoucherController();

// CRUD Operations
router.post('/', asyncHandler(voucherController.createVoucher));
router.get('/', asyncHandler(voucherController.getVouchers));
router.get('/:id', asyncHandler(voucherController.getVoucherById));
router.put('/:id', asyncHandler(voucherController.updateVoucher));
router.delete('/:id', asyncHandler(voucherController.deleteVoucher));

// Business Operations
router.post('/maintenance-receivable', asyncHandler(voucherController.createMaintenanceReceivable));
router.post('/vendor-payable', asyncHandler(voucherController.createVendorPayable));
router.post('/record-payment', asyncHandler(voucherController.recordPayment));

// Query Operations
router.get('/accounts-receivable', asyncHandler(voucherController.getAccountsReceivable));
router.get('/accounts-payable', asyncHandler(voucherController.getAccountsPayable));
router.get('/maintenance-services', asyncHandler(voucherController.getMaintenanceServices));
router.get('/outstanding-balance/:accountId/:accountType', asyncHandler(voucherController.getOutstandingBalance));

// Workflow Operations
router.patch('/:id/approve', asyncHandler(voucherController.approveVoucher));
router.patch('/:id/reject', asyncHandler(voucherController.rejectVoucher));

// Accounting Reports
router.get('/aging-report/:voucherType', asyncHandler(voucherController.generateAgingReport));
router.get('/monthly-summary/:month', asyncHandler(voucherController.generateMonthlySummary));
router.get('/trial-balance/:month', asyncHandler(voucherController.generateTrialBalance));
router.get('/ledger/:accountId/:accountType', asyncHandler(voucherController.generateLedger));

export default router;
