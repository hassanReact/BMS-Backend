
import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const serviceProviderRepository = AppDataSource.getRepository("ServiceProvider");
const unifiedVoucherRepository = AppDataSource.getRepository("UnifiedVoucher");


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

  const agreement = req.file ? `uploads/purchaseBills/serviceAgreement/${req.file.filename}`: null;
  console.log("Agreement :", agreement);

  const serviceProvider = serviceProviderRepository.create({
    name,
    numOfStaff,
    phoneNo,
    workType,
    address,
    monthlyCharges,
    agreement,
    companyId
  });
  await serviceProviderRepository.save(serviceProvider);

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
  const serviceProvider = await serviceProviderRepository.findOne({ where: { id: serviceProviderId } });
  const updatedServiceProvider = serviceProvider
    ? await serviceProviderRepository.save(Object.assign(serviceProvider, updateData))
    : null;

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

  const serviceProviderData = await serviceProviderRepository.findOne({ where: { id: serviceProvider } });
  if (!serviceProviderData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  serviceProviderData.isDeleted = true;
  await serviceProviderRepository.save(serviceProviderData);

  return serviceProviderData
};

export const getServiceProviders = async (req, res) => {
  const companyId = req.query.id;

  const serviceProvider = await serviceProviderRepository.find({
    where: {
      companyId,
      isDeleted: false,
    },
    order: { createdAt: "DESC" },
  });

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
  const serviceProvider = await serviceProviderRepository.findOne({ where: { id: data.serviceId } });
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
      amount: {
        total: data.payment,
        balance: data.payment
      },
      sourceDocument: {
        referenceId: serviceProvider.id,
        referenceModel: 'ServiceProvider'
      },
      tags: ['ServiceProvider', 'Invoice'],
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'pending',
      details: data.details || `Invoice for services provided by ${serviceProvider.name}`
    };

    const unifiedVoucher = unifiedVoucherRepository.create(voucherData);
    await unifiedVoucherRepository.save(unifiedVoucher);

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
