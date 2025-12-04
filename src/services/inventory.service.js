import Inventory from "../models/inventory.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Vendor from "../models/vendor.model.js";
import Tenant from "../models/tenant.model.js";
import dayjs from 'dayjs';
import mongoose from "mongoose";
import AccountsPayable from "../models/accountsPayable.model.js";
import Property from "../models/property.model.js";
import UnifiedVoucher from "../models/UnifiedVoucher.model.js";


export const dropDowns = async (req, res) => {

  const companyId = req.query.companyId

  const productName = await Inventory.ProductRegistration.find({ isDeleted: false, companyId }).select('_id productName ').sort({ createdAt: -1 });
  const vendorName = await Vendor.find({ isDeleted: false, companyId }).select('_id vendorName').sort({ createdAt: -1 });
  // const residents = await Tenant.find({ isDeleted: false, companyId }).select('_id tenantName phoneno address').sort({ createdAt: -1 }) || [];
  const residents = await Property.find({ isDeleted: false, companyId }).select('_id propertyname blockId').sort({ createdAt: -1 }).populate('blockId');

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

  const registerProduct = await Inventory.ProductRegistration.create({
    companyId,
    productName,
    productModel,
    productDescription
  })
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

  const allProducts = await Inventory.ProductRegistration.find({ isDeleted: false, companyId }).sort({ createdAt: -1 });

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

  const updatedProduct = await Inventory.ProductRegistration.findByIdAndUpdate(
    id,
    { productName, productModel, productDescription },
    { new: true }
  );

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

  const deletedProduct = await Inventory.ProductRegistration.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

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

    const purchaseDetails = await Inventory.PurchaseDetails.create({
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
        "amount.total": amount,
        "amount.balance": amount,
        sourceDocument: {
          referenceId: purchaseDetails._id,
          referenceModel: 'PurchaseDetails'
        },
        tags: ['Purchase', 'Inventory'],
      status: 'pending',
        paymentStatus: 'pending',
        details: `Purchase of ${productName} - Bill No: ${billNumber}`
      };

      const unifiedVoucher = await UnifiedVoucher.create(voucherData);

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
  console.log("🔍 Route hit: /getPurchaseDetailById", purchasedId);
  // const purchasedId = req.query.id
  const purchaseDetail = await Inventory.PurchaseDetails.findOne({ _id: new mongoose.Types.ObjectId(purchasedId), isDeleted: false });
  if (!purchaseDetail) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
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

  const existingPurchase = await Inventory.PurchaseDetails.findById(id);
  if (!existingPurchase) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const updatedPurchaseDetails = await Inventory.PurchaseDetails.findByIdAndUpdate(
    id,
    {
      productId,
      productName,
      vendorName,
      vendorId,
      unit,
      quantity,
      unitPerPrice: price,
      bill: newBill || existingPurchase.bill, // Fallback to old bill if new one not uploaded
    },
    { new: true }
  );

  await AccountsPayable.findOneAndUpdate(
    { purchaseDetailId: updatedPurchaseDetails._id },
    {
      productName,
      vendorName,
      unit,
      quantity,
      unitPerPrice: price,
      bill: newBill || existingPurchase.bill,
      details: `payable for purchase: ${productName}`,
    }
  );

  // Update corresponding UnifiedVoucher if it exists
  try {
    const existingVoucher = await UnifiedVoucher.findOne({
      'sourceDocument.referenceId': updatedPurchaseDetails._id,
      'sourceDocument.referenceModel': 'PurchaseDetails'
    });

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

      // Safely calculate balance to avoid NaN
      const currentTotal = Number(existingVoucher["amount.total"]) || 0;
      const currentPaid = Number(existingVoucher["amount.paid"]) || 0;
      const newBalance = amount - currentPaid;

      const voucherUpdateData = {
        voucherNo: voucherNo || existingVoucher.voucherNo,
        particulars,
        debit: debitAccount,
        credit: creditAccount,
        "amount.total": amount,
        "amount.balance": isNaN(newBalance) ? amount : newBalance,
        status: 'pending',
        paymentStatus: 'pending',
        details: `Purchase of ${productName} - Bill No: ${updatedPurchaseDetails.billNumber}`
      };

      await UnifiedVoucher.findByIdAndUpdate(existingVoucher._id, voucherUpdateData);
    }
  } catch (voucherError) {
    console.error('Error updating UnifiedVoucher for purchase edit:', voucherError);
    // Don't throw error for voucher update failures to avoid blocking the main update
  }

  return updatedPurchaseDetails;
};

