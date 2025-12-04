import { statusCodes } from '../core/common/constant.js';
import * as inventoryService from '../services/inventory.service.js';

export const productReqistration = async (req, res) => {
    const registeredProduct = await inventoryService.registerProduct(req, res);
    res.status(statusCodes.created).send(registeredProduct);
}

export const getAllProducts = async (req, res) => {
    const allProducts = await inventoryService.getAllProducts(req, res);
    res.status(statusCodes.ok).json(allProducts);
}

export const updateProductById = async (req, res) => {
    const updatedProduct = await inventoryService.updateProductById(req, res);
    res.status(statusCodes.ok).json(updatedProduct);
}

export const deleteProductById = async (req, res) => {
    const deletedProduct = await inventoryService.deleteProductById(req, res);
    res.status(statusCodes.ok).json(deletedProduct);
}

// Routes for inventory Products Purchase

export const getAllPurchaseDetails = async (req, res) => {
    const purchaseDetails = await inventoryService.getAllPurchaseDetails(req, res);
    res.status(statusCodes.ok).json(purchaseDetails);
}

export const editPurchaseDetails = async (req, res) => {
    const updatedPurchaseDetails = await inventoryService.updatePurchaseDetailsById(req, res);
    res.status(statusCodes.ok).json(updatedPurchaseDetails);
}

export const deletePurchaseDetails = async (req, res) => {
    const deletedPurchaseDetails = await inventoryService.deletePurchaseDetailsById(req, res);
    res.status(statusCodes.ok).json(deletedPurchaseDetails);
}


export const dropDowns = async (req, res) => {
    const dropDownData = await inventoryService.dropDowns(req, res);
    res.status(statusCodes.ok).json(dropDownData);
}

export const registerPurchaseDetails = async (req, res) => {
    const purchaseDetails = await inventoryService.registerPurchaseDetails(req, res);
    res.status(statusCodes.created).json(purchaseDetails);
};

export const getPurchaseDetailsByIdController = async (req, res, next) => {
    const purchaseId = req.query.id;
        // const companyId = req.query.companyId;
    const purchaseDetail = await inventoryService.getPurchaseDetailsByIdService(purchaseId);
    res.status(statusCodes?.created).send(purchaseDetail);
}

// 
export const getAllProductUsages = async (req, res) => {
    const allUsages = await inventoryService.allUsagesOfProduct(req, res);
    res.status(statusCodes.ok).json(allUsages);
}
export const postUsageOfProduct = async (req, res) => {
    const postUsage = await inventoryService.postUsagesOfProduct(req, res);
    res.status(statusCodes.created).json(postUsage);
}

export const deleteUsagesOfProduct = async (req, res) => {
    const deleteProduct = await inventoryService.deleteUsagesOfProduct(req, res);
    res.status(statusCodes.ok).send(deleteProduct);
}

export const editUsagesOfProduct = async (req, res) => {
    const editProduct = await inventoryService.editUsagesOfProduct(req, res);
    res.status(statusCodes.created).send(editProduct);
}

export const getAllReports = async (req, res) => {
    const allReports = await inventoryService.allReports(req, res);
    res.status(statusCodes.ok).json(allReports);
}

export const getAllProductActivities = async (req, res) => {
    const allActivities = await inventoryService.allActivities(req,res);
    res.status(statusCodes.ok).json(allActivities);
}
