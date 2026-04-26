import type { Request, Response } from "express";
import { Service, Container } from "typedi";
import { DeploymentService } from "@/services/deployment.service.js";
import { PipelineService } from "@/services/pipeline.service.js";
import { ErrorHandler, BadRequestError } from "@errors/index.js";
import { Logger } from "@loggers/index.js";

@Service()
export class DeploymentController {
  private deploymentService: DeploymentService;
  private pipelineService: PipelineService;

  constructor() {
    this.deploymentService = Container.get(DeploymentService);
    this.pipelineService = Container.get(PipelineService);
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
  }

  async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.deploymentService.getAllDeployments(page, limit);

      res.status(200).json(result);
    } catch (error) {
      ErrorHandler.handleError(error, res);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      const deployment = await this.deploymentService.getDeploymentById(id);

      res.status(200).json({ data: deployment });
    } catch (error) {
      ErrorHandler.handleError(error, res);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { gitUrl, commitHash } = req.body;

      if (!gitUrl) {
        throw new BadRequestError("gitUrl must be provided");
      }

      Logger.info(`Deployment requested for repository: ${gitUrl}`);

      try {
        new URL(gitUrl);
      } catch (err) {
        throw new BadRequestError("Invalid URL format");
      }

      const deployment = await this.deploymentService.createDeployment(gitUrl, commitHash);

      // runs as background task
      this.pipelineService.run(deployment);

      res.status(201).json({ data: deployment });
    } catch (error) {
      ErrorHandler.handleError(error, res);
    }
  }
}



