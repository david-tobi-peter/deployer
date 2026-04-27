import { Service, Container } from "typedi";
import { execa } from "execa";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { Logger } from "@loggers/index.js";
import { DeploymentStatusEnum, type IDeploymentResponse, GET_BUILD_DIR, GET_LOG_FILE_DIR } from "@/shared/index.js";
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
    const buildDir = GET_BUILD_DIR(deployment.id);
    const logFileDir = GET_LOG_FILE_DIR(deployment.id);

    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(path.dirname(logFileDir), { recursive: true });

    const emitAndLog = (line: string) => {
      const cleanLine = line.replace(/\r?\n$/, "");
      fs.appendFileSync(logFileDir, cleanLine + "\n");
      deploymentLogEmitter.emit(`log:${deployment.id}`, cleanLine);
    };

    try {
      Logger.info(`Starting pipeline for deployment ${deployment.id}`);
      emitAndLog(`Starting pipeline for deployment ${deployment.id}`);
      await this.deploymentService.updateStatus(deployment.id, DeploymentStatusEnum.BUILDING);

      Logger.info(`Cloning ${deployment.gitUrl}...`);
      emitAndLog(`Cloning ${deployment.gitUrl}...`);
      await execa("git", ["clone", deployment.gitUrl, "."], { cwd: buildDir });

      Logger.info(`Checking out commit ${deployment.commitHash}`);
      emitAndLog(`Checking out commit ${deployment.commitHash}`);
      await execa("git", ["checkout", deployment.commitHash], { cwd: buildDir });

      const imageTag = `deployer-${deployment.commitHash.substring(0, 8)}`;

      Logger.info(`Building image with Railpack: ${imageTag}`);
      emitAndLog(`Building image with Railpack: ${imageTag}`);
      const buildProcess = execa(
        "railpack",
        [
          "build",
          ".",
          "--name",
          imageTag,
          "--env",
          "MISE_HTTP_TIMEOUT=300",
          "--env",
          "MISE_FETCH_REMOTE_VERSIONS_TIMEOUT=300",
          "--env",
          "MISE_CONNECT_TIMEOUT=300",
        ],
        {
          cwd: buildDir,
          extendEnv: true,
          env: {
            BUILDKIT_HOST: config.app.BUILDKIT_HOST,
          },
        }
      );

      buildProcess.stdout?.on("data", (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l);
        lines.forEach((line: string) => emitAndLog(line));
      });
      buildProcess.stderr?.on("data", (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l);
        lines.forEach((line: string) => emitAndLog(line));
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
          NetworkMode: "deployer-net",
          RestartPolicy: {
            Name: "on-failure",
            MaximumRetryCount: 3
          }
        }
      });

      await container.start();

      const liveUrl = `/d/deploy-${deployment.id}`;

      await this.deploymentService.updateDeployment(deployment.id, {
        status: DeploymentStatusEnum.RUNNING,
        imageTag: imageTag,
        containerId: container.id,
        port: port,
        liveUrl: liveUrl
      });
      Logger.info(`Deployment successfully completed for ${deployment.id}. Live at: ${liveUrl}`);

      const doneMsg = `__DONE__:${liveUrl}`;
      fs.appendFileSync(logFileDir, doneMsg + "\n");
      deploymentLogEmitter.emit(`log:${deployment.id}`, doneMsg);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.deploymentService.updateStatus(deployment.id, DeploymentStatusEnum.FAILED);

      const errMsg = `__ERROR__:${message}`;
      if (fs.existsSync(path.dirname(logFileDir))) {
        fs.appendFileSync(logFileDir, errMsg + "\n");
      }
      deploymentLogEmitter.emit(`log:${deployment.id}`, errMsg);

      throw new InternalServerError(message);
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
