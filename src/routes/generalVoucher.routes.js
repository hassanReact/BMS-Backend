import express from 'express';
import {
  getVoucherReferences,
  createGeneralVoucher,
  getAllGeneralVouchers,
  getGeneralVoucherById,
  updateGeneralVoucher,
  deleteGeneralVoucher,
  approveGeneralVoucher
} from '../controllers/generalVoucher.controller.js';

const router = express.Router();

// Get all reference entities for voucher selection
router.get('/references', getVoucherReferences);

// Create a general voucher
router.post('/', createGeneralVoucher);

// Get all general vouchers with pagination
router.get('/', getAllGeneralVouchers);

// Get a specific general voucher by ID
router.get('/:id', getGeneralVoucherById);

// Update a general voucher
router.put('/:id', updateGeneralVoucher);

// Delete a general voucher (soft delete)
router.delete('/:id', deleteGeneralVoucher);

// Approve a general voucher
router.patch('/:id/approve', approveGeneralVoucher);

export default router;
