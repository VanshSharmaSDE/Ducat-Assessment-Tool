import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema } from '../validators/index.js';

const router = Router();

router.use(authenticateUser);

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/theme', UserController.updateTheme);
router.put('/change-password', validate(changePasswordSchema), UserController.changePassword);

export default router;
