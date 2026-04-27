import { Router } from "express";
import { Container } from "typedi";
import { DeploymentController } from "@/controllers/deployment.controller.js";

const router = Router();
const controller = Container.get(DeploymentController);

router.get("/", controller.getAll);
router.get("/stream", controller.streamDeployments);
router.get("/:id", controller.getById);
router.get("/:id/logs", controller.streamLogs);
router.post("/", controller.create);
router.delete("/:id", controller.delete);
router.post("/:id/restart", controller.restart);

export default router;
