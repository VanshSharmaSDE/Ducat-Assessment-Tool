import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema } from '../validators/index.js';
import { uploadProfilePicture } from '../middleware/upload.js';

const router = Router();

router.use(authenticateUser);

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);

// Profile Picture Endpoints (Upload/Update & Delete)
router.post(
  '/profile/picture',
  (req, res, next) => {
    uploadProfilePicture.single('profilePicture')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
      }
      next();
    });
  },
  UserController.uploadProfilePicture
);
router.delete('/profile/picture', UserController.deleteProfilePicture);

router.put('/theme', UserController.updateTheme);
router.put('/change-password', validate(changePasswordSchema), UserController.changePassword);

export default router;
