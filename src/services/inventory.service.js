import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import dayjs from 'dayjs';
import AppDataSource from "../core/database/data-source.js";
import ProductRegistration from "../entities/productRegistration.entity.js";
import PurchaseDetails from "../entities/purchaseDetails.entity.js";
import UsageDetails from "../entities/usageDetails.entity.js";
import UnifiedVoucherEntity from "../entities/unifiedVoucher.entity.js";
import AccountsPayableEntity from "../entities/accountsPayable.entity.js";
import VendorEntity from "../entities/vendor.entity.js";
import PropertyEntity from "../entities/property.entity.js";
import { Between, In, IsNull, LessThan } from "typeorm";

const productRepository = AppDataSource.getRepository(ProductRegistration);
const purchaseRepository = AppDataSource.getRepository(PurchaseDetails);
const usageRepository = AppDataSource.getRepository(UsageDetails);
const unifiedVoucherRepository = AppDataSource.getRepository(UnifiedVoucherEntity);
const accountsPayableRepository = AppDataSource.getRepository(AccountsPayableEntity);
const vendorRepository = AppDataSource.getRepository(VendorEntity);
const propertyRepository = AppDataSource.getRepository(PropertyEntity);


export const dropDowns = async (req, res) => {

  const companyId = req.query.companyId
  const companyFilter = companyId === undefined ? IsNull() : companyId;

  const productName = await productRepository.find({
    where: { isDeleted: false, companyId: companyFilter },
    select: { id: true, productName: true },
    order: { createdAt: "DESC" },
  });
  const vendorName = await vendorRepository.find({
    where: { isDeleted: false, companyId: companyFilter },
    select: { id: true, vendorName: true },
    order: { createdAt: "DESC" },
  });
  // const residents = await Tenant.find({ isDeleted: false, companyId }).select('_id tenantName phoneno address').sort({ createdAt: -1 }) || [];
  const residentRecords = await propertyRepository.find({
    where: { isDeleted: false, companyId: companyFilter },
    select: { id: true, propertyname: true, blockId: true },
    relations: { block: true },
    order: { createdAt: "DESC" },
  });
  const residents = residentRecords.map(({ block, ...resident }) => ({
    ...resident,
    blockId: block,
  }));

  if (!productName || !vendorName) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return { productName, vendorName, residents };
}

// Services for Product Registration:

export const registerProduct = async (req, res) => {
  const { productName, productModel, productDescription } = req.body;
  const companyId = req.query.companyId

  if (!productName || !productModel || !productDescription) {
    throw new CustomError(
      statusCodes?.badRequest,
      'All fields are required',
      errorCodes?.missing_parameter
    );
  }

  const registerProduct = productRepository.create({
    companyId,
    productName,
    productModel,
    productDescription
  });
  await productRepository.save(registerProduct);
  if (!registerProduct) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return registerProduct;
}

export const getAllProducts = async (req, res) => {
  const companyId = req.query.companyId;
  const companyFilter = companyId === undefined ? IsNull() : companyId;

  const allProducts = await productRepository.find({
    where: { isDeleted: false, companyId: companyFilter },
    order: { createdAt: "DESC" },
  });

  if (!allProducts) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return allProducts;
}

export const updateProductById = async (req, res) => {
  const { id } = req.params;
  const { productName, productModel, productDescription } = req.body;

  if (!productName || !productModel || !productDescription) {
    throw new CustomError(
      statusCodes?.badRequest,
      'All fields are required',
      errorCodes?.missing_parameter
    );
  }

  const product = await productRepository.findOne({ where: { id } });
  const updatedProduct = product
    ? await productRepository.save(
        Object.assign(product, { productName, productModel, productDescription })
      )
    : null;

  if (!updatedProduct) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return updatedProduct;
}

export const deleteProductById = async (req, res) => {
  const { id } = req.params;

  const product = await productRepository.findOne({ where: { id } });
  const deletedProduct = product
    ? await productRepository.save(Object.assign(product, { isDeleted: true }))
    : null;

  if (!deletedProduct) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return deletedProduct;
}

// Purchase Details Registration

