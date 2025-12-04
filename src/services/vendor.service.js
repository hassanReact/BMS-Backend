import Vendor from "../models/vendor.model.js";
import CustomError from "../utils/exception.js";
import { getCompanyById } from "./company.services.js";

export const registerVendor = async (req, res) => {
    const { vendorName, vendorContact, vendorEmail, BankAccountNo, productDescription } = req.body;
    const companyId = req.query.companyId;

    if (!vendorName || !vendorContact || !vendorEmail || !BankAccountNo) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const registerVendor = await Vendor.create({
        companyId,
        vendorName,
        vendorContact,
        vendorEmail,
        vendorAccountNo: BankAccountNo,
        description: productDescription || ""
    });

    if (!registerVendor) {
        throw new CustomError(
            statusCodes?.conflict,
            Message?.alreadyExist,
            errorCodes?.already_exist
        );
    }
    
    return registerVendor

};

export const getAllVendors = async (req, res) => {
    const companyId = req.query.companyId;


    const allVendors = await Vendor.find({ isDeleted: false, companyId }).sort({ createdAt: -1 });

    if (!allVendors || allVendors.length === 0) {
        throw new CustomError(
            statusCodes?.conflict,
            Message?.alreadyExist,
            errorCodes?.already_exist
        );
    }

    return allVendors
}

export const updateVendor = async (req, res) => {
    const { id } = req.params;
    const { vendorName, vendorContact, vendorEmail, BankAccountNo, productDescription } = req.body;

    if (!vendorName || !vendorContact || !BankAccountNo) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
        id,
        {
            vendorName: vendorName || "",
            vendorContact: vendorContact || "",
            vendorEmail: vendorEmail || "",
            vendorAccountNo: BankAccountNo || "",
            description: productDescription || ""
        },
        { new: true }
    );

    if (!updatedVendor) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    return updatedVendor
}

export const deleteVendor = async (req, res) => {
    const { id } = req.params;

    const deletedVendor = await Vendor.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
    );

    if (!deletedVendor) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    return deletedVendor
}