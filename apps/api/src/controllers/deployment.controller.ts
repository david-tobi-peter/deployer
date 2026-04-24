import type { Request, Response } from "express";
import { Service, Container } from "typedi";
import { DeploymentService } from "@/services/deployment.service.js";
import { ErrorHandler, BadRequestError } from "@errors/index.js";
import { execa } from "execa";
import { Logger } from "@loggers/index.js";

@Service()
export class DeploymentController {
  private deploymentService: DeploymentService;

  constructor() {
    this.deploymentService = Container.get(DeploymentService);
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
  }

  async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      Logger.info(`Fetching deployments | Page: ${page}, Limit: ${limit}`);
      const result = await this.deploymentService.getAllDeployments(page, limit);
      res.status(200).json(result);
    } catch (error) {
      ErrorHandler.handleError(error, res);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      Logger.info(`Fetching deployment by ID: ${id}`);
      const deployment = await this.deploymentService.getDeploymentById(id);

      res.status(200).json({ data: deployment });
    } catch (error) {
      ErrorHandler.handleError(error, res);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { gitUrl } = req.body;
      
      Logger.info(`Deployment requested for repository: ${gitUrl}`);

      if (!gitUrl) {
        throw new BadRequestError("gitUrl must be provided");
      }

      try {
        new URL(gitUrl);
      } catch (err) {
        throw new BadRequestError("Invalid URL format");
      }

      Logger.info(`Validating Git repository bounds and global access...`);
      try {
        await execa("git", ["ls-remote", gitUrl], { timeout: 5000 });
      } catch (err) {
        throw new BadRequestError("Repository is unreachable or not public");
      }

      const deployment = await this.deploymentService.createDeployment(gitUrl);
      Logger.info(`Validation successful. Deployment initiated securely in DB with ID: ${deployment.id}`);

      // TODO: Async invocation of the PipelineService

      res.status(201).json({ data: deployment });
    } catch (error) {
      ErrorHandler.handleError(error, res);
    }
  }
}



