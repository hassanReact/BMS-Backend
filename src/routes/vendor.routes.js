import express from 'express';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { vendorRegistration, getAllVendors, vendorUpdation, vendorDeletion } from '../controllers/vendor.controller.js';

const router = express.Router();

router.post('/register', asyncHandler(vendorRegistration));
router.get('/getAllVendors', asyncHandler(getAllVendors));
router.put('/updateVendor/:id', asyncHandler(vendorUpdation)); // Assuming vendorRegistration can also handle updates
router.delete('/deleteVendor/:id', asyncHandler(vendorDeletion)); // Assuming you have a vendorDeletion controller
export default router;