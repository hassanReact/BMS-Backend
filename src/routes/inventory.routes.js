import express from 'express';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { getAllProducts, getAllProductActivities, getAllReports, deleteUsagesOfProduct, productReqistration, updateProductById, deleteProductById, dropDowns, registerPurchaseDetails, editPurchaseDetails, deletePurchaseDetails, getAllPurchaseDetails, getAllProductUsages, postUsageOfProduct, editUsagesOfProduct, getPurchaseDetailsByIdController } from '../controllers/inventory.controller.js';
import { upload } from '../core/config/multer.js';

const router = express.Router();

router.get('/dropdowns', asyncHandler(dropDowns));

// Routes for inventory Products Reqgistration

router.get('/all-product', asyncHandler(getAllProducts))
router.post('/product-registration', asyncHandler(productReqistration));
router.put('/editProduct/:id', asyncHandler(updateProductById)); // Assuming you have an edit function
router.delete('/deleteProduct/:id', asyncHandler(deleteProductById));

// Routes for inventory Products Purchase

router.post("/purchaseDetails", upload.single("bill"), asyncHandler(registerPurchaseDetails))
router.get('/getAllPurchaseDetails', asyncHandler(getAllPurchaseDetails));
router.get('/getPurchaseDetails', asyncHandler(getPurchaseDetailsByIdController));
router.put('/editPurchaseDetails/:id', upload.single("bill"), asyncHandler(editPurchaseDetails)); // Assuming you have an edit function for purchase details
router.delete('/deletePurchaseDetails/:id', asyncHandler(deletePurchaseDetails)); // Assuming you have

// Routes for inventory Products usage

router.get("/product-usage", asyncHandler(getAllProductUsages));
router.post("/postProductUsage", asyncHandler(postUsageOfProduct));
router.put("/editProductUsage/:id", asyncHandler(editUsagesOfProduct));
router.delete("/deleteProductUsage/:id", asyncHandler(deleteUsagesOfProduct));

// Stocks Reports

router.get("/allReports", asyncHandler(getAllReports));

// Product Activities
router.get("/allActivties", asyncHandler(getAllProductActivities));
export default router;