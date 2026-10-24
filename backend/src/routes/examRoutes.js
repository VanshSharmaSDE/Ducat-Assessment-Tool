import { Router } from 'express';
import { ExamController } from '../controllers/examController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { submitExamSchema, examEventSchema, runCustomCodeSchema } from '../validators/index.js';

const router = Router();

router.use(authenticateUser);

router.get('/', ExamController.getAvailableExams);
router.get('/practice', ExamController.getPracticeExams);
router.get('/:id', ExamController.getExamDetails);
router.post('/:id/start', ExamController.startExam);
router.post('/:id/event', validate(examEventSchema), ExamController.recordEvent);
router.post('/:id/run-code', validate(runCustomCodeSchema), ExamController.runCustomCode);
router.post('/:id/submit', validate(submitExamSchema), ExamController.submitExam);

export default router;
