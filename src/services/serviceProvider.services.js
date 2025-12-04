
import ServiceProvider from "../models/serviceprovider.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import AccountsPayable from "../models/accountsPayable.model.js";
import AccountsVoucher from "../models/accountsVoucher.model.js";
import UnifiedVoucher from "../models/UnifiedVoucher.model.js";


export const createServiceProvider = async (req, res) => {

  const {
    name,
    numOfStaff,
    phoneNo,
    workType,
    address,
    monthlyCharges,
    companyId
  } = req.body;

  const agreement = req.file ? `uploads/purchaseBills/serviceAgreement/${req.file.filename}` : null;
  console.log("Agreement :", agreement);

  const serviceProvider = await ServiceProvider.create({
    name,
    numOfStaff,
    phoneNo,
    workType,
    address,
    monthlyCharges,
    agreement,
    companyId
  });

  return serviceProvider
};

export const editServiceProvider = async (req, res) => {
  const serviceProviderId = req.query.id;

  if (!serviceProviderId) {
    return res.status(400).json({
      message: "Property ID is required.",
      errorCode: "property_id_missing",
    });
  }

  const {
    name,
    numOfStaff,
    phoneNo,
    workType,
    address,
    monthlyCharges,
    companyId
  } = req.body;

  const updateData = {
    name,
    numOfStaff,
    phoneNo,
    workType,
    address,
    monthlyCharges,
    companyId
  };
  const updatedServiceProvider = await ServiceProvider.findByIdAndUpdate(
    serviceProviderId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedServiceProvider) {
    return res.status(404).json({
      message: "Service Provider not found.",
      errorCode: "Service Provider Error",
    });
  }

  return updatedServiceProvider;

};

export const deleteServiceProvider = async (req, res) => {
  const serviceProvider = req.query.id;

  const serviceProviderData = await ServiceProvider.findById(serviceProvider);
  if (!serviceProviderData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  serviceProviderData.isDeleted = true;
  await serviceProviderData.save();

  return serviceProviderData
};

export const getServiceProviders = async (req, res) => {
  const companyId = req.query.id;

  const serviceProvider = await ServiceProvider.find({
    companyId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!serviceProvider) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  return serviceProvider;
};

export const postInvoice = async (req, res) => {

  const data = req.body;

  if (!data) {
    throw new CustomError(
      Message.missing_field,
      statusCodes.notFound
    );
  }

  // Check if service provider exists
  const serviceProvider = await ServiceProvider.findById(data.serviceId);
  if (!serviceProvider) {
    throw new CustomError(
      Message.invalidId,
      statusCodes.notFound
    );
  }

  console.log(data);
  
  // Create UnifiedVoucher entry for Accounts Payable
  try {
    // Create debit and credit objects based on the request data
    const debit = {
      accountId: data.companyId, // Company account (debit)
      accountType: 'Company', // Required field for UnifiedVoucher
      accountName: 'Company Account', // Denormalized for reporting
      amount: data.payment
    };

    const credit = {
      accountId: data.serviceId, // Service provider account (credit)
      accountType: 'ServiceProvider', // Required field for UnifiedVoucher
      accountName: serviceProvider.name, // Denormalized for reporting
      amount: data.payment
    };

    const voucherData = {
      voucherNo: data.voucherNo,
      voucherType: 'SP', // Service Provider voucher
      companyId: data.companyId,
      date: new Date(),
      month: data.month || new Date().toISOString().slice(0, 7), // Use provided month or current month
      particulars: data.particulars || `Service invoice from ${serviceProvider.name}`,
      debit: debit,
      credit: credit,
      "amount.total": data.payment,
      "amount.balance": data.payment,
      sourceDocument: {
        referenceId: serviceProvider._id,
        referenceModel: 'ServiceProvider'
      },
      tags: ['ServiceProvider', 'Invoice'],
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'pending',
      details: data.details || `Invoice for services provided by ${serviceProvider.name}`
    };

    const unifiedVoucher = await UnifiedVoucher.create(voucherData);

    if (!unifiedVoucher) {
      throw new CustomError(
        statusCodes?.serviceUnavailable,
        'Failed to create voucher for service invoice',
        errorCodes?.service_unavailable
      );
    }

    console.log(`Created UnifiedVoucher ${data.voucherNo} for service provider: ${serviceProvider.name}`);
    
    return unifiedVoucher;
  } catch (voucherError) {
    console.error('Error creating UnifiedVoucher for service invoice:', voucherError);
    throw new CustomError(
      statusCodes?.serviceUnavailable,
      'Failed to create voucher for service invoice',
      errorCodes?.service_unavailable
    );
  }

};
