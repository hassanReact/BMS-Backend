import { statusCodes } from "../core/common/constant.js";
import { uniqueVoucher } from "../services/voucherCounter.service.js";

export const generateUniqueVoucher = async (req, res) => {
    const voucher = await uniqueVoucher(req, res);
    res.status(statusCodes.ok).json(voucher);
}