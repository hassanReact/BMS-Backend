import AppDataSource from "../core/database/data-source.js";
import CustomError from "../utils/exception.js";
import { getCompanyById } from "./company.services.js";

const vendorRepository = AppDataSource.getRepository("Vendor");

export const registerVendor = async (req, res) => {
    const { vendorName, vendorContact, vendorEmail, BankAccountNo, productDescription } = req.body;
    const companyId = req.query.companyId;

    if (!vendorName || !vendorContact || !vendorEmail || !BankAccountNo) {
        return res.status(400).json({ message: "All fields are required" });
    }

     // Check whether this vendor already exists for this company
    const isVendorAlreadyExist = await vendorRepository.findOne({
        where: {
            companyId: companyId,
            vendorEmail: vendorEmail
        }
    });

    if (isVendorAlreadyExist) {
        throw new CustomError(
            statusCodes?.conflict,
            Message?.alreadyExist,
            errorCodes?.already_exist
        );
    }

    const registerVendor = vendorRepository.create({
        companyId,
        vendorName,
        vendorContact,
        vendorEmail,
        vendorAccountNo: BankAccountNo,
        description: productDescription || ""
    });
    await vendorRepository.save(registerVendor);

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


    const allVendors = await vendorRepository.find({
        where: { isDeleted: false, companyId },
        order: { createdAt: "DESC" }
    });

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

    const vendor = await vendorRepository.findOne({ where: { id } });
    const updatedVendor = vendor
        ? await vendorRepository.save(Object.assign(vendor, {
            vendorName: vendorName || "",
            vendorContact: vendorContact || "",
            vendorEmail: vendorEmail || "",
            vendorAccountNo: BankAccountNo || "",
            description: productDescription || ""
        }))
        : null;

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

    const vendor = await vendorRepository.findOne({ where: { id } });
    const deletedVendor = vendor
        ? await vendorRepository.save(Object.assign(vendor, { isDeleted: true }))
        : null;

    if (!deletedVendor) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    return deletedVendor
}