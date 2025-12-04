import Joi from 'joi';

/**
 * Validation schemas for Unified Voucher system
 */

// Base voucher validation schema
export const baseVoucherSchema = Joi.object({
  voucherType: Joi.string()
    .valid('AR', 'AP', 'VCH', 'PAY', 'PUR', 'SAL', 'JV', 'CN', 'SP', 'MDN','GB')
    .required()
    .messages({
      'any.required': 'Voucher type is required',
      'any.only': 'Voucher type must be one of: AR, AP, REC, PAY, PUR, SAL, JV, CN, DN'
    }),

  companyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Company ID is required',
      'string.pattern.base': 'Company ID must be a valid MongoDB ObjectId'
    }),

  date: Joi.date()
    .default(() => new Date())
    .messages({
      'date.base': 'Date must be a valid date'
    }),

  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .default(() => new Date().toISOString().slice(0, 7))
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format'
    }),

  particulars: Joi.string()
    .min(3)
    .max(500)
    .required()
    .messages({
      'any.required': 'Particulars are required',
      'string.min': 'Particulars must be at least 3 characters long',
      'string.max': 'Particulars cannot exceed 500 characters'
    }),

  amount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'any.required': 'Amount is required',
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.precision': 'Amount can have maximum 2 decimal places'
    }),

  totalAmountOwed: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Total amount owed must be a number',
      'number.positive': 'Total amount owed must be positive',
      'number.precision': 'Total amount owed can have maximum 2 decimal places'
    }),

  dueDate: Joi.when('voucherType', {
    is: Joi.string().valid('AR', 'AP'),
    then: Joi.date().required(),
    otherwise: Joi.date().optional()
  }).messages({
    'any.required': 'Due date is required for AR and AP vouchers'
  }),

  propertyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Property ID must be a valid MongoDB ObjectId'
    }),

  propertyName: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Property name cannot exceed 200 characters'
    }),

  status: Joi.string()
    .valid('draft', 'pending', 'approved', 'rejected', 'cancelled')
    .default('draft')
    .messages({
      'any.only': 'Status must be one of: draft, pending, approved, rejected, cancelled'
    }),

  approvedBy: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Approved by ID must be a valid MongoDB ObjectId'
    }),

  details: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Details cannot exceed 1000 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.max': 'Each tag cannot exceed 50 characters'
    })
});

// Debit entry validation schema
export const debitEntrySchema = Joi.object({
  accountId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Debit account ID is required',
      'string.pattern.base': 'Debit account ID must be a valid MongoDB ObjectId'
    }),

  accountType: Joi.string()
    .valid('Customer', 'Property', 'Vendor', 'Staff', 'ServiceProvider', 'Account', 'Company')
    .required()
    .messages({
      'any.required': 'Debit account type is required',
      'any.only': 'Debit account type must be one of: Customer, Property, Vendor, Staff, ServiceProvider, Account, Company'
    }),

  accountName: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Debit account name cannot exceed 200 characters'
    })
});

// Credit entry validation schema
export const creditEntrySchema = Joi.object({
  accountId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Credit account ID is required',
      'string.pattern.base': 'Credit account ID must be a valid MongoDB ObjectId'
    }),

  accountType: Joi.string()
    .valid('Customer', 'Property', 'Vendor', 'Staff', 'ServiceProvider', 'Account', 'Company')
    .required()
    .messages({
      'any.required': 'Credit account type is required',
      'any.only': 'Credit account type must be one of: Customer, Property, Vendor, Staff, ServiceProvider, Account, Company'
    }),

  accountName: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Credit account name cannot exceed 200 characters'
    })
});

// Source document validation schema
export const sourceDocumentSchema = Joi.object({
  referenceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Reference ID must be a valid MongoDB ObjectId'
    }),

  referenceModel: Joi.string()
    .valid('Maintenance', 'Bill', 'PurchaseDetails', 'ServiceProvider', 'Staff', 'Property')
    .optional()
    .messages({
      'any.only': 'Reference model must be one of: Maintenance, Bill, PurchaseDetails, ServiceProvider, Staff, Property'
    })
});

// Complete voucher validation schema
export const createVoucherSchema = baseVoucherSchema.keys({
  debit: debitEntrySchema.required(),
  credit: creditEntrySchema.required(),
  sourceDocument: sourceDocumentSchema.optional()
});

// Update voucher validation schema
export const updateVoucherSchema = Joi.object({
  particulars: Joi.string()
    .min(3)
    .max(500)
    .optional()
    .messages({
      'string.min': 'Particulars must be at least 3 characters long',
      'string.max': 'Particulars cannot exceed 500 characters'
    }),

  amount: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.precision': 'Amount can have maximum 2 decimal places'
    }),

  totalAmountOwed: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Total amount owed must be a number',
      'number.positive': 'Total amount owed must be positive',
      'number.precision': 'Total amount owed can have maximum 2 decimal places'
    }),

  dueDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Due date must be a valid date'
    }),

  status: Joi.string()
    .valid('draft', 'pending', 'approved', 'rejected', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: draft, pending, approved, rejected, cancelled'
    }),

  details: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Details cannot exceed 1000 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.max': 'Each tag cannot exceed 50 characters'
    })
});