export const registerPurchaseDetails = async (req, res) => {
  try {
    const {
      productId,
      productName,
      vendorId,
      vendorName,
      unit,
      quantity,
      price,
      billNumber,
      status,
      voucherNo
    } = req.body;

    const companyId = req.query.companyId;
    const bill = req.file ? `uploads/purchaseBills/${req.file.filename}` : null;

    if (
      !productId || !productName || !vendorId || !vendorName || !unit ||
      !quantity || !price || !bill || !billNumber
    ) {
      throw new CustomError(
        statusCodes?.badRequest,
        'All fields are required',
        errorCodes?.missing_parameter
      );
    }

    const purchaseDetails = purchaseRepository.create({
      companyId,
      productId,
      productName,
      vendorName,
      vendorId,
      unit,
      quantity,
      unitPerPrice: price,
      bill,
      billNumber,
      status
    });
    await purchaseRepository.save(purchaseDetails);
    purchaseDetails.quantity = Number(purchaseDetails.quantity);
    purchaseDetails.unitPerPrice = Number(purchaseDetails.unitPerPrice);

    if (!purchaseDetails) {
      throw new CustomError(
        statusCodes?.conflict,
        'Purchase already exists',
        errorCodes?.already_exist
      );
    }

    // Create UnifiedVoucher for purchase
    try {
    const amount = Number(quantity) * Number(price);

      const particulars = `Purchase of ${quantity} ${unit} ${productName} from ${vendorName}`;
      const voucherData = {
        voucherNo: voucherNo || billNumber,
        voucherType: 'PUR',
        companyId,
        date: new Date(),
        month: new Date().toISOString().slice(0, 7), // YYYY-MM format
        particulars,
      debit: {
        accountId: productId,
          accountType: 'PurchaseDetails',
          accountName: productName
      },
      credit: {
        accountId: vendorId,
          accountType: 'Vendor',
          accountName: vendorName
      },
        amount,
        outstandingAmount: amount,
        totalAmountOwed: amount,
        sourceDocument: {
          referenceId: purchaseDetails.id,
          referenceModel: 'PurchaseDetails'
        },
        tags: ['Purchase', 'Inventory'],
      status: 'pending',
        paymentStatus: 'pending',
        details: `Purchase of ${productName} - Bill No: ${billNumber}`
      };

      const unifiedVoucher = unifiedVoucherRepository.create(voucherData);
      await unifiedVoucherRepository.save(unifiedVoucher);

      if (!unifiedVoucher) {
        console.warn('Failed to create UnifiedVoucher for purchase');
      } else {
        console.log(`Created UnifiedVoucher ${voucherNo || billNumber} for purchase: ${productName}`);
      }

    } catch (voucherError) {
      console.error('Error creating UnifiedVoucher for purchase:', voucherError);
      // Throw error for voucher creation failures to ensure proper tracking
      throw new CustomError(
        statusCodes?.serviceUnavailable,
        'Failed to create voucher for purchase',
        errorCodes?.service_unavailable
      );
    }

    return purchaseDetails;
  } catch (err) {
    throw err; // Pass error to global error handler
  }
};

export const getPurchaseDetailsByIdService = async (purchasedId) => {
  console.log("Route hit: /getPurchaseDetailById", purchasedId);
  // const purchasedId = req.query.id
  const purchaseDetail = await purchaseRepository.findOne({
    where: { id: purchasedId, isDeleted: false },
  });
  if (!purchaseDetail) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  purchaseDetail.quantity = Number(purchaseDetail.quantity);
  purchaseDetail.unitPerPrice = Number(purchaseDetail.unitPerPrice);
  return purchaseDetail;
};