export const deletePurchaseDetailsById = async (req, res) => {
  const { id } = req.params;

  const deletedPurchaseDetails = await Inventory.PurchaseDetails.findByIdAndDelete(id);

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
  const allPurchaseDetails = await Inventory.PurchaseDetails.find({ isDeleted: false, companyId }).sort({ createdAt: -1 });

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

  const allUsages = await Inventory.UsageDetails.find({ isDeleted: false, companyId }).sort({ createdAt: -1 })
    .populate('residentId');

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

  const productUsage = await Inventory.UsageDetails.create(payload);

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
          accountId: productUsage._id,
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
          accountId: productUsage._id,
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
        "amount.total": amount,
        "amount.balance": amount,
        sourceDocument: {
          referenceId: productUsage._id,
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


      const unifiedVoucher = await UnifiedVoucher.create(voucherData);


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
            accountId: productUsage._id,
            accountType: 'UsageDetails',
            accountName: productName
          },
          "amount.total": price,
          "amount.balance": price,
          sourceDocument: {
            referenceId: productUsage._id,
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

        const focVoucher = await UnifiedVoucher.create(focVoucherData);

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
    billingType,
    generalDescription: undefined,
    residentId: undefined,
    residentName: undefined,
    focDescription: undefined,
    productPrice: undefined,
    priceDescription: undefined
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

  const updated = await Inventory.UsageDetails.findByIdAndUpdate(id, updateData, {
    new: true
  });

  if (!updated) {
    throw new CustomError(
      statusCodes?.notFound,
      'Usage record not found.',
      errorCodes?.not_found
    );
  }

  // Update corresponding UnifiedVoucher if it exists
  try {
    const existingVoucher = await UnifiedVoucher.findOne({
      'sourceDocument.referenceId': updated._id,
      'sourceDocument.referenceModel': 'UsageDetails'
    });

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
          accountId: (residentId && residentId.trim() !== '') ? residentId : updated._id,
          accountType: 'Property',
          accountName: residentName
        };
        creditAccount = {
          accountId: updated._id,
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
          accountId: updated._id,
          accountType: 'UsageDetails',
          accountName: productName
        };
      }

      // Safely calculate balance to avoid NaN
      const currentTotal = Number(existingVoucher["amount.total"]) || 0;
      const currentPaid = Number(existingVoucher["amount.paid"]) || 0;
      const newBalance = amount - currentPaid;

      const voucherUpdateData = {
        voucherNo: voucherNo || existingVoucher.voucherNo,
        particulars,
        debit: debitAccount,
        credit: creditAccount,
        "amount.total": amount,
        "amount.balance": isNaN(newBalance) ? amount : newBalance,
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

      await UnifiedVoucher.findByIdAndUpdate(existingVoucher._id, voucherUpdateData);
    }
  } catch (voucherError) {
    console.error('Error updating UnifiedVoucher for product usage edit:', voucherError);
    // Don't throw error for voucher update failures to avoid blocking the main update
  }

  return updated;
};

export const deleteUsagesOfProduct = async (req, res) => {
  const { id } = req.params;

  const usage = await Inventory.UsageDetails.findById(id);

  if (!usage || usage.isDeleted) {
    throw new CustomError(
      statusCodes?.notFound,
      'Usage record not found or already deleted.',
      errorCodes?.not_found
    );
  }

  usage.isDeleted = true;
  await usage.save();

  return usage;
};

