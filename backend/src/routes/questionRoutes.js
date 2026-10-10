import { Router } from 'express';
import { QuestionController } from '../controllers/questionController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

router.use(authenticateUser);

router.get('/:id', QuestionController.getQuestionById);

export default router;
