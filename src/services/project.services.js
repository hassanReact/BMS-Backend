import  Project  from "../models/project.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";


export const createProject = async (req, res) => {

    const {
      projectName,
      projectDetails,
      companyId
    } = req.body;

    const project = await Project.create({
      projectName,
      projectDetails,
      companyId
    });

    return project
};


export const editProject = async (req, res) => {
    const projectId = req.query.id;

    if (!projectId) {
      return res.status(400).json({
        message: "Project ID is required.",
        errorCode: "project_id_missing",
      });
    }

    const {
      projectName,
      projectDetails,
      companyId
    } = req.body;

    const updateData = {
      projectName,
      projectDetails,
      companyId
    };
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return res.status(404).json({
        message: "Project not found.",
        errorCode: "Project Error",
      });
    }

    return updatedProject;
  
};



export const deleteProject = async (req, res) => {
  const project = req.query.id;

  const projectData = await Project.findById(project);
  if (!projectData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  } 

  projectData.isDeleted = true;
  await projectData.save();

  return projectData
};

export const getProject = async (req, res) => {
  const companyId = req.query.id;

  const project = await Project.find({
    companyId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!project) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  return project;
};
