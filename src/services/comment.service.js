import AppDataSource from "../core/database/data-source.js";
import CustomError from "../utils/exception.js";

const commentRepository = AppDataSource.getRepository("Comment");

export const create = async (req, res) => {
    const { senderId, senderRole, message } = req.body;
    const complaintId = req.query.complaintId;

    const comment = commentRepository.create({
    complaintId,
    senderId,
    senderRole,
    message,
    readBy: [
        {
            userId: senderId,
            role: senderRole
        }
    ]
});
    await commentRepository.save(comment);

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

    const comments = await commentRepository.find({
        where: { complaintId: id },
        order: { createdAt: "ASC" },
    });

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

    const comments = await commentRepository.find({ where: { complaintId } });

    console.log(comments)

    for (const comment of comments) {
        const alreadyRead = comment.readBy.some(
            (entry) => entry.userId.toString() === userId.toString()
        );

        if (!alreadyRead) {
            comment.readBy.push({ userId, role });
            await commentRepository.save(comment);
        }
    }
    return comments;
}

export const newMessages = async (req, res) => {
    const complaintId = req.params.complaintId;
    const userId = req.params.userId;

    const unreadCount = await commentRepository
        .createQueryBuilder("comment")
        .where("comment.complaint_id = :complaintId", { complaintId })
        .andWhere(
            "NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(comment.read_by, '[]'::jsonb)) AS entry WHERE entry->>'userId' = :userId)",
            { userId: userId.toString() }
        )
        .getCount();

    return unreadCount;
};
