import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../utils/starterCode.js';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  confirmPassword: z.string().min(6).max(100).optional(),
  phone: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  loginId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  facultyId: z.string().min(1).optional(),
  password: z.string().min(1),
}).refine((data) => data.identifier || data.email || data.loginId || data.studentId || data.facultyId, {
  message: "Student ID, Faculty ID, Admin ID, or Email is required",
  path: ["identifier"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export const examSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  instructions: z.string().optional(),
  duration: z.number().int().min(5).max(360),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  totalMarks: z.number().min(1),
  passingMarks: z.number().min(0),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  status: z.enum(['DRAFT', 'UPCOMING', 'ACTIVE', 'EXPIRED', 'COMPLETED', 'ARCHIVED']).optional(),
  isPublished: z.boolean().optional(),
  questions: z.array(
    z.object({
      questionId: z.string(),
      marks: z.number().min(1),
      order: z.number().optional(),
    })
  ).optional(),
  randomizeQuestions: z.boolean().optional(),
  maxViolations: z.number().int().min(1).max(20).optional(),
  allowCodeRun: z.boolean().optional(),
});

export const questionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  constraints: z.string().optional(),
  examples: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      explanation: z.string().optional(),
    })
  ).optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  marks: z.number().min(1).default(20),
  allowedLanguages: z.array(z.enum(SUPPORTED_LANGUAGES)).min(1).optional(),
  starterCode: z.record(z.string()).optional(),
  timeLimit: z.number().min(0.5).max(15).optional(),
  memoryLimit: z.number().min(32).max(1024).optional(),
  comparisonMode: z.enum(['EXACT', 'TRIMMED', 'WHITESPACE_INSENSITIVE']).optional(),
});

export const testCaseSchema = z.object({
  questionId: z.string().optional(),
  input: z.string().default(''),
  expectedOutput: z.string().min(1, 'Expected output is required'),
  isHidden: z.boolean().default(true),
  marks: z.number().min(0).default(5),
  timeLimit: z.number().nullable().optional(),
  memoryLimit: z.number().nullable().optional(),
  order: z.number().optional(),
});

export const submitExamSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      type: z.enum(['CODING', 'MCQ']).optional().default('CODING'),
      language: z.enum(SUPPORTED_LANGUAGES).optional().nullable(),
      code: z.string().max(65536, 'Code exceeds 64KB maximum size').optional().nullable().default(''),
      selectedOption: z.union([z.number(), z.string(), z.null()]).optional().nullable(),
    }).passthrough()
  ),
}).passthrough();

export const examEventSchema = z.object({
  type: z.enum(['tab_switch', 'fullscreen_exit', 'page_refresh', 'exam_exit', 'blur', 'copy_paste']),
  details: z.string().optional(),
});

export const runCustomCodeSchema = z.object({
  questionId: z.string().optional(),
  language: z.enum(SUPPORTED_LANGUAGES),
  sourceCode: z.string().max(65536, 'Code exceeds 64KB maximum size'),
  customInput: z.string().max(65536, 'Input exceeds 64KB maximum size').optional().default(''),
});
