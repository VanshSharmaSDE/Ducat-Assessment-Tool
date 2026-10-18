import { Router } from 'express';
import { SupportController } from '../controllers/supportController.js';
import { authenticateUser, requireAdmin, requireAdminOrFaculty } from '../middleware/auth.js';

const router = Router();

// Protect all support routes with authentication
router.use(authenticateUser);

// Global Unread & Read Status
router.get('/unread-count', SupportController.getUnreadCount);
router.post('/mark-read/:id', SupportController.markQueryAsRead);

/**
 * -------------------------------------------------------------
 * STUDENT ROUTES
 * -------------------------------------------------------------
 */
router.post('/student/query', SupportController.createStudentQuery);
router.get('/student/queries', SupportController.getStudentQueries);
router.get('/student/queries/:id', SupportController.getStudentQueryById);
router.post('/student/queries/:id/reply', SupportController.addStudentQueryReply);

/**
 * -------------------------------------------------------------
 * FACULTY ROUTES
 * -------------------------------------------------------------
 */
router.post('/faculty/query', requireAdminOrFaculty, SupportController.createFacultyQuery);
router.get('/faculty/my-queries', requireAdminOrFaculty, SupportController.getFacultyOwnQueries);
router.get('/faculty/student-queries', requireAdminOrFaculty, SupportController.getFacultyStudentQueries);
router.post('/faculty/queries/:id/reply', requireAdminOrFaculty, SupportController.addFacultyReply);

/**
 * -------------------------------------------------------------
 * ADMIN ROUTES
 * -------------------------------------------------------------
 */
router.get('/admin/queries', requireAdmin, SupportController.getAdminQueries);
router.post('/admin/queries/:id/reply', requireAdmin, SupportController.addAdminReply);

// Admin Support -> Developer Mail & Diagnostics
router.get('/admin/developer-support/diagnostics', requireAdmin, SupportController.getSystemDiagnostics);
router.post('/admin/developer-support', requireAdmin, SupportController.createDeveloperSupport);
router.get('/admin/developer-support/history', requireAdmin, SupportController.getDeveloperSupportHistory);

export default router;
