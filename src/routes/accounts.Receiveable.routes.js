import { Router } from 'express'
import { asyncHandler } from '../utils/asyncWrapper.js';
import { Accounts, allReceives, postVoucher, property, ServiceProvider, staff, Vendors, postBillVoucher } from '../controllers/accountsReceiveable.controller.js';
import { getAccountBalance, getAccountsSummary, getLedgerReport, getTransactionDetails, } from '../services/accountsReceiveables.services.js';

const router = Router();

router.get('/allReceives', asyncHandler(allReceives))
router.post('/postReceviablesVoucher', asyncHandler(postVoucher))
router.post('/postBillVoucher', asyncHandler(postBillVoucher));
router.get('/ledger', asyncHandler(getLedgerReport));
router.get('/balance', asyncHandler(getAccountBalance));
router.get('/summary', asyncHandler(getAccountsSummary));
router.get('/transaction/:voucherId', asyncHandler(getTransactionDetails));
router.get('/vendors', asyncHandler(Vendors));
router.get('/staff', asyncHandler(staff));
router.get('/accounts', asyncHandler(Accounts));
router.get('/property', asyncHandler(property));
router.get('/serviceProvider', asyncHandler(ServiceProvider));

export default router