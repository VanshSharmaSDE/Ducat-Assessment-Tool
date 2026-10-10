import { Router } from 'express';
import { ResultController } from '../controllers/resultController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

router.use(authenticateUser);

router.get('/', ResultController.getMyResults);
router.get('/:id', ResultController.getResultDetails);

export default router;
