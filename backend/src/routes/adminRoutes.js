import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { QuestionController } from '../controllers/questionController.js';
import { TestCaseController } from '../controllers/testCaseController.js';
import { ExamController } from '../controllers/examController.js';
import { ResultController } from '../controllers/resultController.js';
import { BatchController } from '../controllers/batchController.js';
import { authenticateUser, requireAdmin, requireAdminOrFaculty } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  examSchema,
  questionSchema,
  testCaseSchema,
} from '../validators/index.js';
import multer from 'multer';
import { 
  createStudent, 
  updateStudent,
  uploadStudentsExcel, 
  exportResultsExcel,
  exportSubmissionsDocx,
  getSubmissionsHierarchyExams,
  getExamStudents,
  getStudentSubmissions,
  getFacultyList,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  downloadFacultyTemplate,
  uploadFacultyExcel,
} from '../controllers/adminController.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Enforce authentication & ADMIN or FACULTY role for operational assessment routes
router.use(authenticateUser, requireAdminOrFaculty);

// Analytics
router.get('/analytics', AdminController.getAnalytics);

// User / Student Management
router.get('/users', AdminController.getUsers);
router.put('/users/:id/toggle-status', AdminController.toggleUserStatus);
router.delete('/users/:id', AdminController.deleteUser);
router.put('/students/:id', updateStudent);
router.post('/students/create', createStudent);
router.post('/students/upload-excel', upload.single('file'), uploadStudentsExcel);

// Dedicated Batch Management (Admin & Faculty)
router.get('/batches', BatchController.getAllBatches);
router.get('/batches/:id', BatchController.getBatchById);
router.post('/batches', BatchController.createBatch);
router.put('/batches/:id', BatchController.updateBatch);
router.delete('/batches/:id', BatchController.deleteBatch);
router.post('/batches/:id/students', BatchController.addStudentsToBatch);
router.post('/batches/:id/remove-student', BatchController.removeStudentFromBatch);

// Dedicated Faculty Management (ADMIN ONLY)
router.get('/faculty', requireAdmin, getFacultyList);
router.post('/faculty', requireAdmin, createFaculty);
router.put('/faculty/:id', requireAdmin, updateFaculty);
router.delete('/faculty/:id', requireAdmin, deleteFaculty);
router.get('/faculty/template-excel', requireAdmin, downloadFacultyTemplate);
router.post('/faculty/upload-excel', requireAdmin, upload.single('file'), uploadFacultyExcel);

// Exam Management
router.get('/exams', AdminController.getAllExams);
router.get('/exams/:id', ExamController.getExamDetails);
router.post('/exams', validate(examSchema), AdminController.createExam);
router.put('/exams/:id', validate(examSchema.partial()), AdminController.updateExam);
router.delete('/exams/:id', AdminController.deleteExam);
router.post('/exams/:id/duplicate', AdminController.duplicateExam);
router.put('/exams/:id/reorder', AdminController.reorderQuestions);
router.get('/exams/:id/export-excel', exportResultsExcel);

// Question Management
router.get('/questions', QuestionController.getAllQuestions);
router.get('/questions/template-excel', QuestionController.downloadQuestionTemplate);
router.post('/questions/upload-excel', upload.single('file'), QuestionController.uploadQuestionsExcel);
router.get('/questions/:id', QuestionController.getQuestionById);
router.post('/questions', validate(questionSchema), QuestionController.createQuestion);
router.put('/questions/:id', validate(questionSchema.partial()), QuestionController.updateQuestion);
router.delete('/questions/:id', QuestionController.deleteQuestion);
router.post('/questions/:id/duplicate', QuestionController.duplicateQuestion);

// Test Case Management
router.get('/questions/:questionId/testcases', TestCaseController.getTestCasesByQuestion);
router.post('/questions/:questionId/testcases', validate(testCaseSchema), TestCaseController.addTestCase);
router.put('/testcases/:id', validate(testCaseSchema.partial()), TestCaseController.updateTestCase);
router.delete('/testcases/:id', TestCaseController.deleteTestCase);

// Results & Submissions
router.get('/results', AdminController.getAllResults);
router.get('/results/:id', ResultController.getResultDetails);
router.get('/submissions', AdminController.getAllSubmissions);
router.get('/submissions/export-docx', exportSubmissionsDocx);
router.get('/submissions/hierarchy/exams', getSubmissionsHierarchyExams);
router.get('/submissions/hierarchy/exams/:examId/students', getExamStudents);
router.get('/submissions/hierarchy/exams/:examId/students/:userId', getStudentSubmissions);
router.get('/results/export-excel', exportResultsExcel);

export default router;