export const updatePurchaseDetailsById = async (req, res) => {
  const { id } = req.params;
  const { productName, productId, vendorId, vendorName, quantity, unit, price, voucherNo } = req.body;
  const newBill = req.file ? `uploads/purchaseBills/${req.file.filename}` : undefined;

  console.log("=============>", newBill);
  if (!productId || !productName || !vendorName || !unit || !quantity || !price || !vendorId) {
    throw new CustomError(
      statusCodes?.badRequest,
      'All fields are required',
      errorCodes?.missing_parameter
    );
  }

  const existingPurchase = await purchaseRepository.findOne({ where: { id } });
  if (!existingPurchase) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const updatedPurchaseDetails = await purchaseRepository.save(
    Object.assign(existingPurchase, {
      productId,
      productName,
      vendorName,
      vendorId,
      unit,
      quantity,
      unitPerPrice: price,
      bill: newBill || existingPurchase.bill, // Fallback to old bill if new one not uploaded
    })
  );
  updatedPurchaseDetails.quantity = Number(updatedPurchaseDetails.quantity);
  updatedPurchaseDetails.unitPerPrice = Number(updatedPurchaseDetails.unitPerPrice);

  await accountsPayableRepository.update(
    { purchaseDetailId: updatedPurchaseDetails.id },
    {
      productName,
      vendorName,
      unit,
      quantity,
      unitPerPrice: price,
      bill: newBill || existingPurchase.bill,
    }
  );

  // Update corresponding UnifiedVoucher if it exists
  try {
    const existingVoucher = await unifiedVoucherRepository
      .createQueryBuilder("voucher")
      .where('"voucher"."source_document" ->> \'referenceId\' = :referenceId', {
        referenceId: updatedPurchaseDetails.id,
      })
      .andWhere('"voucher"."source_document" ->> \'referenceModel\' = :referenceModel', {
        referenceModel: 'PurchaseDetails',
      })
      .getOne();

    if (existingVoucher) {
      const amount = Number(quantity) * Number(price);
      
      const particulars = `Purchase of ${quantity} ${unit} ${productName} from ${vendorName}`;
      
      const debitAccount = {
        accountId: productId,
        accountType: 'ProductRegistration',
        accountName: productName
      };
      
      const creditAccount = {
        accountId: vendorId,
        accountType: 'Vendor',
        accountName: vendorName
      };

      const currentPaid =
        Number(existingVoucher.totalAmountOwed) -
        Number(existingVoucher.outstandingAmount);
      const newOutstandingAmount = Math.max(0, amount - currentPaid);

      const voucherUpdateData = {
        voucherNo: voucherNo || existingVoucher.voucherNo,
        particulars,
        debit: debitAccount,
        credit: creditAccount,
        amount,
        outstandingAmount: newOutstandingAmount,
        totalAmountOwed: amount,
        status: 'pending',
        paymentStatus: 'pending',
        details: `Purchase of ${productName} - Bill No: ${updatedPurchaseDetails.billNumber}`
      };

      await unifiedVoucherRepository.save(
        Object.assign(existingVoucher, voucherUpdateData)
      );
    }
  } catch (voucherError) {
    console.error('Error updating UnifiedVoucher for purchase edit:', voucherError);
    // Don't throw error for voucher update failures to avoid blocking the main update
  }

  return updatedPurchaseDetails;
};

export const deletePurchaseDetailsById = async (req, res) => {
  const { id } = req.params;

  const deletedPurchaseDetails = await purchaseRepository.findOne({ where: { id } });
  if (deletedPurchaseDetails) {
    await purchaseRepository.remove(deletedPurchaseDetails);
  }

  if (!deletedPurchaseDetails) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return deletedPurchaseDetails;
}

export const getAllPurchaseDetails = async (req, res) => {
  const companyId = req.query.companyId;
  const companyFilter = companyId === undefined ? IsNull() : companyId;
  const allPurchaseDetails = await purchaseRepository.find({
    where: { isDeleted: false, companyId: companyFilter },
    order: { createdAt: "DESC" },
  });
  allPurchaseDetails.forEach((purchase) => {
    purchase.quantity = Number(purchase.quantity);
    purchase.unitPerPrice = Number(purchase.unitPerPrice);
  });

  if (!allPurchaseDetails) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return allPurchaseDetails;
}


// Usages of Product:

export const allUsagesOfProduct = async (req, res) => {
  const companyId = req.query.companyId;
  const companyFilter = companyId === undefined ? IsNull() : companyId;

  const usageRecords = await usageRepository.find({
    where: { isDeleted: false, companyId: companyFilter },
    relations: { resident: true },
    order: { createdAt: "DESC" },
  });
  const allUsages = usageRecords.map(({ resident, ...usage }) => ({
    ...usage,
    productQuantity: Number(usage.productQuantity),
    productPrice:
      usage.productPrice === null ? null : Number(usage.productPrice),
    residentId: resident,
  }));

  if (!allUsages) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return allUsages;
}

