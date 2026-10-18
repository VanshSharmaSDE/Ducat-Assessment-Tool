import os from 'os';
import { SupportQuery } from '../models/SupportQuery.js';
import { DeveloperSupport } from '../models/DeveloperSupport.js';
import { User } from '../models/User.js';
import { sendDeveloperSupportEmail } from '../utils/mailService.js';
import { ApiError } from '../utils/ApiError.js';
import { emitToQuery, emitToUser, emitToAdmin, emitToFaculty } from '../socket.js';

/**
 * Generate a unique, readable ticket ID
 */
function generateTicketId(prefix = 'TKT') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${random}`;
}

export class SupportService {
  /**
   * 1. Student creates a support query
   * Flow: Routed to the faculty or admin who created, uploaded, or imported that student.
   */
  static async createStudentQuery(studentUser, { subject, category, priority, message }) {
    if (!subject || !subject.trim()) {
      throw new ApiError(400, 'Query subject is required');
    }
    if (!message || !message.trim()) {
      throw new ApiError(400, 'Initial query message is required');
    }

    const student = await User.findById(studentUser._id);
    if (!student) {
      throw new ApiError(404, 'Student account not found');
    }

    // Identify creator / importer / assigned faculty
    const accessibleSet = new Set();
    accessibleSet.add(student._id.toString());

    if (student.createdBy) {
      accessibleSet.add(student.createdBy.toString());
    }

    if (Array.isArray(student.importedBy)) {
      student.importedBy.forEach((ib) => {
        if (ib?.user) accessibleSet.add(ib.user.toString());
      });
    }

    if (Array.isArray(student.assignedFaculties)) {
      student.assignedFaculties.forEach((fId) => {
        if (fId) accessibleSet.add(fId.toString());
      });
    }

    // Determine primary assignee
    let assignedTo = null;
    if (student.createdBy) {
      assignedTo = student.createdBy;
    } else if (student.importedBy && student.importedBy.length > 0 && student.importedBy[0].user) {
      assignedTo = student.importedBy[0].user;
    } else if (student.assignedFaculties && student.assignedFaculties.length > 0) {
      assignedTo = student.assignedFaculties[0];
    } else {
      // Fallback: Assign to an active Admin
      const fallbackAdmin = await User.findOne({ role: 'ADMIN', isActive: true });
      if (fallbackAdmin) {
        assignedTo = fallbackAdmin._id;
        accessibleSet.add(fallbackAdmin._id.toString());
      }
    }

    const ticketId = generateTicketId('STU');

    const query = await SupportQuery.create({
      ticketId,
      type: 'STUDENT_QUERY',
      student: student._id,
      createdBy: student._id,
      assignedTo,
      accessibleBy: Array.from(accessibleSet),
      subject: subject.trim(),
      category: category ? category.trim() : 'GENERAL_INQUIRY',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      messages: [
        {
          sender: student._id,
          senderRole: 'USER',
          senderName: student.name || 'Student',
          message: message.trim(),
          createdAt: new Date(),
        },
      ],
    });

    const populated = await query.populate([
      { path: 'student', select: 'name studentId rollNumber email phone batch technology organization' },
      { path: 'assignedTo', select: 'name email role organization' },
    ]);

    // Real-time broadcast to Admin & Assigned Faculty
    const notif = {
      type: 'NEW_QUERY',
      queryId: populated._id,
      ticketId: populated.ticketId,
      subject: populated.subject,
      preview: populated.messages[0]?.message || '',
      senderName: student.name || 'Student',
      senderRole: 'USER',
      timestamp: new Date(),
    };

    emitToAdmin('support:query_created', populated);
    emitToAdmin('support:notification', notif);

    if (populated.assignedTo && populated.assignedTo._id) {
      emitToUser(populated.assignedTo._id.toString(), 'support:query_created', populated);
      emitToUser(populated.assignedTo._id.toString(), 'support:notification', notif);
    }

    return populated;
  }

  /**
   * Get all queries raised by a specific student
   */
  static async getStudentQueries(studentId, { status, search } = {}) {
    const filter = {
      type: 'STUDENT_QUERY',
      student: studentId,
    };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const escaped = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.$or = [
        { ticketId: { $regex: escaped, $options: 'i' } },
        { subject: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    return SupportQuery.find(filter)
      .populate('assignedTo', 'name email role organization')
      .sort({ updatedAt: -1 });
  }

  /**
   * Get single query details for student
   */
  static async getStudentQueryById(studentId, queryId) {
    const query = await SupportQuery.findOne({
      _id: queryId,
      student: studentId,
    }).populate([
      { path: 'student', select: 'name studentId rollNumber email batch organization' },
      { path: 'assignedTo', select: 'name email role organization' },
      { path: 'resolvedBy', select: 'name email role' },
    ]);

    if (!query) {
      throw new ApiError(404, 'Support ticket not found or access denied');
    }

    return query;
  }

  /**
   * Student replies to their own query
   */
  static async addStudentQueryReply(studentUser, queryId, message) {
    if (!message || !message.trim()) {
      throw new ApiError(400, 'Reply message cannot be empty');
    }

    const query = await SupportQuery.findOne({
      _id: queryId,
      student: studentUser._id,
    });

    if (!query) {
      throw new ApiError(404, 'Support ticket not found');
    }

    query.messages.push({
      sender: studentUser._id,
      senderRole: 'USER',
      senderName: studentUser.name || 'Student',
      message: message.trim(),
      createdAt: new Date(),
    });

    // If query was closed/resolved, student replying can reopen to IN_PROGRESS
    if (query.status === 'RESOLVED' || query.status === 'CLOSED') {
      query.status = 'IN_PROGRESS';
    }

    query.set(`lastReadBy.${studentUser._id.toString()}`, new Date());
    await query.save();

    const populated = await query.populate([
      { path: 'student', select: 'name studentId rollNumber email batch organization' },
      { path: 'assignedTo', select: 'name email role organization' },
    ]);

    const latestMessage = populated.messages[populated.messages.length - 1];

    // Real-time broadcast into the chat room
    emitToQuery(populated._id.toString(), 'support:message_received', {
      queryId: populated._id,
      message: latestMessage,
      query: populated,
      status: populated.status,
    });

    // Real-time notification for admin & assigned faculty
    const notif = {
      type: 'NEW_MESSAGE',
      queryId: populated._id,
      ticketId: populated.ticketId,
      subject: populated.subject,
      preview: message.trim(),
      senderName: studentUser.name || 'Student',
      senderRole: 'USER',
      timestamp: new Date(),
    };

    emitToAdmin('support:notification', notif);
    emitToAdmin('support:query_updated', populated);

    if (populated.assignedTo && populated.assignedTo._id) {
      emitToUser(populated.assignedTo._id.toString(), 'support:notification', notif);
      emitToUser(populated.assignedTo._id.toString(), 'support:query_updated', populated);
    }

    return populated;
  }

  /**
   * 2. Faculty creates a query to Admin
   */
  static async createFacultyQuery(facultyUser, { subject, category, priority, message }) {
    if (!subject || !subject.trim()) {
      throw new ApiError(400, 'Subject is required');
    }
    if (!message || !message.trim()) {
      throw new ApiError(400, 'Query message is required');
    }

    const ticketId = generateTicketId('FAC');

    const query = await SupportQuery.create({
      ticketId,
      type: 'FACULTY_QUERY',
      faculty: facultyUser._id,
      createdBy: facultyUser._id,
      accessibleBy: [facultyUser._id],
      subject: subject.trim(),
      category: category ? category.trim() : 'TECHNICAL_SUPPORT',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      messages: [
        {
          sender: facultyUser._id,
          senderRole: 'FACULTY',
          senderName: facultyUser.name || 'Faculty Member',
          message: message.trim(),
          createdAt: new Date(),
        },
      ],
    });

    const populated = await query.populate([
      { path: 'faculty', select: 'name facultyId email phone organization' },
    ]);

    const notif = {
      type: 'NEW_QUERY',
      queryId: populated._id,
      ticketId: populated.ticketId,
      subject: populated.subject,
      preview: populated.messages[0]?.message || '',
      senderName: facultyUser.name || 'Faculty Member',
      senderRole: 'FACULTY',
      timestamp: new Date(),
    };

    emitToAdmin('support:query_created', populated);
    emitToAdmin('support:notification', notif);

    return populated;
  }

  /**
   * Faculty gets queries they submitted to Admin
   */
  static async getFacultyOwnQueries(facultyId, { status, search } = {}) {
    const filter = {
      type: 'FACULTY_QUERY',
      faculty: facultyId,
    };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const escaped = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.$or = [
        { ticketId: { $regex: escaped, $options: 'i' } },
        { subject: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    return SupportQuery.find(filter)
      .populate('resolvedBy', 'name email role')
      .sort({ updatedAt: -1 });
  }

  /**
   * Faculty gets student queries from students they created, uploaded, or imported
   */
  static async getFacultyStudentQueries(facultyId, { status, search } = {}) {
    // Find all student queries where this faculty is in accessibleBy or assignedTo
    const filter = {
      type: 'STUDENT_QUERY',
      $or: [
        { accessibleBy: facultyId },
        { assignedTo: facultyId },
      ],
    };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const escaped = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.$and = [
        {
          $or: [
            { ticketId: { $regex: escaped, $options: 'i' } },
            { subject: { $regex: escaped, $options: 'i' } },
            { category: { $regex: escaped, $options: 'i' } },
          ],
        },
      ];
    }

    return SupportQuery.find(filter)
      .populate('student', 'name studentId rollNumber email phone batch technology organization')
      .populate('assignedTo', 'name email role')
      .populate('resolvedBy', 'name email role')
      .sort({ updatedAt: -1 });
  }

  /**
   * Faculty replies to either a student query assigned to them, or to their own query with Admin
   */
  static async addFacultyReply(facultyUser, queryId, { message, status, resolutionNotes }) {
    if (!message || !message.trim()) {
      throw new ApiError(400, 'Reply message cannot be empty');
    }

    const query = await SupportQuery.findById(queryId);
    if (!query) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Permission check: Either faculty's own query to admin OR a student query they are authorized for
    const isOwnQuery = query.type === 'FACULTY_QUERY' && String(query.faculty) === String(facultyUser._id);
    const isAuthorizedStudentQuery =
      query.type === 'STUDENT_QUERY' &&
      (String(query.assignedTo) === String(facultyUser._id) ||
        query.accessibleBy?.some((id) => String(id) === String(facultyUser._id)));

    if (!isOwnQuery && !isAuthorizedStudentQuery) {
      throw new ApiError(403, 'You are not authorized to respond to this ticket');
    }

    query.messages.push({
      sender: facultyUser._id,
      senderRole: 'FACULTY',
      senderName: facultyUser.name || 'Faculty Member',
      message: message.trim(),
      createdAt: new Date(),
    });

    // Faculty can change status on student queries (e.g. resolve)
    if (isAuthorizedStudentQuery && status) {
      query.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        query.resolvedAt = new Date();
        query.resolvedBy = facultyUser._id;
        if (resolutionNotes) {
          query.resolutionNotes = resolutionNotes.trim();
        }
      }
    }

    query.set(`lastReadBy.${facultyUser._id.toString()}`, new Date());
    await query.save();

    const populated = await query.populate([
      { path: 'student', select: 'name studentId rollNumber email phone batch technology organization' },
      { path: 'faculty', select: 'name facultyId email organization' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'resolvedBy', select: 'name email role' },
    ]);

    const latestMessage = populated.messages[populated.messages.length - 1];

    // Real-time broadcast to active chat room
    emitToQuery(populated._id.toString(), 'support:message_received', {
      queryId: populated._id,
      message: latestMessage,
      query: populated,
      status: populated.status,
    });

    const notif = {
      type: 'NEW_MESSAGE',
      queryId: populated._id,
      ticketId: populated.ticketId,
      subject: populated.subject,
      preview: message.trim(),
      senderName: facultyUser.name || 'Faculty Member',
      senderRole: 'FACULTY',
      status: populated.status,
      timestamp: new Date(),
    };

    if (populated.type === 'STUDENT_QUERY' && populated.student) {
      const studentUserId = (populated.student._id || populated.student).toString();
      emitToUser(studentUserId, 'support:notification', notif);
      emitToUser(studentUserId, 'support:query_updated', populated);
    } else if (populated.type === 'FACULTY_QUERY') {
      emitToAdmin('support:notification', notif);
      emitToAdmin('support:query_updated', populated);
    }

    emitToAdmin('support:query_updated', populated);

    return populated;
  }

  /**
   * 3. Admin gets queries: can view BOTH Student Queries and Faculty Queries
   */
  static async getAdminQueries({ tab = 'all', status, priority, search } = {}) {
    const filter = {};

    if (tab === 'student') {
      filter.type = 'STUDENT_QUERY';
    } else if (tab === 'faculty') {
      filter.type = 'FACULTY_QUERY';
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (priority && priority !== 'ALL') {
      filter.priority = priority;
    }

    if (search && search.trim()) {
      const escaped = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.$or = [
        { ticketId: { $regex: escaped, $options: 'i' } },
        { subject: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    return SupportQuery.find(filter)
      .populate('student', 'name studentId rollNumber email phone batch technology organization')
      .populate('faculty', 'name facultyId email phone organization')
      .populate('assignedTo', 'name email role organization')
      .populate('resolvedBy', 'name email role')
      .sort({ updatedAt: -1 });
  }

  /**
   * Admin replies to ANY query (Student query or Faculty query) and can resolve it
   */
  static async addAdminReply(adminUser, queryId, { message, status, resolutionNotes, assignedTo }) {
    if (!message || !message.trim()) {
      throw new ApiError(400, 'Reply message cannot be empty');
    }

    const query = await SupportQuery.findById(queryId);
    if (!query) {
      throw new ApiError(404, 'Ticket not found');
    }

    query.messages.push({
      sender: adminUser._id,
      senderRole: 'ADMIN',
      senderName: adminUser.name || 'System Administrator',
      message: message.trim(),
      createdAt: new Date(),
    });

    if (status) {
      query.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        query.resolvedAt = new Date();
        query.resolvedBy = adminUser._id;
        if (resolutionNotes) {
          query.resolutionNotes = resolutionNotes.trim();
        }
      }
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
      if (!query.accessibleBy.some((id) => String(id) === String(assignedTo))) {
        query.accessibleBy.push(assignedTo);
      }
    }

    query.set(`lastReadBy.${adminUser._id.toString()}`, new Date());
    await query.save();

    const populated = await query.populate([
      { path: 'student', select: 'name studentId rollNumber email phone batch technology organization' },
      { path: 'faculty', select: 'name facultyId email phone organization' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'resolvedBy', select: 'name email role' },
    ]);

    const latestMessage = populated.messages[populated.messages.length - 1];

    // Real-time broadcast to active chat room
    emitToQuery(populated._id.toString(), 'support:message_received', {
      queryId: populated._id,
      message: latestMessage,
      query: populated,
      status: populated.status,
    });

    const notif = {
      type: 'NEW_MESSAGE',
      queryId: populated._id,
      ticketId: populated.ticketId,
      subject: populated.subject,
      preview: message.trim(),
      senderName: adminUser.name || 'System Administrator',
      senderRole: 'ADMIN',
      status: populated.status,
      timestamp: new Date(),
    };

    if (populated.type === 'STUDENT_QUERY' && populated.student) {
      const studentUserId = (populated.student._id || populated.student).toString();
      emitToUser(studentUserId, 'support:notification', notif);
      emitToUser(studentUserId, 'support:query_updated', populated);
    }

    if (populated.type === 'FACULTY_QUERY' && populated.faculty) {
      const facultyUserId = (populated.faculty._id || populated.faculty).toString();
      emitToUser(facultyUserId, 'support:notification', notif);
      emitToUser(facultyUserId, 'support:query_updated', populated);
    }

    if (populated.assignedTo && populated.assignedTo._id && String(populated.assignedTo._id) !== String(adminUser._id)) {
      emitToUser(populated.assignedTo._id.toString(), 'support:query_updated', populated);
    }

    emitToAdmin('support:query_updated', populated);

    return populated;
  }

  /**
   * 4. Admin Support -> Sends mail directly to Developer
   */
  static async createDeveloperSupport(
    adminUser,
    { subject, category, priority, description, developerEmail, contactEmail, contactPhone, includeDiagnostics }
  ) {
    if (!subject || !subject.trim()) {
      throw new ApiError(400, 'Subject is required');
    }
    if (!description || !description.trim()) {
      throw new ApiError(400, 'Detailed description is required');
    }

    const targetDeveloperEmail =
      (developerEmail && developerEmail.trim()) ||
      process.env.DEVELOPER_EMAIL ||
      'support@skillcodex.com';

    const ticketId = generateTicketId('DEV');

    // Gather live system diagnostics if requested
    let systemDiagnostics = {};
    if (includeDiagnostics !== false) {
      systemDiagnostics = {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        totalMemoryMB: Math.floor(os.totalmem() / (1024 * 1024)),
        freeMemoryMB: Math.floor(os.freemem() / (1024 * 1024)),
        cpus: os.cpus()?.length || 1,
        nodeMemoryUsageMB: {
          rss: Math.floor(process.memoryUsage().rss / (1024 * 1024)),
          heapUsed: Math.floor(process.memoryUsage().heapUsed / (1024 * 1024)),
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Attempt to dispatch email via mailService
    const emailResult = await sendDeveloperSupportEmail({
      ticketId,
      adminName: adminUser.name || 'System Administrator',
      adminEmail: contactEmail || adminUser.email || '',
      adminPhone: contactPhone || adminUser.phone || '',
      subject: subject.trim(),
      category: category ? category.trim() : 'BUG_REPORT',
      priority: priority || 'HIGH',
      description: description.trim(),
      developerEmail: targetDeveloperEmail,
      systemDiagnostics,
    });

    const emailStatus = emailResult.success ? 'SENT' : 'MANUAL_DISPATCH';
    const emailError = emailResult.error || '';

    // Record developer support record in database for history and audit
    const devRecord = await DeveloperSupport.create({
      ticketId,
      admin: adminUser._id,
      adminName: adminUser.name || 'Administrator',
      adminEmail: contactEmail || adminUser.email || '',
      adminPhone: contactPhone || adminUser.phone || '',
      subject: subject.trim(),
      category: category ? category.trim() : 'BUG_REPORT',
      priority: priority || 'HIGH',
      description: description.trim(),
      developerEmail: targetDeveloperEmail,
      systemDiagnostics,
      emailStatus,
      emailError,
    });

    return {
      record: devRecord,
      emailSent: emailResult.success,
      emailError,
      developerEmail: targetDeveloperEmail,
    };
  }

  /**
   * Get developer support history for Admin
   */
  static async getDeveloperSupportHistory(adminId) {
    return DeveloperSupport.find({ admin: adminId }).sort({ createdAt: -1 });
  }

  /**
   * Get server diagnostics for display in Admin Support page
   */
  static getSystemDiagnostics() {
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      totalMemoryMB: Math.floor(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.floor(os.freemem() / (1024 * 1024)),
      cpus: os.cpus()?.length || 1,
      nodeMemoryUsageMB: {
        rss: Math.floor(process.memoryUsage().rss / (1024 * 1024)),
        heapUsed: Math.floor(process.memoryUsage().heapUsed / (1024 * 1024)),
      },
    };
  }

  /**
   * Mark a query as read by a specific user
   */
  static async markQueryAsRead(userId, queryId) {
    if (!queryId || !userId) return;
    const userIdStr = userId.toString();
    await SupportQuery.findByIdAndUpdate(queryId, {
      $set: { [`lastReadBy.${userIdStr}`]: new Date() },
    });
  }

  /**
   * Calculate exact count of unread queries/messages for a user
   */
  static async getUnreadCount(user) {
    if (!user?._id) return { unreadCount: 0, unreadQueryIds: [] };

    let filter = { status: { $ne: 'CLOSED' } };

    if (user.role === 'USER') {
      filter.student = user._id;
    } else if (user.role === 'FACULTY') {
      filter.$or = [
        { type: 'FACULTY_QUERY', faculty: user._id },
        { type: 'STUDENT_QUERY', accessibleBy: user._id },
        { type: 'STUDENT_QUERY', assignedTo: user._id },
      ];
    }
    // For ADMIN, all non-closed queries are in scope

    const queries = await SupportQuery.find(filter)
      .select('messages lastReadBy status type student faculty assignedTo')
      .lean();

    let unreadCount = 0;
    const unreadQueryIds = [];
    const userIdStr = user._id.toString();

    for (const q of queries) {
      if (!q.messages || q.messages.length === 0) continue;
      const lastMsg = q.messages[q.messages.length - 1];

      // If user themselves sent the last message, they have already read it
      if (String(lastMsg.sender) === userIdStr) continue;

      const lastRead = q.lastReadBy?.[userIdStr] || (q.lastReadBy?.get ? q.lastReadBy.get(userIdStr) : null);
      if (!lastRead || new Date(lastMsg.createdAt) > new Date(lastRead)) {
        unreadCount++;
        unreadQueryIds.push(q._id.toString());
      }
    }

    return { unreadCount, unreadQueryIds };
  }
}
