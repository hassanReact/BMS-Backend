import * as project from '../services/project.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createProject = async(req, res, next) => {
  const Project = await project.createProject(req, res, next);
  res.status(statusCodes?.created).send(Project);
};

export const editProject = async(req, res, next) => {
  const Project = await project.editProject(req, res, next);
  res.status(statusCodes?.created).send(Project);
};

export const getProject = async(req, res, next) => {
  const Project = await project.getProject(req, res, next);
  res.status(statusCodes?.created).send(Project);
};

export const deleteProject = async(req, res, next) => {
  const Project = await project.deleteProject(req, res, next);
  res.status(statusCodes?.created).send(Project);
};