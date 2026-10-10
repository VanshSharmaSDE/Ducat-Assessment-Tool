import { AdminService } from '../services/adminService.js';
import { ResultService } from '../services/resultService.js';
import { Submission } from '../models/Submission.js';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ExamAttempt from '../models/ExamAttempt.js';
import { Exam } from '../models/Exam.js';

/**
 * 1. Manually Create a Single Student
 */
export const createStudent = async (req, res) => {
  try {
    const { name, email, password, rollNumber, phone, batch, gender } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: 'USER',
      rollNumber: rollNumber ? String(rollNumber).trim() : '',
      phone: phone ? String(phone).trim() : '',
      batch: batch ? String(batch).trim() : '',
      gender: gender ? String(gender).trim() : '',
      createdBy: req.user._id,
      isActive: true,
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email,
        rollNumber: newStudent.rollNumber,
        batch: newStudent.batch,
        gender: newStudent.gender,
        createdBy: req.user._id,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Bulk Upload Students via Excel
 */
export const uploadStudentsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx or .xls) file' });
    }

    // Parse Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty' });
    }

    const createdUsers = [];
    const errors = [];

    for (let index = 0; index < sheetData.length; index++) {
      const row = sheetData[index];
      const rowNumber = index + 2; // Accounting for 1-based index and header row

      const name = row['Full Name'] || row['name'] || row['Name'];
      const email = row['Email'] || row['email'];
      const password = String(row['Password'] || row['password'] || 'Student@123');
      const rollNumber = String(row['Roll Number'] || row['rollNumber'] || row['Roll'] || '');
      const phone = String(row['Phone'] || row['phone'] || '');
      const batch = String(row['Batch'] || row['batch'] || '');
      const gender = String(row['Gender'] || row['gender'] || '');
      const rawAge = row['Age'] || row['age'];
      const age = rawAge ? Number(rawAge) : null;

      if (!name || !email) {
        errors.push(`Row ${rowNumber}: Name and Email are required.`);
        continue;
      }

      const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (existing) {
        errors.push(`Row ${rowNumber}: Email "${email}" already registered.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const student = await User.create({
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        passwordHash: hashedPassword,
        role: 'USER',
        rollNumber: rollNumber.trim(),
        phone: phone.trim(),
        batch: batch.trim(),
        gender: gender.trim(),
        age: age,
        createdBy: req.user._id,
        isActive: true,
        isVerified: true,
      });

      createdUsers.push(student.email);
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${createdUsers.length} student(s) successfully.`,
      importedCount: createdUsers.length,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Export Student Exam Results to Excel (supports individual exam or filtered)
 */
export const exportResultsExcel = async (req, res) => {
  try {
    const examId = req.params.id || req.query.examId;
    const { batch, gender, language } = req.query;

    const filter = { 
      status: { $in: ['EVALUATED', 'SUBMITTED', 'COMPLETED'] } 
    };

    if (examId) {
      filter.examId = examId;
    }

    // Role check: Faculty can ONLY export results for students they created
    if (req.user?.role === 'FACULTY') {
      const myStudentIds = await User.find({ createdBy: req.user._id }).distinct('_id');
      filter.userId = { $in: myStudentIds };
    }

    // Filter by student batch or gender
    const userFilter = {};
    if (req.user?.role === 'FACULTY') {
      userFilter.createdBy = req.user._id;
    }
    if (batch) userFilter.batch = batch;
    if (gender) userFilter.gender = gender;

    if (Object.keys(userFilter).length > 0) {
      const userIds = await User.find(userFilter).distinct('_id');
      if (filter.userId && filter.userId.$in) {
        const existingIds = new Set(filter.userId.$in.map(String));
        filter.userId = { $in: userIds.filter((id) => existingIds.has(String(id))) };
      } else {
        filter.userId = { $in: userIds };
      }
    }

    // Filter by programming language
    if (language) {
      const attemptIds = await Submission.find({ language }).distinct('attemptId');
      filter._id = { $in: attemptIds };
    }

    const attempts = await ExamAttempt.find(filter)
      .populate({
        path: 'userId',
        select: 'name email rollNumber batch gender createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      })
      .populate({
        path: 'examId',
        select: 'title totalMarks passingMarks createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      })
      .sort({ createdAt: -1 });

    let examTitle = 'All_Exams';
    if (examId && attempts.length > 0 && attempts[0].examId) {
      examTitle = attempts[0].examId.title || 'Exam';
    } else if (examId) {
      const examDoc = await Exam.findById(examId);
      if (examDoc) examTitle = examDoc.title;
    }

    // Fetch languages used for each attempt
    const attemptIds = attempts.map((a) => a._id);
    const submissions = await Submission.find({ attemptId: { $in: attemptIds } }, 'attemptId language');
    const attemptLangMap = {};
    submissions.forEach((sub) => {
      const idStr = sub.attemptId.toString();
      if (!attemptLangMap[idStr]) {
        attemptLangMap[idStr] = new Set();
      }
      attemptLangMap[idStr].add(sub.language);
    });

    const rows = attempts.map((att, idx) => {
      const score = att.totalScore ?? att.totalScoreObtained ?? 0;
      const max = att.maxScore || att.examId?.totalMarks || 100;
      const passMarks = att.examId?.passingMarks || 40;
      const passed = att.resultStatus === 'PASS' || score >= passMarks;
      const langs = Array.from(attemptLangMap[att._id.toString()] || []).join(', ') || 'N/A';
      const studentCreator = att.userId?.createdBy?.name 
        ? `${att.userId.createdBy.name} (${att.userId.createdBy.role})` 
        : 'System / Admin';
      const examCreator = att.examId?.createdBy?.name
        ? `${att.examId.createdBy.name} (${att.examId.createdBy.role})`
        : 'System';

      return {
        'S.No': idx + 1,
        'Student Name': att.userId?.name || 'N/A',
        'Email': att.userId?.email || 'N/A',
        'Roll Number': att.userId?.rollNumber || 'N/A',
        'Batch': att.userId?.batch || 'N/A',
        'Gender': att.userId?.gender || 'N/A',
        'Created By (Faculty)': studentCreator,
        'Exam Title': att.examId?.title || 'N/A',
        'Exam Created By': examCreator,
        'Languages Used': langs,
        'Violations': att.violationCount || 0,
        'Score Obtained': score,
        'Max Marks': max,
        'Percentage (%)': max > 0 ? ((score / max) * 100).toFixed(2) + '%' : '0%',
        'Status': passed ? 'PASSED' : 'FAILED',
        'Submission Date': new Date(att.submittedAt || att.createdAt).toLocaleString()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exam Results');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const cleanFileName = examTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}_Results.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export class AdminController {
  static async getAnalytics(req, res, next) {
    try {
      const data = await AdminService.getDashboardAnalytics(req.user);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req, res, next) {
    try {
      const result = await AdminService.getUsers(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.toggleUserStatus(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteUser(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllExams(req, res, next) {
    try {
      const exams = await AdminService.getAllExams(req.user);
      res.status(200).json({
        success: true,
        data: { exams },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createExam(req, res, next) {
    try {
      const exam = await AdminService.createExam(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Exam created successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateExam(req, res, next) {
    try {
      const { id } = req.params;
      const exam = await AdminService.updateExam(id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: 'Exam updated successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteExam(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteExam(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async duplicateExam(req, res, next) {
    try {
      const { id } = req.params;
      const exam = await AdminService.duplicateExam(id, req.user._id, req.user);
      res.status(201).json({
        success: true,
        message: 'Exam duplicated successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async reorderQuestions(req, res, next) {
    try {
      const { id } = req.params;
      const { questionIds } = req.body;
      const exam = await AdminService.reorderQuestions(id, questionIds, req.user);
      res.status(200).json({
        success: true,
        message: 'Questions reordered successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllResults(req, res, next) {
    try {
      const result = await ResultService.getAllResultsAdmin(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllSubmissions(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      let filter = {};
      if (req.user?.role === 'FACULTY') {
        const myStudentIds = await User.find({ createdBy: req.user._id }).distinct('_id');
        filter.userId = { $in: myStudentIds };
      }

      const [submissions, total] = await Promise.all([
        Submission.find(filter)
          .populate({
            path: 'userId',
            select: 'name email createdBy',
            populate: { path: 'createdBy', select: 'name email role' }
          })
          .populate({
            path: 'examId',
            select: 'title createdBy',
            populate: { path: 'createdBy', select: 'name email role' }
          })
          .populate('questionId', 'title marks')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Submission.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          submissions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, rollNumber, phone, batch, gender, age, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (req.user.role === 'FACULTY' && String(user.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only update students you created.' });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered to another user.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (rollNumber !== undefined) user.rollNumber = String(rollNumber).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (batch !== undefined) user.batch = String(batch).trim();
    if (gender !== undefined) user.gender = String(gender).trim();
    if (age !== undefined) user.age = age === '' || age === null ? null : Number(age);

    if (password && password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportSubmissionsDocx = async (req, res) => {
  try {
    const { examId, userId } = req.query;

    if (req.user.role === 'FACULTY') {
      if (userId) {
        const student = await User.findById(userId);
        if (!student || String(student.createdBy) !== String(req.user._id)) {
          return res.status(403).json({ success: false, message: 'Access denied. You can only export submissions for your own students.' });
        }
      }
    }

    const { DocxExportService } = await import('../services/docxExportService.js');
    const buffer = await DocxExportService.generateSubmissionsDocx({ examId, userId });

    const filename = `submissions_${examId || 'all'}_${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubmissionsHierarchyExams = async (req, res) => {
  try {
    const examFilter = {};
    if (req.user?.role === 'FACULTY') {
      examFilter.createdBy = req.user._id;
    }

    const exams = await Exam.find(examFilter).populate('createdBy', 'name email role').sort({ createdAt: -1 });

    const hierarchyData = await Promise.all(
      exams.map(async (exam) => {
        let attemptFilter = { examId: exam._id };
        if (req.user?.role === 'FACULTY') {
          const myStudentIds = await User.find({ createdBy: req.user._id }).distinct('_id');
          attemptFilter.userId = { $in: myStudentIds };
        }

        const attemptCount = await ExamAttempt.countDocuments(attemptFilter);
        const completedCount = await ExamAttempt.countDocuments({
          ...attemptFilter,
          status: { $in: ['COMPLETED', 'EVALUATED'] }
        });

        return {
          _id: exam._id,
          title: exam.title,
          duration: exam.duration,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
          status: exam.status,
          attemptCount,
          completedCount,
          createdBy: exam.createdBy,
          createdAt: exam.createdAt,
        };
      })
    );

    res.status(200).json({ success: true, data: { exams: hierarchyData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExamStudents = async (req, res) => {
  try {
    const { examId } = req.params;
    let attemptFilter = { examId };

    if (req.user?.role === 'FACULTY') {
      const myStudentIds = await User.find({ createdBy: req.user._id }).distinct('_id');
      attemptFilter.userId = { $in: myStudentIds };
    }

    const attempts = await ExamAttempt.find(attemptFilter)
      .populate({
        path: 'userId',
        select: 'name email rollNumber batch gender age createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      })
      .sort({ createdAt: -1 });

    const students = attempts.map((a) => ({
      attemptId: a._id,
      user: a.userId,
      status: a.status,
      totalScore: a.totalScore,
      percentage: a.percentage,
      passed: a.passed,
      violationCount: a.violationCount,
      submittedAt: a.submittedAt || a.updatedAt,
      startTime: a.startTime,
    }));

    res.status(200).json({ success: true, data: { students } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentSubmissions = async (req, res) => {
  try {
    const { examId, userId } = req.params;

    if (req.user?.role === 'FACULTY') {
      const student = await User.findById(userId);
      if (!student || String(student.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view submissions for your own students.' });
      }
    }

    const attempt = await ExamAttempt.findOne({ examId, userId })
      .populate({
        path: 'userId',
        select: 'name email rollNumber batch gender age createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      })
      .populate('examId', 'title totalMarks passingMarks duration createdBy');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Candidate attempt not found' });
    }

    const submissions = await Submission.find({ attemptId: attempt._id })
      .populate('questionId', 'title marks difficulty inputFormat outputFormat constraints examples')
      .sort({ createdAt: 1 });

    const { SubmissionResult } = await import('../models/SubmissionResult.js');
    const results = await SubmissionResult.find({ attemptId: attempt._id });
    const resultMap = new Map();
    results.forEach((r) => resultMap.set(String(r.questionId), r));

    const enrichedSubmissions = submissions.map((sub) => {
      const qId = String(sub.questionId?._id || sub.questionId);
      const resData = resultMap.get(qId);
      return {
        ...sub.toObject(),
        result: resData || null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        attempt,
        exam: attempt.examId,
        student: attempt.userId,
        submissions: enrichedSubmissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ========================================================
 * FACULTY MANAGEMENT CONTROLLERS (Super Admin)
 * ========================================================
 */

export const getFacultyList = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const skip = (page - 1) * limit;

    const filter = { role: 'FACULTY' };
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { batch: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.isActive = req.query.status === 'active';
    }

    const [faculty, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        faculty: faculty.map((f) => ({
          _id: f._id,
          name: f.name,
          email: f.email,
          phone: f.phone,
          department: f.batch || '',
          isActive: f.isActive,
          createdAt: f.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { name, email, password, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newFaculty = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: 'FACULTY',
      batch: department ? String(department).trim() : '',
      phone: phone ? String(phone).trim() : '',
      createdBy: req.user._id,
      isActive: true,
      isVerified: true,
    });

    res.status(201).json({
      success: true,
      message: 'Faculty account created successfully',
      data: {
        faculty: {
          _id: newFaculty._id,
          name: newFaculty.name,
          email: newFaculty.email,
          phone: newFaculty.phone,
          department: newFaculty.batch,
          isActive: newFaculty.isActive,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, department, password } = req.body;

    const faculty = await User.findOne({ _id: id, role: 'FACULTY' });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    if (email && email.toLowerCase().trim() !== faculty.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered to another user.' });
      }
      faculty.email = email.toLowerCase().trim();
    }

    if (name) faculty.name = name.trim();
    if (phone !== undefined) faculty.phone = String(phone).trim();
    if (department !== undefined) faculty.batch = String(department).trim();

    if (password && password.trim().length >= 6) {
      faculty.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await faculty.save();

    res.status(200).json({
      success: true,
      message: 'Faculty account updated successfully',
      data: {
        faculty: {
          _id: faculty._id,
          name: faculty.name,
          email: faculty.email,
          phone: faculty.phone,
          department: faculty.batch,
          isActive: faculty.isActive,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await User.findOne({ _id: id, role: 'FACULTY' });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Faculty member "${faculty.name}" deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadFacultyTemplate = async (req, res) => {
  try {
    const sampleData = [
      {
        'Full Name': 'Dr. Rajesh Sharma',
        'Email': 'rajesh.sharma@university.edu',
        'Password': 'Faculty@123',
        'Department': 'Computer Science & Engineering',
        'Phone': '9876543210',
      },
      {
        'Full Name': 'Prof. Ananya Gupta',
        'Email': 'ananya.gupta@university.edu',
        'Password': 'Faculty@123',
        'Department': 'Information Technology',
        'Phone': '9876543211',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faculty_Template');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="faculty_upload_template.xlsx"');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadFacultyExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx or .xls) file' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty' });
    }

    const createdFaculty = [];
    const errors = [];

    for (let index = 0; index < sheetData.length; index++) {
      const row = sheetData[index];
      const rowNumber = index + 2;

      const name = row['Full Name'] || row['name'] || row['Name'];
      const email = row['Email'] || row['email'];
      const password = String(row['Password'] || row['password'] || 'Faculty@123');
      const department = String(row['Department'] || row['department'] || row['batch'] || '');
      const phone = String(row['Phone'] || row['phone'] || '');

      if (!name || !email) {
        errors.push(`Row ${rowNumber}: Name and Email are required.`);
        continue;
      }

      const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (existing) {
        errors.push(`Row ${rowNumber}: Email "${email}" already registered.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const faculty = await User.create({
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        passwordHash: hashedPassword,
        role: 'FACULTY',
        batch: department.trim(),
        phone: phone.trim(),
        createdBy: req.user._id,
        isActive: true,
        isVerified: true,
      });

      createdFaculty.push(faculty.email);
    }

    res.status(200).json({
      success: true,
      message: `Processed ${sheetData.length} rows. Successfully imported ${createdFaculty.length} faculty accounts.`,
      data: {
        importedCount: createdFaculty.length,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
