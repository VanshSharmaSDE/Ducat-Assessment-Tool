import { Router } from 'express';
import { VpsController } from '../controllers/vpsController.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import {
  containerIdParamSchema,
  applicationIdParamSchema,
  logsQuerySchema,
  activityQuerySchema,
} from '../validators/vpsValidator.js';

const router = Router();

// Validate middleware for route parameters
function validateParams(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    req.params = parsed.data;
    next();
  };
}

// Validate middleware for query parameters
function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    req.query = parsed.data;
    next();
  };
}

// Strict authentication & Super Admin role requirement
router.use(authenticateUser, requireAdmin);

// 1. Overview & Metrics
router.get('/overview', VpsController.getOverview);
router.get('/metrics', VpsController.getMetrics);

// 2. Docker Containers
router.get('/containers', VpsController.getContainers);
router.get('/containers/:id', validateParams(containerIdParamSchema), VpsController.getContainerDetails);
router.get('/containers/:id/logs', validateParams(containerIdParamSchema), VpsController.getContainerLogs);
router.post('/containers/:id/start', validateParams(containerIdParamSchema), VpsController.startContainer);
router.post('/containers/:id/stop', validateParams(containerIdParamSchema), VpsController.stopContainer);
router.post('/containers/:id/restart', validateParams(containerIdParamSchema), VpsController.restartContainer);

// 3. PM2 & Node Applications
router.get('/applications', VpsController.getApplications);
router.get('/applications/:id/logs', validateParams(applicationIdParamSchema), VpsController.getApplicationLogs);
router.post('/applications/:id/restart', validateParams(applicationIdParamSchema), VpsController.restartApplication);
router.post('/applications/:id/reload', validateParams(applicationIdParamSchema), VpsController.reloadApplication);

// 4. System Services Diagnostics
router.get('/services', VpsController.getServices);

// 5. Unified System Logs
router.get('/logs', validateQuery(logsQuerySchema), VpsController.getLogs);

// 6. Security & Audit Activity
router.get('/activity', validateQuery(activityQuerySchema), VpsController.getActivity);

export default router;
