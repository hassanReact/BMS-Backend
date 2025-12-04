import Block from "../models/block.model.js"
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

export const createBlock = async (req, res) => {
    const {
        projectId,
        blockName,
        description,
        companyId,
    } = req.body;
  
    const block = await Block.create({
        projectId,
        blockName,
        description,
        companyId
      });
      //const project = await Type.findById(projectId).lean();
  
      return block;
  };


  export const editBlock = async (req, res) => {
    const blockId = req.query.id;

    if (!blockId) {
      return res.status(400).json({
        message: "Project ID is required.",
        errorCode: "project_id_missing",
      });
    }

    const {
      projectId,  
      blockName,
      description,
      companyId
    } = req.body;

    const updateData = {
      projectId,  
      blockName,
      description,
      companyId
    };
    const updatedBlock = await Block.findByIdAndUpdate(
      blockId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedBlock) {
      return res.status(404).json({
        message: "Project not found.",
        errorCode: "Project Error",
      });
    }

    return updatedBlock;
  
};

export const deleteBlock = async (req, res) => {
    const block = req.query.id;
  
    const blockData = await Block.findById(block);
    if (!blockData) {
      throw new CustomError(
        statusCodes?.notFound,
        Message?.notFound ,
        errorCodes?.not_found
      );
    } 
  
    blockData.isDeleted = true;
    await blockData.save();
  
    return blockData
  };

  export const getBlock = async (req, res) => {
    const companyId = req.query.id;
  
    const block = await Block.find({
      companyId,
      isDeleted: false,
    }).sort({ createdAt: -1 })
    .populate('projectId');
  
    if (!block) {
      throw new CustomError(
        statusCodes?.notFound,
        Message?.notFound ,
        errorCodes?.not_found
      );
    }
    return block;
  };