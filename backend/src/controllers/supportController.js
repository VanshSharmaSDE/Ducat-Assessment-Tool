import { SupportService } from '../services/supportService.js';

export class SupportController {
  /**
   * Student: Create support query
   */
  static async createStudentQuery(req, res, next) {
    try {
      const query = await SupportService.createStudentQuery(req.user, req.body);
      return res.status(201).json({
        success: true,
        message: 'Support query submitted successfully',
        data: { query },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Student: Get their queries
   */
  static async getStudentQueries(req, res, next) {
    try {
      const { status, search } = req.query;
      const queries = await SupportService.getStudentQueries(req.user._id, { status, search });
      return res.status(200).json({
        success: true,
        data: { queries },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Student: Get single query
   */
  static async getStudentQueryById(req, res, next) {
    try {
      const query = await SupportService.getStudentQueryById(req.user._id, req.params.id);
      return res.status(200).json({
        success: true,
        data: { query },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Student: Reply to query
   */
  static async addStudentQueryReply(req, res, next) {
    try {
      const query = await SupportService.addStudentQueryReply(req.user, req.params.id, req.body.message);
      return res.status(200).json({
        success: true,
        message: 'Reply posted successfully',
        data: { query },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty: Create query to Admin
   */
  static async createFacultyQuery(req, res, next) {
    try {
      const query = await SupportService.createFacultyQuery(req.user, req.body);
      return res.status(201).json({
        success: true,
        message: 'Support query submitted to administration',
        data: { query },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty: Get own queries to Admin
   */
  static async getFacultyOwnQueries(req, res, next) {
    try {
      const { status, search } = req.query;
      const queries = await SupportService.getFacultyOwnQueries(req.user._id, { status, search });
      return res.status(200).json({
        success: true,
        data: { queries },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty: Get student queries assigned/accessible to this faculty
   */
  static async getFacultyStudentQueries(req, res, next) {
    try {
      const { status, search } = req.query;
      const queries = await SupportService.getFacultyStudentQueries(req.user._id, { status, search });
      return res.status(200).json({
        success: true,
        data: { queries },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty: Reply to student query or own query
   */
  static async addFacultyReply(req, res, next) {
    try {
      const query = await SupportService.addFacultyReply(req.user, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Response recorded successfully',
        data: { query },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get all queries (Student queries and/or Faculty queries)
   */
  static async getAdminQueries(req, res, next) {
    try {
      const { tab, status, priority, search } = req.query;
      const queries = await SupportService.getAdminQueries({ tab, status, priority, search });
      return res.status(200).json({
        success: true,
        data: { queries },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Reply to ANY query (Student or Faculty) and solve/change status
   */
  static async addAdminReply(req, res, next) {
    try {
      const query = await SupportService.addAdminReply(req.user, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Admin response recorded and status updated',
        data: { query },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Send support mail to developer
   */
  static async createDeveloperSupport(req, res, next) {
    try {
      const result = await SupportService.createDeveloperSupport(req.user, req.body);
      return res.status(201).json({
        success: true,
        message: result.emailSent
          ? `Support request successfully emailed to developer (${result.developerEmail})`
          : `Support ticket created (${result.record.ticketId}). SMTP dispatch pending or manual mailto fallback enabled.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get developer support history
   */
  static async getDeveloperSupportHistory(req, res, next) {
    try {
      const history = await SupportService.getDeveloperSupportHistory(req.user._id);
      return res.status(200).json({
        success: true,
        data: { history },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get live system diagnostics
   */
  static async getSystemDiagnostics(req, res, next) {
    try {
      const diagnostics = SupportService.getSystemDiagnostics();
      return res.status(200).json({
        success: true,
        data: { diagnostics },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get unread query / message count for currently authenticated user
   */
  static async getUnreadCount(req, res, next) {
    try {
      const data = await SupportService.getUnreadCount(req.user);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark a support query as read
   */
  static async markQueryAsRead(req, res, next) {
    try {
      await SupportService.markQueryAsRead(req.user._id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Query marked as read',
      });
    } catch (err) {
      next(err);
    }
  }
}
