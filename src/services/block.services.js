import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const blockRepository = AppDataSource.getRepository("Block");

export const createBlock = async (req, res) => {
    const {
        projectId,
        blockName,
        description,
        companyId,
    } = req.body;
  
    const block = blockRepository.create({
        projectId,
        blockName,
        description,
        companyId
      });
      await blockRepository.save(block);
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
    const block = await blockRepository.findOne({ where: { id: blockId } });
    const updatedBlock = block
      ? await blockRepository.save(Object.assign(block, updateData))
      : null;

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
  
    const blockData = await blockRepository.findOne({ where: { id: block } });
    if (!blockData) {
      throw new CustomError(
        statusCodes?.notFound,
        Message?.notFound ,
        errorCodes?.not_found
      );
    } 
  
    blockData.isDeleted = true;
    await blockRepository.save(blockData);
  
    return blockData
  };

  export const getBlock = async (req, res) => {
    const companyId = req.query.id;
  
    const block = await blockRepository.find({
      where: {
        companyId,
        isDeleted: false,
      },
      order: { createdAt: "DESC" },
      relations: ["project"],
    });
  
    if (!block) {
      throw new CustomError(
        statusCodes?.notFound,
        Message?.notFound ,
        errorCodes?.not_found
      );
    }
    return block;
  };