import type { Request, Response } from "express";
import { Service, Container } from "typedi";
import { DeploymentService } from "@/services/deployment.service.js";
import { PipelineService, deploymentLogEmitter } from "@/services/pipeline.service.js";
import { ErrorHandler, BadRequestError } from "@errors/index.js";
import { Logger } from "@loggers/index.js";
import { globalDeploymentEmitter } from "@/services/deployment.service.js";
import fs from "fs";
import { GET_LOG_FILE_DIR } from "@/shared/index.js";

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
    this.streamLogs = this.streamLogs.bind(this);
    this.streamDeployments = this.streamDeployments.bind(this);
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
      let { gitUrl, commitHash } = req.body;

      if (!gitUrl) {
        throw new BadRequestError("gitUrl must be provided");
      }

      gitUrl = gitUrl.replace(/\/+$/, "");

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

  async streamDeployments(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const onUpdate = (id: string) => {
      res.write(`data: ${id}\n\n`);
    };

    globalDeploymentEmitter.on("update", onUpdate);

    req.on("close", () => {
      globalDeploymentEmitter.off("update", onUpdate);
    });
  }

  async streamLogs(req: Request, res: Response) {
    const id = req.params.id as string;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let isDone = false;

    const onLog = (line: string) => {
      if (isDone) return;

      if (line.startsWith("__DONE__:")) {
        const liveUrl = line.split("__DONE__:")[1];
        res.write(`data: Deployment complete! Your app is available at: ${liveUrl}\n\n`);
        res.write(`event: done\ndata: ${liveUrl}\n\n`);
        res.end();
        isDone = true;
        deploymentLogEmitter.off(`log:${id}`, onLog);
        return;
      }

      if (line.startsWith("__ERROR__:")) {
        const message = line.split("__ERROR__:")[1];
        res.write(`event: error\ndata: ${message}\n\n`);
        res.end();
        isDone = true;
        deploymentLogEmitter.off(`log:${id}`, onLog);
        return;
      }

      res.write(`data: ${line}\n\n`);
    };

    // Replay existing logs to backfill the stream
    const logFileDir = GET_LOG_FILE_DIR(id);
    if (fs.existsSync(logFileDir)) {
      const logs = fs.readFileSync(logFileDir, "utf-8");
      const lines = logs.split("\n").filter(Boolean);
      for (const line of lines) {
        onLog(line);
      }
    }

    if (!isDone) {
      deploymentLogEmitter.on(`log:${id}`, onLog);

      req.on("close", () => {
        deploymentLogEmitter.off(`log:${id}`, onLog);
      });
    }
  }
}



