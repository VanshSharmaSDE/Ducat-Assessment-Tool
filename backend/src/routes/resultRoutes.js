import { Router } from 'express';
import { ResultController } from '../controllers/resultController.js';
import { AiController } from '../controllers/aiController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

router.use(authenticateUser);

router.get('/', ResultController.getMyResults);
router.get('/:id', ResultController.getResultDetails);
router.post('/:id/ai-analysis', AiController.analyzeCandidateResult);

export default router;
