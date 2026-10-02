import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const projectRepository = AppDataSource.getRepository("project");


export const createProject = async (req, res) => {

    const {
      projectName,
      projectDetails,
      companyId
    } = req.body;

    const project = projectRepository.create({
      projectName,
      projectDetails,
      companyId
    });
    await projectRepository.save(project);

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
    const project = await projectRepository.findOne({ where: { id: projectId } });
    const updatedProject = project
      ? await projectRepository.save(Object.assign(project, updateData))
      : null;

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

  const projectData = await projectRepository.findOne({ where: { id: project } });
  if (!projectData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  } 

  projectData.isDeleted = true;
  await projectRepository.save(projectData);

  return projectData
};

export const getProject = async (req, res) => {
  const companyId = req.query.id;

  const project = await projectRepository.find({
    where: {
      companyId,
      isDeleted: false,
    },
    order: { createdAt: "DESC" },
  });

  if (!project) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  return project;
};
