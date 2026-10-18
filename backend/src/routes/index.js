import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import examRoutes from './examRoutes.js';
import questionRoutes from './questionRoutes.js';
import resultRoutes from './resultRoutes.js';
import adminRoutes from './adminRoutes.js';
import supportRoutes from './supportRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CodeAssess API is healthy',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/exams', examRoutes);
router.use('/questions', questionRoutes);
router.use('/results', resultRoutes);
router.use('/admin', adminRoutes);
router.use('/faculty', adminRoutes);
router.use('/support', supportRoutes);

export default router;