export const postUsagesOfProduct = async (req, res) => {
  const {
    productName,
    productId,
    quantity,
    usedFor,
    generalInput,
    residentName,
    residentId,
    billingType,
    price,
    description,
    voucherNo
  } = req.body;

  const companyId = req.query.companyId;

  if (
    !productName ||
    !productId ||
    !quantity ||
    !usedFor ||
    !billingType ||
    (!residentId && usedFor === 'resident') ||
    (!generalInput && usedFor === 'general') ||
    (!price && billingType === 'price') ||
    !description
  ) {
    throw new CustomError(
      statusCodes?.badRequest,
      'All required fields must be provided.',
      errorCodes?.missing_parameter
    );
  }

  let payload = {
    companyId,
    productId,
    productName,
    productQuantity: quantity,
    usedFor,
    billingType
  };

  if (usedFor === 'general') {
    payload.generalDescription = generalInput;
  } else {
    payload.residentId = residentId;
    payload.residentName = residentName
  }

  if (billingType === 'foc') {
    payload.focDescription = description;
  } else {
    payload.productPrice = price;
    payload.priceDescription = description;
  }

  const productUsage = usageRepository.create(payload);
  await usageRepository.save(productUsage);
  productUsage.productQuantity = Number(productUsage.productQuantity);
  if (productUsage.productPrice !== null && productUsage.productPrice !== undefined) {
    productUsage.productPrice = Number(productUsage.productPrice);
  }

  console.log(productUsage);

  if (!productUsage) {
    throw new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }

  // Create UnifiedVoucher for product usage
  try {
    // Calculate amount based on billing type
    const amount = billingType === 'price' ? (quantity * price) : 0;

    // Only create voucher if amount is greater than 0
    if (amount > 0) {
      // Determine particulars based on usage type
      let particulars;
      if (usedFor === 'general') {
        particulars = `Product usage: ${productName} (${quantity} units) - ${generalInput}`;
      } else {
        particulars = `Product usage: ${productName} (${quantity} units) for ${residentName}`;
      }

      // Determine debit and credit accounts
      let debitAccount, creditAccount;

      if (usedFor === 'resident' && residentId) {
        // For resident usage - Debit: Resident, Credit: Inventory/Product
        debitAccount = {
          accountId: residentId,
          accountType: 'Property', // Assuming residents are linked to properties
          accountName: residentName || 'Resident'
        };
        creditAccount = {
          accountId: productUsage.id,
          accountType: 'UsageDetails',
          accountName: productName
        };
      } else {
        // For general usage - Debit: Company/General Expense, Credit: Inventory/Product
        debitAccount = {
          accountId: companyId,
          accountType: 'Company',
          accountName: 'General Expense'
        };
        creditAccount = {
          accountId: productUsage.id,
          accountType: 'UsageDetails',
          accountName: productName
        };
      }

      const voucherData = {
        voucherNo,
        voucherType: 'PU', // Journal Voucher for internal usage
        companyId,
        date: new Date(),
        month: new Date().toISOString().slice(0, 7), // YYYY-MM format
        particulars,
        debit: debitAccount,
        credit: creditAccount,
        amount,
        outstandingAmount: amount,
        totalAmountOwed: amount,
        sourceDocument: {
          referenceId: productUsage.id,
          referenceModel: 'UsageDetails' // Linking to usage details
        },
        tags: ['ProductUsage', usedFor === 'resident' ? 'Resident' : 'General'],
        status: 'pending',
        paymentStatus: 'pending', // If priced, it's pending payment
        details: description
      };

      // Add property context if it's for a resident
      if (usedFor === 'resident' && residentId) {
        voucherData.propertyId = residentId;
        voucherData.propertyName = residentName;
      }


      const unifiedVoucher = unifiedVoucherRepository.create(voucherData);
      await unifiedVoucherRepository.save(unifiedVoucher);


      if (!unifiedVoucher) {
        console.warn('Failed to create UnifiedVoucher for product usage');
      } else {
        console.log(`Created UnifiedVoucher ${voucherNo} for product usage: ${productName}`);
      }
    } else {
      console.log(`Skipped UnifiedVoucher creation for FOC product usage: ${productName}`);

      // Create a record for FOC usage tracking without monetary value
      try {
        const focVoucherData = {
          voucherNo: voucherNo || `FOC-${Date.now()}`,
          voucherType: 'PU', // Free of charge voucher type
          companyId,
          date: new Date(),
          month: new Date().toISOString().slice(0, 7),
          particulars: `FOC Product usage: ${productName} (${quantity} units)${usedFor === 'resident' ? ` for ${residentName}` : ` - ${generalInput}`}`,
          debit: {
            accountId: companyId,
            accountType: 'Company',
            accountName: 'FOC Expense'
          },
          credit: {
            accountId: productUsage.id,
            accountType: 'UsageDetails',
            accountName: productName
          },
          amount,
          outstandingAmount: amount,
          totalAmountOwed: amount,
          sourceDocument: {
            referenceId: productUsage.id,
            referenceModel: 'UsageDetails'
          },
          tags: ['ProductUsage', 'FOC', usedFor === 'resident' ? 'Resident' : 'General'],
          status: 'approved',
          paymentStatus: 'paid', // FOC items are considered paid
          details: description
        };

        if (usedFor === 'resident' && residentId) {
          focVoucherData.propertyId = residentId;
          focVoucherData.propertyName = residentName;
        }

        const focVoucher = unifiedVoucherRepository.create(focVoucherData);
        await unifiedVoucherRepository.save(focVoucher);

        if (focVoucher) {
          console.log(`Created FOC tracking voucher for product usage: ${productName}`);
        } else {
          console.warn(`Failed to create FOC tracking voucher for product usage: ${productName}`);
        }
      } catch (focError) {
        console.error(`Error creating FOC tracking voucher for product usage ${productName}:`, focError);
        throw new CustomError(
          statusCodes?.serviceUnavailable,
          'Failed to create FOC tracking record',
          errorCodes?.service_unavailable
        );
      }
    }

  } catch (voucherError) {
    console.error('Error creating UnifiedVoucher for product usage:', voucherError);
    // Throw error for voucher creation failures to ensure proper tracking
    throw new CustomError(
      statusCodes?.serviceUnavailable,
      'Failed to create voucher for product usage',
      errorCodes?.service_unavailable
    );
  }

  return productUsage;
};

