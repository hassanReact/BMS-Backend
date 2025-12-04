import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure directories exist
const purchaseDir = path.join(process.cwd(), "uploads", "purchaseBills");
const waterBillsDir = path.join(process.cwd(), "uploads", "waterBills");

if (!fs.existsSync(purchaseDir)) {
  fs.mkdirSync(purchaseDir, { recursive: true });
}

if (!fs.existsSync(waterBillsDir)) {
  fs.mkdirSync(waterBillsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, purchaseDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = file.originalname.replace(/\s+/g, "_").replace(/[^\w.-]/gi, "");
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",    
    "image/png",     
    "application/pdf", 
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image, PDF, Word, and Excel files are allowed"), false);
  }
};

// Water bills storage configuration
const waterBillsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, waterBillsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = file.originalname.replace(/\s+/g, "_").replace(/[^\w.-]/gi, "");
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

// Excel file filter for water bills
const excelFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xls, .xlsx) are allowed for water bills"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export const uploadWaterBills = multer({
  storage: waterBillsStorage,
  fileFilter: excelFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
