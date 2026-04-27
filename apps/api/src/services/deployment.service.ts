import { AppDataSource } from "@/db/data-source.js";
import { Deployment } from "@/db/entities/index.js";
import { ResourceNotFoundError, BadRequestError } from "@errors/index.js";
import { DeploymentStatusEnum } from "@/shared/index.js";
import type { IDeploymentResponse } from "@/shared/index.js";
import { Service } from "typedi";
import { execa } from "execa";
import { Logger, als } from "@loggers/index.js";
import { EventEmitter } from "events";
import Docker from "dockerode";
import fs from "fs";
import { GET_LOG_FILE_DIR } from "@/shared/index.js";

export const globalDeploymentEmitter = new EventEmitter();

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
      commitHash: deployment.commitHash,
      port: deployment.port,
      liveUrl: deployment.liveUrl,
    };
  }

  /**
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{ data: IDeploymentResponse[], total: number }>}
   */
  async getAllDeployments(page: number, limit: number): Promise<{ data: IDeploymentResponse[], total: number }> {
    Logger.info(`Fetching deployments | Page: ${page}, Limit: ${limit}`);

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
    Logger.info(`Fetching deployment by ID: ${id}`);

    const deployment = await this.repo.findOne({
      where: { id },
      relations: { log: true },
    });

    if (!deployment) {
      throw new ResourceNotFoundError(`Deployment with ID ${id} not found`);
    }

    Logger.info(`DB query successful: deployment fetched.`);
    return this.map(deployment);
  }

  /**
   * @param {string} gitUrl
   * @param {string} [commitHash]
   * @returns {Promise<IDeploymentResponse>}
   */
  async createDeployment(gitUrl: string, commitHash?: string): Promise<IDeploymentResponse> {
    const resolvedHash = await this.resolveCommitHash(gitUrl, commitHash);

    const existing = await this.repo.findOne({
      where: { gitUrl, commitHash: resolvedHash },
      order: { createdAt: "DESC" }
    });

    if (existing) {
      if (existing.status === DeploymentStatusEnum.BUILDING || existing.status === DeploymentStatusEnum.DEPLOYING) {
        throw new BadRequestError("Container is already in pipeline");
      }
      if (existing.status === DeploymentStatusEnum.RUNNING) {
        throw new BadRequestError("Container has already been built");
      }
    }

    Logger.info(`Creating a new deployment record in the database for ${gitUrl} at ${resolvedHash}...`);

    const deployment = this.repo.create({
      gitUrl,
      commitHash: resolvedHash,
      status: DeploymentStatusEnum.PENDING,
    });

    const saved = await this.repo.save(deployment);

    Logger.info(`Commit successful. Deployment stored with ID: ${saved.id}`);

    const store = als.getStore();
    if (store) {
      store.deploymentId = saved.id;
    }

    return this.map(saved);
  }

  /**
   * @private
   * @param {string} gitUrl
   * @param {string} [commitHash]
   * @returns {Promise<string>}
   */
  private async resolveCommitHash(gitUrl: string, commitHash?: string): Promise<string> {
    const target = commitHash || "HEAD";

    try {
      Logger.info(`Resolving commit hash for ${gitUrl} at ${target}...`);
      const { stdout } = await execa("git", ["ls-remote", gitUrl, target]);
      const resolved = stdout.split(/\s+/)[0];

      if (!resolved) {
        if (commitHash && /^[0-9a-f]{7,40}$/i.test(commitHash)) {
          Logger.warn(
            `Commit ${commitHash} not found in remote refs (may be a historical SHA not at any branch tip). Proceeding with provided hash.`
          );
          return commitHash;
        }

        if (commitHash) {
          throw new BadRequestError(`Commit or Ref "${commitHash}" not found on remote ${gitUrl}`);
        }
        throw new BadRequestError(`Could not resolve HEAD for ${gitUrl} — repo may be empty`);
      }

      Logger.info(`Resolved hash: ${resolved}`);
      return resolved;
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      const message = err instanceof Error ? err.message : String(err);

      throw new BadRequestError(`Failed to resolve commit hash for ${gitUrl}: ${message}`);
    }
  }

  /**
   * @param {string} id
   * @param {DeploymentStatusEnum} status
   * @returns {Promise<void>}
   */
  async updateStatus(id: string, status: DeploymentStatusEnum): Promise<void> {
    await this.repo.update(id, { status });
    Logger.info(`Status updated to ${status}`);
    globalDeploymentEmitter.emit("update", id);
  }

  /**
   * @param {string} id
   * @param {Partial<Deployment>} data
   * @returns {Promise<void>}
   */
  async updateDeployment(id: string, data: Partial<Deployment>): Promise<void> {
    await this.repo.update(id, data);
    Logger.info(`Deployment ${id} record updated`);
    globalDeploymentEmitter.emit("update", id);
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteDeployment(id: string): Promise<void> {
    const deployment = await this.repo.findOne({ where: { id } });

    if (!deployment) {
      throw new ResourceNotFoundError(`Deployment: ${id} not found`);
    }

    if (deployment.status === DeploymentStatusEnum.BUILDING || deployment.status === DeploymentStatusEnum.DEPLOYING) {
      throw new BadRequestError("Cannot delete a deployment while it is building or deploying.");
    }

    Logger.info(`Tearing down deployment: ${id}`);

    const docker = new Docker();

    const cleanupTasks: Promise<void>[] = [];

    if (deployment.containerId) {
      cleanupTasks.push(
        (async () => {
          const container = docker.getContainer(`deploy-${deployment.id}`);
          await container.stop().catch(() => { });
          await container.remove({ force: true }).catch(() => { });

          Logger.info(`Container deploy-${deployment.id} removed`);
        })()
      );
    }

    if (deployment.imageTag) {
      cleanupTasks.push(
        (async () => {
          await docker.getImage(deployment.imageTag!).remove({ force: true }).catch(() => { });

          Logger.info(`Image ${deployment.imageTag} removed`);
        })()
      );
    }

    const logFileDir = GET_LOG_FILE_DIR(id);
    if (fs.existsSync(logFileDir)) {
      cleanupTasks.push(
        fs.promises.unlink(logFileDir).then(() => {
          Logger.info(`Log file ${logFileDir} removed`);
        }).catch((err) => {
          Logger.warn(`Failed to remove log file ${logFileDir}: ${err}`);
        })
      );
    }

    const results = await Promise.allSettled(cleanupTasks);

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        Logger.warn(`Cleanup task ${i} failed: ${r.reason}`);
      }
    });

    await this.repo.delete(id);
    Logger.info(`Deployment ${id} completely removed from system`);
    globalDeploymentEmitter.emit("update", id);
  }

  /**
   * @param {string} id
   * @returns {Promise<IDeploymentResponse>}
   */
  async restartDeployment(id: string): Promise<IDeploymentResponse> {
    const deployment = await this.repo.findOne({ where: { id } });

    if (!deployment) {
      throw new ResourceNotFoundError("Deployment not found");
    }

    if (deployment.status === DeploymentStatusEnum.BUILDING || deployment.status === DeploymentStatusEnum.DEPLOYING) {
      throw new BadRequestError(`Deployment: ${id} is already in progress`);
    }

    if (deployment.status === DeploymentStatusEnum.RUNNING && deployment.containerId) {
      Logger.info(`Restarting container deploy-${deployment.id}...`);

      const docker = new Docker();
      const container = docker.getContainer(`deploy-${deployment.id}`);
      await container.restart().catch((err) => {
        Logger.error(`Failed to restart container deploy-${deployment.id}: ${err}`);
        throw new BadRequestError(`Docker failed to restart container`);
      });

      Logger.info(`Container deploy-${deployment.id} restarted successfully`);

      return this.map(deployment);
    }

    if (deployment.status === DeploymentStatusEnum.FAILED || deployment.status === DeploymentStatusEnum.PENDING) {
      Logger.info(`Resetting deployment ${id} to PENDING for pipeline trigger...`);

      const logFileDir = GET_LOG_FILE_DIR(id);
      if (fs.existsSync(logFileDir)) {
        fs.unlinkSync(logFileDir);
      }

      const newDeployment = await this.repo.save({ ...deployment, status: DeploymentStatusEnum.PENDING });
      globalDeploymentEmitter.emit("update", id);

      return this.map(newDeployment);
    }

    return this.map(deployment);
  }
}
