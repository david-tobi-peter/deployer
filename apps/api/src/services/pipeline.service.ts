import { Service, Container } from "typedi";
import { execa } from "execa";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { Logger } from "@loggers/index.js";
import { DeploymentStatusEnum, type IDeploymentResponse } from "@/shared/index.js";
import config from "@/config/index.js";
import { DeploymentService } from "./deployment.service.js";
import Docker from "dockerode";
import net, { type AddressInfo } from "net";
import { InternalServerError } from "@/errors/app.error.js";

export const deploymentLogEmitter = new EventEmitter();

@Service()
export class PipelineService {
  private deploymentService: DeploymentService;

  constructor() {
    this.deploymentService = Container.get(DeploymentService);
  }

  /**
   * @param {IDeploymentResponse} deployment
   */
  public async run(deployment: IDeploymentResponse) {
    const buildDir = path.join(config.app.STORAGE_DIR, "builds", deployment.id);

    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    try {
      Logger.info(`Starting pipeline for deployment ${deployment.id}`);
      await this.deploymentService.updateStatus(deployment.id, DeploymentStatusEnum.BUILDING);

      Logger.info(`Cloning ${deployment.gitUrl}...`);
      await execa("git", ["clone", deployment.gitUrl, "."], { cwd: buildDir });

      Logger.info(`Checking out commit ${deployment.commitHash}...`);
      await execa("git", ["checkout", deployment.commitHash], { cwd: buildDir });

      const imageTag = `deployer-${deployment.commitHash.substring(0, 8)}`;

      Logger.info(`Building image with Railpack: ${imageTag}`);
      const buildProcess = execa("railpack", ["build", ".", "--name", imageTag], {
        cwd: buildDir,
        extendEnv: true,
        env: {
          BUILDKIT_HOST: config.app.BUILDKIT_HOST
        }
      });

      buildProcess.stdout?.on("data", (data) => {
        const line = data.toString();
        deploymentLogEmitter.emit(`log:${deployment.id}`, line);
      });
      buildProcess.stderr?.on("data", (data) => {
        const line = data.toString();
        deploymentLogEmitter.emit(`log:${deployment.id}`, line);
      });

      await buildProcess;

      await this.deploymentService.updateStatus(deployment.id, DeploymentStatusEnum.DEPLOYING);
      Logger.info(`Deploying container for image: ${imageTag}`);

      const docker = new Docker();

      const port = await this.findFreePort(config.app.DEPLOYMENT_PORT_START);

      const container = await docker.createContainer({
        Image: imageTag,
        name: `deploy-${deployment.id}`,
        ExposedPorts: { "3000/tcp": {} },
        HostConfig: {
          PortBindings: { "3000/tcp": [{ HostPort: port.toString() }] },
          RestartPolicy: {
            Name: "on-failure",
            MaximumRetryCount: 3
          }
        }
      });

      await container.start();

      const liveUrl = `${config.app.APP_URL}:${port}`;

      await this.deploymentService.updateDeployment(deployment.id, {
        status: DeploymentStatusEnum.RUNNING,
        imageTag: imageTag,
        containerId: container.id,
        port: port,
        liveUrl: liveUrl
      });
      Logger.info(`Deployment successfully completed for ${deployment.id}. Live at: ${liveUrl}`);

      deploymentLogEmitter.emit(`log:${deployment.id}`, `__DONE__:${liveUrl}`);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.deploymentService.updateStatus(deployment.id, DeploymentStatusEnum.FAILED);

      deploymentLogEmitter.emit(`log:${deployment.id}`, `__ERROR__:${message}`);
      throw error;
    } finally {
      await fs.promises.rm(buildDir, { recursive: true, force: true });
    }
  }

  /**
   * @private
   * @param {number} startPort
   * @param {number} maxPort
   * @returns {Promise<number>}
   */
  private async findFreePort(startPort: number, maxPort: number = 65535): Promise<number> {
    if (startPort > maxPort) {
      throw new InternalServerError(`No free ports available between ${config.app.DEPLOYMENT_PORT_START} and ${maxPort}`);
    }

    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();

      server.on("error", () => {
        resolve(this.findFreePort(startPort + 1, maxPort));
      });

      server.listen(startPort, () => {
        const address = server.address() as AddressInfo;
        server.close(() => resolve(address.port));
      });
    });
  }
}
