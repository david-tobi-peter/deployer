import { Router } from "express";
import deploymentRoutes from "./deployment.route.js";

const router = Router();

router.use("/deployments", deploymentRoutes);

export default router;