export const editUsagesOfProduct = async (req, res) => {
  const { id } = req.params;
  const {
    productName,
    productId,
    quantity,
    usedFor,
    generalInput,
    residentSelect,
    residentId,
    residentName,
    billingType,
    price,
    description,
    voucherNo
  } = req.body;

  if (
    !productName ||
    !productId ||
    !quantity ||
    !usedFor ||
    !billingType ||
    (!residentName && usedFor === 'resident') ||
    (!generalInput && usedFor === 'general') ||
    (!price && billingType === 'price') ||
    !description
  ) {
    throw new CustomError(
      statusCodes?.badRequest,
      'All required fields must be provided.',
      errorCodes?.missing_parameter
    );
  }

  let updateData = {
    productId,
    productName,
    productQuantity: quantity,
    usedFor,
    billingType
  };

  if (usedFor === 'general') {
    updateData.generalDescription = generalInput;
  } else {
    // Only set residentId if it's not empty and is a valid ObjectId
    if (residentId && residentId.trim() !== '') {
    updateData.residentId = residentId;
  } else {
      updateData.residentId = null;
  }
    updateData.residentName = residentName;
  }

  if (billingType === 'foc') {
    updateData.focDescription = description;
      } else {
    updateData.productPrice = price;
    updateData.priceDescription = description;
      }

  const usage = await usageRepository.findOne({ where: { id } });
  const updated = usage
    ? await usageRepository.save(Object.assign(usage, updateData))
    : null;
  if (updated) {
    updated.productQuantity = Number(updated.productQuantity);
    if (updated.productPrice !== null && updated.productPrice !== undefined) {
      updated.productPrice = Number(updated.productPrice);
    }
  }

  if (!updated) {
    throw new CustomError(
      statusCodes?.notFound,
      'Usage record not found.',
      errorCodes?.not_found
    );
  }

  // Update corresponding UnifiedVoucher if it exists
  try {
    const existingVoucher = await unifiedVoucherRepository
      .createQueryBuilder("voucher")
      .where('"voucher"."source_document" ->> \'referenceId\' = :referenceId', {
        referenceId: updated.id,
      })
      .andWhere('"voucher"."source_document" ->> \'referenceModel\' = :referenceModel', {
        referenceModel: 'UsageDetails',
      })
      .getOne();

    if (existingVoucher) {
      const amount = billingType === 'price' ? (quantity * price) : 0;
      
      let particulars;
      if (usedFor === 'general') {
        particulars = `Product usage: ${productName} (${quantity} units) - ${generalInput}`;
      } else {
        particulars = `Product usage: ${productName} (${quantity} units) for ${residentName}`;
      }
      let debitAccount, creditAccount;
      if (usedFor === 'resident' && residentName) {
        debitAccount = {
          accountId: (residentId && residentId.trim() !== '') ? residentId : updated.id,
          accountType: 'Property',
          accountName: residentName
        };
        creditAccount = {
          accountId: updated.id,
          accountType: 'UsageDetails',
          accountName: productName
};
      } else {
        debitAccount = {
          accountId: updated.companyId,
          accountType: 'Company',
          accountName: 'General Expense'
        };
        creditAccount = {
          accountId: updated.id,
          accountType: 'UsageDetails',
          accountName: productName
        };
      }

      const currentPaid =
        Number(existingVoucher.totalAmountOwed ?? existingVoucher.amount) -
        Number(existingVoucher.outstandingAmount ?? existingVoucher.amount);
      const newBalance = amount - currentPaid;

      const voucherUpdateData = {
        voucherNo: voucherNo || existingVoucher.voucherNo,
        particulars,
        debit: debitAccount,
        credit: creditAccount,
        amount,
        outstandingAmount: isNaN(newBalance) ? amount : newBalance,
        totalAmountOwed: amount,
        status: billingType === 'foc' ? 'approved' : 'pending',
        paymentStatus: billingType === 'foc' ? 'paid' : 'pending',
        details: description
      };

      if (usedFor === 'resident' && residentName) {
        if (residentId && residentId.trim() !== '') {
          voucherUpdateData.propertyId = residentId;
        }
        voucherUpdateData.propertyName = residentName;
      }

      await unifiedVoucherRepository.save(
        Object.assign(existingVoucher, voucherUpdateData)
      );
    }
  } catch (voucherError) {
    console.error('Error updating UnifiedVoucher for product usage edit:', voucherError);
    // Don't throw error for voucher update failures to avoid blocking the main update
  }

  return updated;
};