export const allReports = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const companyId = req.query.companyId;
  const skip = (page - 1) * limit;

  try {
    const result = await Inventory.ProductRegistration.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(companyId ? { companyId: new mongoose.Types.ObjectId(companyId) } : {})
        }
      },
      {
        $lookup: {
          from: 'purchasedetails',
          localField: '_id',
          foreignField: 'productId',
          as: 'purchases',
          pipeline: [
            { $match: { isDeleted: false } }
          ]
        }
      },
      {
        $lookup: {
          from: 'usagedetails',
          localField: '_id',
          foreignField: 'productId',
          as: 'usages',
          pipeline: [
            { $match: { isDeleted: false } }
          ]
        }
      },
      {
        $addFields: {
          // Purchase calculations
          totalPurchased: { $sum: "$purchases.quantity" },
          totalPurchaseValue: {
            $sum: {
              $map: {
                input: "$purchases",
                as: "p",
                in: { $multiply: ["$$p.quantity", "$$p.unitPerPrice"] }
              }
            }
          },
          // Usage calculations
          totalUsed: { $sum: "$usages.productQuantity" },
          totalUsageValue: {
            $sum: {
              $map: {
                input: "$usages",
                as: "u",
                in: {
                  $cond: {
                    if: { $eq: ["$$u.billingType", "price"] },
                    then: { $multiply: ["$$u.productQuantity", "$$u.productPrice"] },
                    else: 0
                  }
                }
              }
            }
          },
          // Current stock calculation
          currentStock: {
            $subtract: [
              { $sum: "$purchases.quantity" },
              { $sum: "$usages.productQuantity" }
            ]
          },
          // Purchase activities with details
          purchaseActivities: {
            $map: {
              input: "$purchases",
              as: "p",
              in: {
                type: "purchase",
                date: "$$p.createdAt",
                quantity: "$$p.quantity",
                unitPrice: "$$p.unitPerPrice",
                totalValue: { $multiply: ["$$p.quantity", "$$p.unitPerPrice"] },
                vendor: "$$p.vendorName",
                billNumber: "$$p.billNumber",
                unit: "$$p.unit",
                status: "$$p.status"
              }
            }
          },
          // Usage activities with details
          usageActivities: {
            $map: {
              input: "$usages",
              as: "u",
              in: {
                type: "usage",
                date: "$$u.createdAt",
                quantity: "$$u.productQuantity",
                usedFor: "$$u.usedFor",
                residentName: "$$u.residentName",
                generalDescription: "$$u.generalDescription",
                billingType: "$$u.billingType",
                price: "$$u.productPrice",
                totalValue: {
                  $cond: {
                    if: { $eq: ["$$u.billingType", "price"] },
                    then: { $multiply: ["$$u.productQuantity", "$$u.productPrice"] },
                    else: 0
                  }
                },
                description: {
                  $cond: {
                    if: { $eq: ["$$u.billingType", "foc"] },
                    then: "$$u.focDescription",
                    else: "$$u.priceDescription"
                  }
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          // Combine all activities and sort by date
          allActivities: {
            $sortArray: {
              input: { $concatArrays: ["$purchaseActivities", "$usageActivities"] },
              sortBy: { date: -1 }
            }
          },
          // Summary counts
          totalTransactions: {
            $add: [
              { $size: "$purchases" },
              { $size: "$usages" }
            ]
          }
        }
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit }
          ]
        }
      },
      {
        $unwind: {
          path: "$metadata",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          total: "$metadata.total",
          data: 1
        }
      }
    ]);

    const response = result[0] || { total: 0, data: [] };
    return {
      total: response.total || 0,
      page,
      limit,
      data: response.data
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

  const companyFilter = companyId ? { companyId: new mongoose.Types.ObjectId(companyId) } : {};

  // Opening balance filter
  const openingFilter = {
    productName,
    createdAt: { $lt: start },
    isDeleted: false,
    ...companyFilter
  };

  const pastPurchases = await Inventory.PurchaseDetails.find(openingFilter);
  const pastUsages = await Inventory.UsageDetails.find(openingFilter);

  const totalPurchasedBefore = pastPurchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalUsedBefore = pastUsages.reduce((sum, u) => sum + u.productQuantity, 0);
  let balance = totalPurchasedBefore - totalUsedBefore;

  // Activities in range
  const filter = {
    productName,
    createdAt: { $gte: start, $lte: end },
    isDeleted: false,
    ...companyFilter
  };

  const purchases = await Inventory.PurchaseDetails.find(filter).sort({ createdAt: 1 });
  const usages = await Inventory.UsageDetails.find(filter).sort({ createdAt: 1 });

  const activityLog = [];

  purchases.forEach(p => {
    activityLog.push({
      date: p.createdAt,
      particulars: p.vendorName,
      inwards: p.quantity,
      outwards: 0
    });
  });

  usages.forEach(u => {
    activityLog.push({
      date: u.createdAt,
      particulars:
        u.usedFor === 'general' ? u.generalDescription : `Resident (${u.residentName})`,
      inwards: 0,
      outwards: u.productQuantity
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