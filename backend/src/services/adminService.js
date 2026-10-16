import { User } from '../models/User.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';
import { Batch } from '../models/Batch.js';
import { Organization } from '../models/Organization.js';

export class AdminService {
  static async getDashboardAnalytics(currentUser = null) {
    const now = new Date();
    const isFaculty = currentUser && currentUser.role === 'FACULTY';
    const isAdmin = !currentUser || currentUser.role === 'ADMIN';

    let userFilter = { role: 'USER' };
    let facultyFilter = { role: 'FACULTY' };
    let examFilter = {};
    let examActiveFilter = { isPublished: true, startDate: { $lte: now }, endDate: { $gte: now } };
    let subFilter = {};
    let attemptFilter = {};
    let questionFilter = {};
    let batchFilter = {};
    let orgFilter = {};

    if (isFaculty) {
      userFilter.$or = [
        { createdBy: currentUser._id },
        { assignedFaculties: currentUser._id },
      ];
      examFilter.createdBy = currentUser._id;
      examActiveFilter.createdBy = currentUser._id;
      questionFilter.createdBy = currentUser._id;
      batchFilter.createdBy = currentUser._id;

      const myStudentIds = await User.find(userFilter).distinct('_id');
      const myExamIds = await Exam.find(examFilter).distinct('_id');
      subFilter.$or = [
        { examId: { $in: myExamIds } },
        { userId: { $in: myStudentIds } },
      ];
      attemptFilter.$or = [
        { examId: { $in: myExamIds } },
        { userId: { $in: myStudentIds } },
      ];
    }

    const [
      totalUsers,
      totalFaculty,
      totalBatches,
      totalOrganizations,
      totalExams,
      activeExams,
      totalSubmissions,
      allAttemptsCount,
      completedAttempts,
      submissionsByLang,
      questionsByDiff,
      batchStats,
    ] = await Promise.all([
      User.countDocuments(userFilter),
      isAdmin ? User.countDocuments(facultyFilter) : 0,
      Batch.countDocuments(batchFilter),
      Organization.countDocuments(orgFilter),
      Exam.countDocuments(examFilter),
      Exam.countDocuments(examActiveFilter),
      Submission.countDocuments(subFilter),
      ExamAttempt.countDocuments(attemptFilter),
      ExamAttempt.find(attemptFilter).populate('examId', 'title totalMarks passingMarks'),
      Submission.aggregate([
        ...(isFaculty ? [{ $match: subFilter }] : []),
        { $match: { questionType: { $ne: 'MCQ' }, language: { $nin: ['MCQ', 'mcq', null, ''] } } },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Question.aggregate([
        ...(isFaculty ? [{ $match: questionFilter }] : []),
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { ...userFilter, batch: { $exists: true, $ne: '' } } },
        { $group: { _id: '$batch', studentCount: { $sum: 1 } } },
        { $sort: { studentCount: -1 } },
        { $limit: 6 },
      ]),
    ]);

    // Calculate Average Score, Pass/Fail, and Violations
    let totalScoreSum = 0;
    let passedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let totalViolations = 0;
    let evaluatedCount = 0;

    const examMap = {};

    completedAttempts.forEach((att) => {
      totalViolations += att.violationCount || 0;

      if (['EVALUATED', 'SUBMITTED'].includes(att.status)) {
        evaluatedCount += 1;
        totalScoreSum += att.percentage || 0;

        if (att.resultStatus === 'PASS') {
          passedCount += 1;
        } else if (att.resultStatus === 'FAIL') {
          failedCount += 1;
        } else {
          pendingCount += 1;
        }

        const exId = att.examId?._id?.toString() || att.examId?.toString();
        const exTitle = att.examId?.title || 'Examination';
        if (exId) {
          if (!examMap[exId]) {
            examMap[exId] = {
              examId: exId,
              title: exTitle,
              attempts: 0,
              passed: 0,
              failed: 0,
              scoreSum: 0,
            };
          }
          examMap[exId].attempts += 1;
          examMap[exId].scoreSum += att.percentage || 0;
          if (att.resultStatus === 'PASS') examMap[exId].passed += 1;
          if (att.resultStatus === 'FAIL') examMap[exId].failed += 1;
        }
      }
    });

    const averageScore = evaluatedCount > 0
      ? +(totalScoreSum / evaluatedCount).toFixed(1)
      : 0;

    const passRate = evaluatedCount > 0
      ? +((passedCount / evaluatedCount) * 100).toFixed(1)
      : 0;

    const topExams = Object.values(examMap)
      .map((ex) => ({
        examId: ex.examId,
        title: ex.title,
        attempts: ex.attempts,
        avgScore: +(ex.scoreSum / ex.attempts).toFixed(1),
        passRate: +((ex.passed / ex.attempts) * 100).toFixed(1),
        passed: ex.passed,
        failed: ex.failed,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5);

    // Self-heal any legacy MCQ submissions where language was saved as 'java'
    Submission.updateMany(
      { questionType: 'MCQ', language: 'java' },
      { $set: { language: 'MCQ' } }
    ).exec().catch(() => {});

    // Recent submissions with full context
    const recentSubmissions = await Submission.find(subFilter)
      .populate('userId', 'name email rollNumber')
      .populate('examId', 'title')
      .populate('questionId', 'title type marks')
      .sort({ createdAt: -1 })
      .limit(8);

    const outcomeDistribution = [
      { name: 'Passed', count: passedCount, color: '#10b981' },
      { name: 'Failed', count: failedCount, color: '#f43f5e' },
      { name: 'Pending / In Progress', count: pendingCount + Math.max(0, allAttemptsCount - evaluatedCount), color: '#f59e0b' },
    ];

    const batchPerformance = batchStats.map((b) => ({
      batch: b._id,
      students: b.studentCount,
    }));

    return {
      stats: {
        totalUsers,
        totalFaculty,
        totalBatches,
        totalOrganizations,
        totalExams,
        activeExams,
        completedExams: evaluatedCount,
        totalSubmissions,
        totalAttempts: allAttemptsCount,
        averageScore,
        passRate,
        passedCount,
        failedCount,
        totalViolations,
      },
      outcomeDistribution,
      topExams,
      batchPerformance,
      languageDistribution: submissionsByLang.map((l) => ({ language: l._id, count: l.count })),
      difficultyDistribution: questionsByDiff.map((d) => ({ difficulty: d._id, count: d.count })),
      recentSubmissions,
    };
  }

  static async getUsers(query = {}, currentUser = null) {
    const conditions = [{ role: 'USER' }];
    if (currentUser && currentUser.role === 'FACULTY') {
      conditions.push({
        $or: [
          { createdBy: currentUser._id },
          { assignedFaculties: currentUser._id },
        ],
      });
    }

    if (query.search) {
      conditions.push({
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { studentId: { $regex: query.search, $options: 'i' } },
          { rollNumber: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } },
          { organization: { $regex: query.search, $options: 'i' } },
        ],
      });
    }
    if (query.status !== undefined && query.status !== '') {
      conditions.push({ isActive: query.status === 'active' });
    }
    if (query.technology) {
      conditions.push({ technology: query.technology });
    }
    if (query.batch) {
      conditions.push({ batch: query.batch });
    }
    if (query.creatorId) {
      conditions.push({ createdBy: query.creatorId });
    }
    if (query.gender) {
      conditions.push({ gender: query.gender });
    }
    if (query.organization) {
      if (query.organization === 'unassigned') {
        conditions.push({
          $or: [
            { organization: '' },
            { organization: null },
            { organization: { $exists: false } },
          ],
        });
      } else {
        const cleanOrg = query.organization.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        conditions.push({ organization: { $regex: new RegExp(`^${cleanOrg}$`, 'i') } });
      }
    }

    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '15', 10);
    const skip = (page - 1) * limit;

    const baseFacultyFilter = { role: 'USER' };
    if (currentUser && currentUser.role === 'FACULTY') {
      baseFacultyFilter.$or = [
        { createdBy: currentUser._id },
        { assignedFaculties: currentUser._id },
      ];
    }

    let availableBatches = [];
    let availableTechnologies = [];
    let availableGenders = [];
    let availableOrganizations = [];
    let organizationsSummary = [];

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('createdBy', 'name email role')
        .populate('assignedFaculties', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    if (currentUser && currentUser.role === 'FACULTY') {
      const isFacultyAssigned = Boolean(currentUser.organization && currentUser.organization.trim());
      const facultyOrgName = isFacultyAssigned ? currentUser.organization.trim() : '';

      if (isFacultyAssigned) {
        const orgRegex = new RegExp(`^${facultyOrgName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
        const [batches, technologies, genders, orgStudentCount, orgActiveCount, orgBatches] = await Promise.all([
          User.distinct('batch', { ...baseFacultyFilter, batch: { $ne: '' } }),
          User.distinct('technology', { ...baseFacultyFilter, technology: { $ne: '' } }),
          User.distinct('gender', { ...baseFacultyFilter, gender: { $ne: '' } }),
          User.countDocuments({ ...baseFacultyFilter, organization: orgRegex }),
          User.countDocuments({ ...baseFacultyFilter, organization: orgRegex, isActive: true }),
          User.distinct('batch', { ...baseFacultyFilter, organization: orgRegex, batch: { $ne: '' } }),
        ]);

        availableBatches = batches;
        availableTechnologies = technologies;
        availableGenders = genders;
        availableOrganizations = [facultyOrgName];
        organizationsSummary = [
          {
            name: facultyOrgName,
            id: facultyOrgName,
            studentCount: orgStudentCount,
            activeCount: orgActiveCount,
            batches: orgBatches.filter(Boolean),
          },
        ];
      } else {
        const [batches, technologies, genders] = await Promise.all([
          User.distinct('batch', { ...baseFacultyFilter, batch: { $ne: '' } }),
          User.distinct('technology', { ...baseFacultyFilter, technology: { $ne: '' } }),
          User.distinct('gender', { ...baseFacultyFilter, gender: { $ne: '' } }),
        ]);

        availableBatches = batches;
        availableTechnologies = technologies;
        availableGenders = genders;
        availableOrganizations = [];
        organizationsSummary = [];
      }
    } else {
      const [batches, technologies, genders, orgs, orgAggregate] = await Promise.all([
        User.distinct('batch', { ...baseFacultyFilter, batch: { $ne: '' } }),
        User.distinct('technology', { ...baseFacultyFilter, technology: { $ne: '' } }),
        User.distinct('gender', { ...baseFacultyFilter, gender: { $ne: '' } }),
        User.distinct('organization', { ...baseFacultyFilter, organization: { $ne: '' } }),
        User.aggregate([
          { $match: baseFacultyFilter },
          {
            $group: {
              _id: { $ifNull: ['$organization', ''] },
              studentCount: { $sum: 1 },
              activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
              batches: { $addToSet: '$batch' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      availableBatches = batches;
      availableTechnologies = technologies;
      availableGenders = genders;
      availableOrganizations = orgs;
      organizationsSummary = orgAggregate.map((item) => ({
        name: item._id || 'Unassigned / Direct',
        id: item._id || 'unassigned',
        studentCount: item.studentCount,
        activeCount: item.activeCount,
        batches: (item.batches || []).filter(Boolean),
      }));
    }

    // Attach attempts count and avg score for each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const attempts = await ExamAttempt.find({ userId: u._id, status: 'EVALUATED' });
        const avgScore = attempts.length
          ? +(
              attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
              attempts.length
            ).toFixed(1)
          : 0;

        return {
          ...u.toJSON(),
          technology: u.technology || u.batch || '',
          organization: u.organization || '',
          createdBy: u.createdBy,
          assignedFaculties: u.assignedFaculties,
          isImported: Boolean(u.isImported || (u.importedBy && u.importedBy.length > 0)),
          importedBy: u.importedBy || [],
          examsAttempted: attempts.length,
          averageScore: avgScore,
        };
      })
    );

    return {
      users: usersWithStats,
      availableBatches,
      availableTechnologies,
      availableGenders,
      availableOrganizations,
      organizationsSummary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async toggleUserStatus(userId, currentUser = null) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errorCode = 'USER_NOT_FOUND';
      throw error;
    }

    if (user.role === 'ADMIN') {
      const error = new Error('Cannot toggle status of administrator account');
      error.statusCode = 400;
      error.errorCode = 'CANNOT_MODIFY_ADMIN';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(user.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only modify students created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    user.isActive = !user.isActive;
    await user.save();

    return {
      userId: user._id,
      isActive: user.isActive,
      message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  static async deleteUser(userId, currentUser = null) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errorCode = 'USER_NOT_FOUND';
      throw error;
    }

    if (user.role === 'ADMIN') {
      const error = new Error('Cannot delete administrator account');
      error.statusCode = 400;
      error.errorCode = 'CANNOT_DELETE_ADMIN';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY') {
      const isCreator = String(user.createdBy) === String(currentUser._id);
      const isAssigned = user.assignedFaculties?.some((fId) => String(fId) === String(currentUser._id));
      if (!isCreator && !isAssigned) {
        const error = new Error('Access denied. You can only delete or unlink candidates in your dashboard.');
        error.statusCode = 403;
        error.errorCode = 'FORBIDDEN';
        throw error;
      }
      if (!isCreator && isAssigned) {
        // Unlink from this faculty's dashboard
        await User.findByIdAndUpdate(userId, { $pull: { assignedFaculties: currentUser._id } });
        return {
          success: true,
          message: `Candidate ${user.name} was successfully unlinked from your dashboard.`,
        };
      }
    }

    // Cascade delete attempts, submissions, and submission results
    await ExamAttempt.deleteMany({ userId });
    await Submission.deleteMany({ userId });
    await SubmissionResult.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    return {
      success: true,
      message: `User ${user.name} and associated attempt records deleted successfully.`,
    };
  }

  static async getAllExams(currentUser = null) {
    const filter = {};
    if (currentUser && currentUser.role === 'FACULTY') {
      filter.createdBy = currentUser._id;
    }

    const exams = await Exam.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    const now = new Date();

    return exams.map((exam) => {
      const examObj = exam.toObject();
      let calculatedStatus = exam.status || 'DRAFT';

      if (exam.isPublished) {
        if (now < new Date(exam.startDate)) {
          calculatedStatus = 'UPCOMING';
        } else if (now > new Date(exam.endDate)) {
          calculatedStatus = 'EXPIRED';
        } else {
          calculatedStatus = 'ACTIVE';
        }
      } else {
        calculatedStatus = 'DRAFT';
      }

      return {
        ...examObj,
        questionCount: exam.questions?.length || 0,
        calculatedStatus,
      };
    });
  }

  static async createExam(data, adminId) {
    // Calculate total marks from questions
    let totalMarks = 0;
    const questions = (data.questions || []).map((q, idx) => {
      totalMarks += Number(q.marks || 0);
      return {
        questionId: q.questionId,
        marks: Number(q.marks || 0),
        order: q.order !== undefined ? q.order : idx + 1,
        allowCodeRun: q.allowCodeRun !== undefined && q.allowCodeRun !== null ? Boolean(q.allowCodeRun) : null,
      };
    });

    const exam = await Exam.create({
      ...data,
      totalMarks: data.totalMarks || totalMarks || 100,
      questions,
      createdBy: adminId,
    });

    return exam;
  }

  static async updateExam(id, data, currentUser = null) {
    const exam = await Exam.findById(id);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(exam.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only update examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    if (data.questions) {
      let totalMarks = 0;
      data.questions = data.questions.map((q, idx) => {
        totalMarks += Number(q.marks || 0);
        return {
          questionId: q.questionId,
          marks: Number(q.marks || 0),
          order: q.order !== undefined ? q.order : idx + 1,
          allowCodeRun: q.allowCodeRun !== undefined && q.allowCodeRun !== null ? Boolean(q.allowCodeRun) : null,
        };
      });
      if (!data.totalMarks) {
        data.totalMarks = totalMarks;
      }
    }

    Object.assign(exam, data);
    await exam.save();

    return exam;
  }

  static async deleteExam(id, currentUser = null) {
    const exam = await Exam.findById(id);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(exam.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only delete examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    // Cascade delete attempts, submissions, and submission results
    const attemptIds = await ExamAttempt.find({ examId: id }).distinct('_id');
    if (attemptIds.length > 0) {
      await SubmissionResult.deleteMany({ attemptId: { $in: attemptIds } });
      await Submission.deleteMany({ attemptId: { $in: attemptIds } });
      await ExamAttempt.deleteMany({ examId: id });
    }

    await Exam.findByIdAndDelete(id);
    return { message: 'Exam and all associated student attempts deleted successfully.' };
  }

  static async bulkDeleteExams(ids, currentUser = null) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const error = new Error('No exam IDs provided for deletion');
      error.statusCode = 400;
      throw error;
    }

    let filter = { _id: { $in: ids } };
    if (currentUser && currentUser.role === 'FACULTY') {
      filter.createdBy = currentUser._id;
    }

    const examsToDelete = await Exam.find(filter).distinct('_id');
    if (examsToDelete.length === 0) {
      return { count: 0, message: 'No eligible examinations found to delete' };
    }

    const attemptIds = await ExamAttempt.find({ examId: { $in: examsToDelete } }).distinct('_id');
    if (attemptIds.length > 0) {
      await SubmissionResult.deleteMany({ attemptId: { $in: attemptIds } });
      await Submission.deleteMany({ attemptId: { $in: attemptIds } });
      await ExamAttempt.deleteMany({ examId: { $in: examsToDelete } });
    }

    const deleteResult = await Exam.deleteMany({ _id: { $in: examsToDelete } });
    return { count: deleteResult.deletedCount, message: `Successfully deleted ${deleteResult.deletedCount} examination(s).` };
  }

  static async bulkDeleteUsers(ids, currentUser = null) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const error = new Error('No student IDs provided for deletion');
      error.statusCode = 400;
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY') {
      const myCreatedUsers = await User.find({
        _id: { $in: ids },
        role: 'USER',
        createdBy: currentUser._id,
      }).distinct('_id');

      const myAssignedUsers = await User.find({
        _id: { $in: ids },
        role: 'USER',
        createdBy: { $ne: currentUser._id },
        assignedFaculties: currentUser._id,
      }).distinct('_id');

      let deletedCount = 0;
      let unlinkedCount = 0;

      if (myCreatedUsers.length > 0) {
        const attemptIds = await ExamAttempt.find({ userId: { $in: myCreatedUsers } }).distinct('_id');
        if (attemptIds.length > 0) {
          await SubmissionResult.deleteMany({ attemptId: { $in: attemptIds } });
          await Submission.deleteMany({ attemptId: { $in: attemptIds } });
          await ExamAttempt.deleteMany({ userId: { $in: myCreatedUsers } });
        }
        const delRes = await User.deleteMany({ _id: { $in: myCreatedUsers } });
        deletedCount = delRes.deletedCount;
      }

      if (myAssignedUsers.length > 0) {
        await User.updateMany(
          { _id: { $in: myAssignedUsers } },
          { $pull: { assignedFaculties: currentUser._id } }
        );
        unlinkedCount = myAssignedUsers.length;
      }

      const totalHandled = deletedCount + unlinkedCount;
      if (totalHandled === 0) {
        return { count: 0, message: 'No eligible candidate accounts found to delete or unlink' };
      }

      return {
        count: totalHandled,
        message: `Successfully removed ${totalHandled} candidate(s)${unlinkedCount > 0 ? ` (${deletedCount} deleted, ${unlinkedCount} unlinked from dashboard)` : ''}.`,
      };
    }

    const usersToDelete = await User.find({ _id: { $in: ids }, role: 'USER' }).distinct('_id');
    if (usersToDelete.length === 0) {
      return { count: 0, message: 'No eligible candidates found to delete' };
    }

    const attemptIds = await ExamAttempt.find({ userId: { $in: usersToDelete } }).distinct('_id');
    if (attemptIds.length > 0) {
      await SubmissionResult.deleteMany({ attemptId: { $in: attemptIds } });
      await Submission.deleteMany({ attemptId: { $in: attemptIds } });
      await ExamAttempt.deleteMany({ userId: { $in: usersToDelete } });
    }

    const res = await User.deleteMany({ _id: { $in: usersToDelete } });
    return { count: res.deletedCount, message: `Successfully deleted ${res.deletedCount} candidate account(s).` };
  }

  static async bulkDeleteFaculty(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const error = new Error('No faculty IDs provided for deletion');
      error.statusCode = 400;
      throw error;
    }

    const res = await User.deleteMany({ _id: { $in: ids }, role: 'FACULTY' });
    return { count: res.deletedCount, message: `Successfully deleted ${res.deletedCount} faculty member(s).` };
  }

  static async deleteResult(attemptId, currentUser = null) {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      const error = new Error('Result attempt not found');
      error.statusCode = 404;
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY') {
      const isMyExam = attempt.examId && (await Exam.exists({ _id: attempt.examId, createdBy: currentUser._id }));
      const student = await User.findById(attempt.userId);
      const isMyStudent = student && (
        String(student.createdBy) === String(currentUser._id) ||
        student.assignedFaculties?.some((fId) => String(fId) === String(currentUser._id)) ||
        (currentUser.organization && student.organization === currentUser.organization)
      );
      if (!isMyStudent && !isMyExam) {
        const error = new Error('Access denied. You can only delete results for your students or your exams.');
        error.statusCode = 403;
        throw error;
      }
    }

    await SubmissionResult.deleteMany({ attemptId });
    await Submission.deleteMany({ attemptId });
    await ExamAttempt.findByIdAndDelete(attemptId);
    return { message: 'Result and associated submissions deleted successfully.' };
  }

  static async allowRetake(attemptId, currentUser = null) {
    const attempt = await ExamAttempt.findById(attemptId).populate('userId', 'name rollNumber studentId').populate('examId', 'title');
    if (!attempt) {
      const error = new Error('Result attempt not found');
      error.statusCode = 404;
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY') {
      const isMyExam = attempt.examId && (await Exam.exists({ _id: attempt.examId._id || attempt.examId, createdBy: currentUser._id }));
      const student = await User.findById(attempt.userId?._id || attempt.userId);
      const isMyStudent = student && (
        String(student.createdBy) === String(currentUser._id) ||
        student.assignedFaculties?.some((fId) => String(fId) === String(currentUser._id)) ||
        (currentUser.organization && student.organization === currentUser.organization)
      );
      if (!isMyStudent && !isMyExam) {
        const error = new Error('Access denied. You can only grant retakes for your students or your exams.');
        error.statusCode = 403;
        throw error;
      }
    }

    const studentName = attempt.userId?.name || 'Candidate';
    const examTitle = attempt.examId?.title || 'Exam';

    // Wipe prior attempt, submissions, and evaluation results so candidate starts fresh
    await SubmissionResult.deleteMany({ attemptId });
    await Submission.deleteMany({ attemptId });
    await ExamAttempt.findByIdAndDelete(attemptId);

    return {
      success: true,
      message: `Retake successfully granted for candidate "${studentName}". Previous attempt and results for "${examTitle}" have been deleted.`,
    };
  }

  static async bulkDeleteResults(attemptIds, currentUser = null) {
    if (!attemptIds || !Array.isArray(attemptIds) || attemptIds.length === 0) {
      const error = new Error('No result IDs provided for deletion');
      error.statusCode = 400;
      throw error;
    }

    let filter = { _id: { $in: attemptIds } };
    if (currentUser && currentUser.role === 'FACULTY') {
      const myExamIds = await Exam.find({ createdBy: currentUser._id }).distinct('_id');
      const allowedStudentIds = await User.find({
        role: 'USER',
        $or: [
          { createdBy: currentUser._id },
          { assignedFaculties: currentUser._id },
          { organization: currentUser.organization || '__NONE__' },
        ]
      }).distinct('_id');
      filter.$or = [
        { examId: { $in: myExamIds } },
        { userId: { $in: allowedStudentIds } }
      ];
    }

    const validAttempts = await ExamAttempt.find(filter).distinct('_id');
    if (validAttempts.length === 0) {
      return { count: 0, message: 'No eligible results found to delete' };
    }

    await SubmissionResult.deleteMany({ attemptId: { $in: validAttempts } });
    await Submission.deleteMany({ attemptId: { $in: validAttempts } });
    const res = await ExamAttempt.deleteMany({ _id: { $in: validAttempts } });
    return { count: res.deletedCount, message: `Successfully deleted ${res.deletedCount} result record(s).` };
  }

  static async duplicateExam(id, adminId, currentUser = null) {
    const original = await Exam.findById(id);
    if (!original) {
      const error = new Error('Original exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(original.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only duplicate examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    const copyData = original.toObject();
    delete copyData._id;
    delete copyData.createdAt;
    delete copyData.updatedAt;
    copyData.title = `${original.title} (Copy)`;
    copyData.isPublished = false;
    copyData.status = 'DRAFT';
    copyData.createdBy = adminId;

    const newExam = await Exam.create(copyData);
    return newExam;
  }

  static async reorderQuestions(examId, orderedQuestionIds, currentUser = null) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(exam.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only modify examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    const qMap = new Map();
    exam.questions.forEach((q) => qMap.set(q.questionId.toString(), q));

    const reordered = [];
    orderedQuestionIds.forEach((qId, idx) => {
      const existing = qMap.get(qId.toString());
      if (existing) {
        existing.order = idx + 1;
        reordered.push(existing);
      }
    });

    exam.questions = reordered;
    await exam.save();

    return exam;
  }
}