export const deleteUsagesOfProduct = async (req, res) => {
  const { id } = req.params;

  const usage = await usageRepository.findOne({ where: { id } });

  if (!usage || usage.isDeleted) {
    throw new CustomError(
      statusCodes?.notFound,
      'Usage record not found or already deleted.',
      errorCodes?.not_found
    );
  }

  usage.isDeleted = true;
  await usageRepository.save(usage);
  usage.productQuantity = Number(usage.productQuantity);
  if (usage.productPrice !== null && usage.productPrice !== undefined) {
    usage.productPrice = Number(usage.productPrice);
  }

  return usage;
};

export const allReports = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const companyId = req.query.companyId;
  const skip = (page - 1) * limit;

  try {
    const products = await productRepository.find({
      where: {
        isDeleted: false,
        ...(companyId ? { companyId } : {}),
      },
    });
    const pageProducts = products.slice(skip, skip + limit);
    const productIds = pageProducts.map(({ id }) => id);
    const purchases = productIds.length
      ? await purchaseRepository.find({
          where: { productId: In(productIds), isDeleted: false },
        })
      : [];
    const usages = productIds.length
      ? await usageRepository.find({
          where: { productId: In(productIds), isDeleted: false },
        })
      : [];

    const data = pageProducts.map((product) => {
      const productPurchases = purchases
        .filter(({ productId }) => productId === product.id)
        .map((purchase) => ({
          ...purchase,
          quantity: Number(purchase.quantity),
          unitPerPrice: Number(purchase.unitPerPrice),
        }));
      const productUsages = usages
        .filter(({ productId }) => productId === product.id)
        .map((usage) => ({
          ...usage,
          productQuantity: Number(usage.productQuantity),
          productPrice:
            usage.productPrice === null ? null : Number(usage.productPrice),
        }));
      const totalPurchased = productPurchases.reduce(
        (sum, purchase) => sum + purchase.quantity,
        0
      );
      const totalPurchaseValue = productPurchases.reduce(
        (sum, purchase) => sum + purchase.quantity * purchase.unitPerPrice,
        0
      );
      const totalUsed = productUsages.reduce(
        (sum, usage) => sum + usage.productQuantity,
        0
      );
      const totalUsageValue = productUsages.reduce(
        (sum, usage) =>
          sum +
          (usage.billingType === "price" && usage.productPrice !== null
            ? usage.productQuantity * usage.productPrice
            : 0),
        0
      );
      const purchaseActivities = productPurchases.map((purchase) => ({
        type: "purchase",
        date: purchase.createdAt,
        quantity: purchase.quantity,
        unitPrice: purchase.unitPerPrice,
        totalValue: purchase.quantity * purchase.unitPerPrice,
        vendor: purchase.vendorName,
        billNumber: purchase.billNumber,
        unit: purchase.unit,
        status: purchase.status,
      }));
      const usageActivities = productUsages.map((usage) => ({
        type: "usage",
        date: usage.createdAt,
        quantity: usage.productQuantity,
        usedFor: usage.usedFor,
        residentName: usage.residentName,
        generalDescription: usage.generalDescription,
        billingType: usage.billingType,
        price: usage.productPrice,
        totalValue:
          usage.billingType === "price"
            ? usage.productPrice === null
              ? null
              : usage.productQuantity * usage.productPrice
            : 0,
        description:
          usage.billingType === "foc"
            ? usage.focDescription
            : usage.priceDescription,
      }));

      return {
        ...product,
        purchases: productPurchases,
        usages: productUsages,
        totalPurchased,
        totalPurchaseValue,
        totalUsed,
        totalUsageValue,
        currentStock: totalPurchased - totalUsed,
        purchaseActivities,
        usageActivities,
        allActivities: [...purchaseActivities, ...usageActivities].sort(
          (left, right) => new Date(right.date) - new Date(left.date)
        ),
        totalTransactions: productPurchases.length + productUsages.length,
      };
    });

    return {
      total: products.length,
      page,
      limit,
      data,
    };
  } catch (error) {
    console.error('allReports error:', error);
    throw new CustomError(
      statusCodes?.internalServerError,
      'Server Error',
      errorCodes?.server_error
    );
  }
};


