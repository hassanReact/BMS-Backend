import { statusCodes } from "../core/common/constant.js";
import * as commentServices from "../services/comment.service.js"

export const addComment = async (req, res) => {
    const comment = await commentServices.create(req, res);
    res.status(statusCodes?.created).send(comment);
};

export const getComments = async (req, res) => {
    const comment = await commentServices.getComments(req, res);
    res.status(statusCodes?.ok).send(comment);
};

export const markCommentsAsRead = async (req, res) => {
    await commentServices.markCommentsAsRead(req, res);
    res.status(statusCodes?.ok).send({ message: "Marked as read" });
};

export const newMessages = async (req, res) => {
    const messages = await commentServices.newMessages(req, res);
    res.status(statusCodes?.ok || 200).json({ unreadCount: messages });
};
