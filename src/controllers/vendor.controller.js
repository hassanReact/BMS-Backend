import * as vendorService from '../services/vendor.service.js';
import { statusCodes } from "../core/common/constant.js";

export const vendorRegistration = async (req, res) => {
    const registeredVendor = await vendorService.registerVendor(req, res);
    res.status(statusCodes.created).send(registeredVendor);
}

export const getAllVendors = async (req, res) => {
    const vendors = await vendorService.getAllVendors(req, res);
    res.status(statusCodes?.ok).json(vendors);
}

export const vendorUpdation = async (req, res) => {
    const updatedVendor = await vendorService.updateVendor(req, res);
    res.status(statusCodes.ok).json(updatedVendor);
}

export const vendorDeletion = async (req, res) => {
    const deletedVendor = await vendorService.deleteVendor(req, res);
    res.status(statusCodes.ok).json(deletedVendor);
}