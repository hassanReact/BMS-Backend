import commentsModel from "../models/coments.model.js";
import CustomError from "../utils/exception.js";
import mongoose from "mongoose";

export const create = async (req, res) => {
    const { senderId, senderRole, message } = req.body;
    const complaintId = req.query.complaintId;

    const comment = await commentsModel.create({
        complaintId,
        senderId,
        senderRole,
        message
    });

    if (!comment) {
        throw new CustomError(
            statusCodes?.conflict,
            message?.alreadyExist,
            errorCodes?.already_exist
        )
    }
    return comment;
}

export const getComments = async (req, res) => {
    const id = req.params.complaintId;

    const comments = await commentsModel.find({ complaintId: id }).sort({ createdAt: 1 });

    if (!comments) {
        throw new CustomError(
            statusCodes?.conflict,
            message?.alreadyExist,
            errorCodes?.already_exist
        )
    }

    return comments;
}

export const markCommentsAsRead = async (req, res, next) => {
    const { complaintId, userId, role } = req.query;

    if (!complaintId || !userId || !role) {
        return res.status(400).json({
            success: false,
            message: "Missing complaintId, userId, or role",
        });
    }

    const comments = await commentsModel.find({ complaintId });

    console.log(comments)

    for (const comment of comments) {
        const alreadyRead = comment.readBy.some(
            (entry) => entry.userId.toString() === userId.toString()
        );

        if (!alreadyRead) {
            comment.readBy.push({ userId, role });
            await comment.save();
        }
    }
    return comments;
}

export const newMessages = async (req, res) => {
    const complaintId = req.params.complaintId;
    const userId = req.params.userId;

    const unreadCount = await commentsModel.countDocuments({
        complaintId,
        readBy: {
            $not: {
                $elemMatch: { userId: userId }
            }
        }
    });

    return unreadCount;
};