export const allActivities = async (req, res) => {
  const { productName, startDate, endDate, companyId } = req.query;

  if (!productName) {
    throw new CustomError(
      statusCodes.badRequest,
      "Product name is required",
      errorCodes.bad_request
    );
  }

  const start = startDate ? new Date(startDate) : new Date('1970-01-01');
  const end = endDate ? new Date(endDate) : new Date();

  const companyFilter = companyId ? { companyId } : {};

  // Opening balance filter
  const openingFilter = {
    productName,
    isDeleted: false,
    ...companyFilter,
  };

  const pastPurchases = await purchaseRepository.find({
    where: { ...openingFilter, createdAt: LessThan(start) },
  });
  const pastUsages = await usageRepository.find({
    where: { ...openingFilter, createdAt: LessThan(start) },
  });

  const totalPurchasedBefore = pastPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.quantity),
    0
  );
  const totalUsedBefore = pastUsages.reduce(
    (sum, usage) => sum + Number(usage.productQuantity),
    0
  );
  let balance = totalPurchasedBefore - totalUsedBefore;

  // Activities in range
  const filter = {
    productName,
    isDeleted: false,
    ...companyFilter,
  };

  const purchases = await purchaseRepository.find({
    where: { ...filter, createdAt: Between(start, end) },
    order: { createdAt: "ASC" },
  });
  const usages = await usageRepository.find({
    where: { ...filter, createdAt: Between(start, end) },
    order: { createdAt: "ASC" },
  });

  const activityLog = [];

  purchases.forEach(p => {
    activityLog.push({
      date: p.createdAt,
      particulars: p.vendorName,
      inwards: Number(p.quantity),
      outwards: 0
    });
  });

  usages.forEach(u => {
    activityLog.push({
      date: u.createdAt,
      particulars:
        u.usedFor === 'general' ? u.generalDescription : `Resident (${u.residentName})`,
      inwards: 0,
      outwards: Number(u.productQuantity)
    });
  });

  activityLog.sort((a, b) => new Date(a.date) - new Date(b.date));

  const report = [
    {
      particulars: 'Opening Balance',
      inwards: '-',
      outwards: '-',
      balance
    },
    ...activityLog.map(entry => {
      balance += entry.inwards - entry.outwards;
      return {
        date: dayjs(entry.date).format('DD-MM-YYYY'),
        particulars: entry.particulars,
        inwards: entry.inwards || '-',
        outwards: entry.outwards || '-',
        balance
      };
    })
  ];


  const result = { productName, report };

  return result;

};