// Maintenance receivable validation schema
export const maintenanceReceivableSchema = Joi.object({
  companyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Company ID is required',
      'string.pattern.base': 'Company ID must be a valid MongoDB ObjectId'
    }),

  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Customer ID is required',
      'string.pattern.base': 'Customer ID must be a valid MongoDB ObjectId'
    }),

  customerName: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'any.required': 'Customer name is required',
      'string.min': 'Customer name must be at least 2 characters long',
      'string.max': 'Customer name cannot exceed 200 characters'
    }),

  amount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'any.required': 'Amount is required',
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.precision': 'Amount can have maximum 2 decimal places'
    }),

  totalAmountOwed: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Total amount owed must be a number',
      'number.positive': 'Total amount owed must be positive',
      'number.precision': 'Total amount owed can have maximum 2 decimal places'
    }),

  propertyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Property ID must be a valid MongoDB ObjectId'
    }),

  propertyName: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Property name cannot exceed 200 characters'
    }),

  maintenanceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Maintenance ID is required',
      'string.pattern.base': 'Maintenance ID must be a valid MongoDB ObjectId'
    }),

  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format'
    }),

  dueDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Due date must be a valid date'
    })
});

// Vendor payable validation schema
export const vendorPayableSchema = Joi.object({
  companyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Company ID is required',
      'string.pattern.base': 'Company ID must be a valid MongoDB ObjectId'
    }),

  vendorId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Vendor ID is required',
      'string.pattern.base': 'Vendor ID must be a valid MongoDB ObjectId'
    }),

  vendorName: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'any.required': 'Vendor name is required',
      'string.min': 'Vendor name must be at least 2 characters long',
      'string.max': 'Vendor name cannot exceed 200 characters'
    }),

  amount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'any.required': 'Amount is required',
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.precision': 'Amount can have maximum 2 decimal places'
    }),

  totalAmountOwed: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Total amount owed must be a number',
      'number.positive': 'Total amount owed must be positive',
      'number.precision': 'Total amount owed can have maximum 2 decimal places'
    }),

  purchaseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Purchase ID is required',
      'string.pattern.base': 'Purchase ID must be a valid MongoDB ObjectId'
    }),

  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format'
    }),

  dueDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Due date must be a valid date'
    })
});

// Payment recording validation schema
export const recordPaymentSchema = Joi.object({
  voucherId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Voucher ID is required',
      'string.pattern.base': 'Voucher ID must be a valid MongoDB ObjectId'
    }),

  paymentAmount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'any.required': 'Payment amount is required',
      'number.base': 'Payment amount must be a number',
      'number.positive': 'Payment amount must be positive',
      'number.precision': 'Payment amount can have maximum 2 decimal places'
    }),

  paymentDate: Joi.date()
    .default(() => new Date())
    .optional()
    .messages({
      'date.base': 'Payment date must be a valid date'
    }),

  paymentMethod: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Payment method cannot exceed 100 characters'
    })
});

// Query parameters validation schemas
export const voucherQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  voucherType: Joi.string()
    .valid('AR', 'AP', 'REC', 'PAY', 'PUR', 'SAL', 'JV', 'CN', 'DN')
    .optional()
    .messages({
      'any.only': 'Voucher type must be one of: AR, AP, REC, PAY, PUR, SAL, JV, CN, DN'
    }),

  status: Joi.string()
    .valid('draft', 'pending', 'approved', 'rejected', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: draft, pending, approved, rejected, cancelled'
    }),

  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format'
    }),

  propertyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Property ID must be a valid MongoDB ObjectId'
    })
});

// Ledger query validation schema
export const ledgerQuerySchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format'
    }),

  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),

  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.min': 'End date must be after start date'
    })
});

// Aging report query validation schema
export const agingReportQuerySchema = Joi.object({
  voucherType: Joi.string()
    .valid('AR', 'AP')
    .default('AR')
    .messages({
      'any.only': 'Voucher type must be either AR or AP'
    })
});

// Monthly summary query validation schema
export const monthlySummaryQuerySchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      'any.required': 'Month parameter is required (YYYY-MM format)',
      'string.pattern.base': 'Month must be in YYYY-MM format'
    })
});

// Trial balance query validation schema
export const trialBalanceQuerySchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      'any.required': 'Month parameter is required (YYYY-MM format)',
      'string.pattern.base': 'Month must be in YYYY-MM format'
    })
});

// Approve voucher validation schema
export const approveVoucherSchema = Joi.object({
  approvedBy: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Approved by ID is required',
      'string.pattern.base': 'Approved by ID must be a valid MongoDB ObjectId'
    })
});

// Reject voucher validation schema
export const rejectVoucherSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Rejection reason cannot exceed 500 characters'
    })
});

export default {
  createVoucherSchema,
  updateVoucherSchema,
  maintenanceReceivableSchema,
  vendorPayableSchema,
  recordPaymentSchema,
  voucherQuerySchema,
  ledgerQuerySchema,
  agingReportQuerySchema,
  monthlySummaryQuerySchema,
  trialBalanceQuerySchema,
  approveVoucherSchema,
  rejectVoucherSchema
};
