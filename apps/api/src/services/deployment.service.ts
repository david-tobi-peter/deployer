import { AppDataSource } from "@/db/data-source.js";
import { Deployment } from "@/db/entities/index.js";
import { ResourceNotFoundError } from "@errors/index.js";
import { DeploymentStatusEnum } from "@/shared/index.js";
import type { IDeploymentResponse } from "@/shared/index.js";
import { Service } from "typedi";
import { Logger, als } from "@loggers/index.js";

@Service()
export class DeploymentService {
  private get repo() {
    return AppDataSource.getRepository(Deployment);
  }

  /**
   * @private
   * @param {Deployment} deployment
   * @returns {IDeploymentResponse}
   */
  private map(deployment: Deployment): IDeploymentResponse {
    return {
      id: deployment.id,
      gitUrl: deployment.gitUrl,
      status: deployment.status as DeploymentStatusEnum,
      containerId: deployment.containerId,
      imageTag: deployment.imageTag,
      log: deployment.log,
    };
  }

  /**
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{ data: IDeploymentResponse[], total: number }>}
   */
  async getAllDeployments(page: number, limit: number): Promise<{ data: IDeploymentResponse[], total: number }> {
    Logger.info(`Executing DB query: findAndCount matching deployments...`);
    const [deployments, total] = await this.repo.findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    Logger.info(`DB query successful: ${deployments.length} deployments retrieved. Total: ${total}`);

    return { data: deployments.map((d) => this.map(d)), total };
  }

  /**
   * @param {string} id
   * @returns {Promise<IDeploymentResponse>}
   */
  async getDeploymentById(id: string): Promise<IDeploymentResponse> {
    Logger.info(`Executing DB query: findOne deployment with log relation...`);
    const deployment = await this.repo.findOne({
      where: { id },
      relations: { log: true },
    });

    if (!deployment) {
      Logger.warn(`Deployment not found in DB with ID ${id}`);
      throw new ResourceNotFoundError(`Deployment with ID ${id} not found`);
    }

    Logger.info(`DB query successful: deployment fetched.`);
    return this.map(deployment);
  }

  /**
   * @param {string} gitUrl
   * @returns {Promise<IDeploymentResponse>}
   */
  async createDeployment(gitUrl: string): Promise<IDeploymentResponse> {
    Logger.info(`Creating a new deployment record in the database for ${gitUrl}...`);
    const deployment = this.repo.create({
      gitUrl,
      status: DeploymentStatusEnum.PENDING,
    });

    const saved = await this.repo.save(deployment);
    Logger.info(`Commit successful. Deployment stored with ID: ${saved.id}`);

    const store = als.getStore();
    if (store && saved.id) {
      store.deploymentId = saved.id;
      Logger.info(`Successfully injected deployment metadata [DEPLOY:${saved.id}] natively into the active trace hook!`);
    }

    return this.map(saved);
  }
}
