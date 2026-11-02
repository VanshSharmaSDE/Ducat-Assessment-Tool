import { VpsService } from '../services/vpsService.js';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

export class VpsController {
  /**
   * Helper to write management action into AuditLog
   */
  static async logAudit({ req, action, resource, resourceId, details, status = 'SUCCESS' }) {
    try {
      await AuditLog.create({
        userId: req.user?._id || null,
        action,
        resource,
        resourceId: String(resourceId || ''),
        details: {
          ...details,
          status,
          adminEmail: req.user?.email || '',
          adminName: req.user?.name || '',
        },
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (err) {
      logger.error(`Failed to record VPS audit log: ${err.message}`, err);
    }
  }

  /**
   * GET /api/admin/vps/overview
   */
  static async getOverview(req, res, next) {
    try {
      const data = await VpsService.getOverview();
      res.status(200).json({
        success: true,
        message: 'VPS overview telemetry retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/vps/metrics
   */
  static async getMetrics(req, res, next) {
    try {
      const overview = await VpsService.getOverview();
      res.status(200).json({
        success: true,
        message: 'VPS metrics retrieved successfully',
        data: {
          server: overview.server,
          resources: overview.resources,
          timestamp: overview.timestamp,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/vps/containers
   */
  static async getContainers(req, res, next) {
    try {
      const result = await VpsService.listDockerContainers();
      res.status(200).json({
        success: true,
        message: 'Docker containers retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/vps/containers/:id
   */
  static async getContainerDetails(req, res, next) {
    try {
      const { id } = req.params;
      const details = await VpsService.getDockerContainerDetails(id);
      res.status(200).json({
        success: true,
        message: `Container ${id} details retrieved successfully`,
        data: details,
      });
    } catch (err) {
      res.status(404).json({
        success: false,
        message: err.message || `Container ${req.params.id} could not be inspected`,
      });
    }
  }

  /**
   * GET /api/admin/vps/containers/:id/logs
   */
  static async getContainerLogs(req, res, next) {
    try {
      const { id } = req.params;
      const lines = parseInt(req.query.lines, 10) || 100;
      const logs = await VpsService.getDockerContainerLogs(id, lines);
      res.status(200).json({
        success: true,
        message: `Logs for container ${id} retrieved successfully`,
        data: logs,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message || `Failed to retrieve logs for container ${req.params.id}`,
      });
    }
  }

  /**
   * POST /api/admin/vps/containers/:id/start
   */
  static async startContainer(req, res, next) {
    const { id } = req.params;
    try {
      const result = await VpsService.startDockerContainer(id);
      await VpsController.logAudit({
        req,
        action: 'VPS_CONTAINER_START',
        resource: 'DockerContainer',
        resourceId: id,
        details: { result: 'Container started successfully' },
        status: 'SUCCESS',
      });

      res.status(200).json({
        success: true,
        message: `Container ${id} started successfully`,
        data: result,
      });
    } catch (err) {
      await VpsController.logAudit({
        req,
        action: 'VPS_CONTAINER_START',
        resource: 'DockerContainer',
        resourceId: id,
        details: { error: err.message },
        status: 'FAILED',
      });

      res.status(500).json({
        success: false,
        message: err.message || `Failed to start container ${id}`,
      });
    }
  }

  /**
   * POST /api/admin/vps/containers/:id/stop
   */
  static async stopContainer(req, res, next) {
    const { id } = req.params;
    try {
      const result = await VpsService.stopDockerContainer(id);
      await VpsController.logAudit({
        req,
        action: 'VPS_CONTAINER_STOP',
        resource: 'DockerContainer',
        resourceId: id,
        details: { result: 'Container stopped successfully' },
        status: 'SUCCESS',
      });

      res.status(200).json({
        success: true,
        message: `Container ${id} stopped successfully`,
        data: result,
      });
    } catch (err) {
      await VpsController.logAudit({
        req,
        action: 'VPS_CONTAINER_STOP',
        resource: 'DockerContainer',
        resourceId: id,
        details: { error: err.message },
        status: 'FAILED',
      });

      res.status(500).json({
        success: false,
        message: err.message || `Failed to stop container ${id}`,
      });
    }
  }

  /**
   * POST /api/admin/vps/containers/:id/restart
   */
  static async restartContainer(req, res, next) {
    const { id } = req.params;
    try {
      const result = await VpsService.restartDockerContainer(id);
      await VpsController.logAudit({
        req,
        action: 'VPS_CONTAINER_RESTART',
        resource: 'DockerContainer',
        resourceId: id,
        details: { result: 'Container restarted successfully' },
        status: 'SUCCESS',
      });

      res.status(200).json({
        success: true,
        message: `Container ${id} restarted successfully`,
        data: result,
      });
    } catch (err) {
      await VpsController.logAudit({
        req,
        action: 'VPS_CONTAINER_RESTART',
        resource: 'DockerContainer',
        resourceId: id,
        details: { error: err.message },
        status: 'FAILED',
      });

      res.status(500).json({
        success: false,
        message: err.message || `Failed to restart container ${id}`,
      });
    }
  }

  /**
   * GET /api/admin/vps/applications
   */
  static async getApplications(req, res, next) {
    try {
      const result = await VpsService.listApplications();
      res.status(200).json({
        success: true,
        message: 'Managed applications retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/vps/applications/:id/logs
   */
  static async getApplicationLogs(req, res, next) {
    try {
      const { id } = req.params;
      const lines = parseInt(req.query.lines, 10) || 100;
      const logs = await VpsService.getApplicationLogs(id, lines);
      res.status(200).json({
        success: true,
        message: `Logs for application ${id} retrieved successfully`,
        data: logs,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message || `Failed to retrieve logs for application ${req.params.id}`,
      });
    }
  }

  /**
   * POST /api/admin/vps/applications/:id/restart
   */
  static async restartApplication(req, res, next) {
    const { id } = req.params;
    try {
      const result = await VpsService.restartApplication(id);
      await VpsController.logAudit({
        req,
        action: 'VPS_APP_RESTART',
        resource: 'NodeApplication',
        resourceId: id,
        details: { result: 'Application restarted successfully' },
        status: 'SUCCESS',
      });

      res.status(200).json({
        success: true,
        message: `Application ${id} restarted successfully`,
        data: result,
      });
    } catch (err) {
      await VpsController.logAudit({
        req,
        action: 'VPS_APP_RESTART',
        resource: 'NodeApplication',
        resourceId: id,
        details: { error: err.message },
        status: 'FAILED',
      });

      res.status(500).json({
        success: false,
        message: err.message || `Failed to restart application ${id}`,
      });
    }
  }

  /**
   * POST /api/admin/vps/applications/:id/reload
   */
  static async reloadApplication(req, res, next) {
    const { id } = req.params;
    try {
      const result = await VpsService.reloadApplication(id);
      await VpsController.logAudit({
        req,
        action: 'VPS_APP_RELOAD',
        resource: 'NodeApplication',
        resourceId: id,
        details: { result: 'Application reloaded successfully' },
        status: 'SUCCESS',
      });

      res.status(200).json({
        success: true,
        message: `Application ${id} reloaded successfully`,
        data: result,
      });
    } catch (err) {
      await VpsController.logAudit({
        req,
        action: 'VPS_APP_RELOAD',
        resource: 'NodeApplication',
        resourceId: id,
        details: { error: err.message },
        status: 'FAILED',
      });

      res.status(500).json({
        success: false,
        message: err.message || `Failed to reload application ${id}`,
      });
    }
  }

  /**
   * GET /api/admin/vps/services
   */
  static async getServices(req, res, next) {
    try {
      const services = await VpsService.getMonitoredServices();
      res.status(200).json({
        success: true,
        message: 'System services health retrieved successfully',
        data: {
          services,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/vps/logs
   */
  static async getLogs(req, res, next) {
    try {
      const lines = parseInt(req.query.lines, 10) || 100;
      const source = req.query.source || 'all';
      const severity = req.query.severity || 'all';
      const search = req.query.search || '';

      const data = await VpsService.getUnifiedLogs({
        lines,
        source,
        severity,
        search,
      });

      res.status(200).json({
        success: true,
        message: 'System logs retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/vps/activity
   */
  static async getActivity(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip = (page - 1) * limit;

      const filter = {
        action: { $regex: /^VPS_/ },
      };

      if (req.query.status && ['SUCCESS', 'FAILED'].includes(req.query.status.toUpperCase())) {
        filter['details.status'] = req.query.status.toUpperCase();
      }

      if (req.query.action) {
        filter.action = req.query.action;
      }

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'name email role')
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        message: 'VPS activity audit log retrieved successfully',
        data: {
          activity: logs.map((log) => ({
            id: log._id,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            status: log.details?.status || 'SUCCESS',
            user: log.userId
              ? {
                  name: log.userId.name,
                  email: log.userId.email,
                  role: log.userId.role,
                }
              : {
                  name: log.details?.adminName || 'System',
                  email: log.details?.adminEmail || '',
                  role: 'ADMIN',
                },
            details: log.details || {},
            ip: log.ip,
            userAgent: log.userAgent,
            timestamp: log.createdAt,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
