import { Batch } from '../models/Batch.js';
import { User } from '../models/User.js';

export class BatchController {
  /**
   * Get all batches
   * Admin sees all batches with creator info
   * Faculty sees batches created by them (or all with includeAll query)
   */
  static async getAllBatches(req, res, next) {
    try {
      const isSuperAdmin = req.user?.role === 'ADMIN';
      const filter = {};

      if (!isSuperAdmin && !req.query.all) {
        filter.createdBy = req.user._id;
      }

      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { department: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      const batches = await Batch.find(filter)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 });

      // Compute student count for each batch
      const batchesWithCounts = await Promise.all(
        batches.map(async (batch) => {
          const studentFilter = { role: 'USER', batch: batch.name };
          if (!isSuperAdmin) {
            // Count students in this batch created by this faculty
            studentFilter.createdBy = req.user._id;
          }
          const studentCount = await User.countDocuments(studentFilter);
          const totalBatchStudents = await User.countDocuments({ role: 'USER', batch: batch.name });

          return {
            ...batch.toObject(),
            studentCount,
            totalBatchStudents,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: { batches: batchesWithCounts },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get batch details by ID
   */
  static async getBatchById(req, res, next) {
    try {
      const { id } = req.params;
      const batch = await Batch.findById(id).populate('createdBy', 'name email role');
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      const studentFilter = { role: 'USER', batch: batch.name };
      if (!isSuperAdmin) {
        studentFilter.createdBy = req.user._id;
      }

      const students = await User.find(studentFilter)
        .populate('createdBy', 'name email role')
        .select('name email rollNumber phone batch gender isActive createdAt createdBy')
        .sort({ name: 1 });

      res.status(200).json({
        success: true,
        data: {
          batch: {
            ...batch.toObject(),
            students,
            studentCount: students.length,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new batch
   */
  static async createBatch(req, res, next) {
    try {
      const { name, description, department } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Batch name is required' });
      }

      const cleanName = name.trim();
      const existing = await Batch.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
      if (existing) {
        return res.status(409).json({ success: false, message: `Batch "${cleanName}" already exists.` });
      }

      const batch = await Batch.create({
        name: cleanName,
        description: description ? description.trim() : '',
        department: department ? department.trim() : '',
        createdBy: req.user._id,
      });

      const populated = await Batch.findById(batch._id).populate('createdBy', 'name email role');

      res.status(201).json({
        success: true,
        message: `Batch "${batch.name}" created successfully.`,
        data: {
          batch: {
            ...populated.toObject(),
            studentCount: 0,
            totalBatchStudents: 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update batch details
   */
  static async updateBatch(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, department, isActive } = req.body;

      const batch = await Batch.findById(id);
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      if (!isSuperAdmin && String(batch.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only update batches you created.' });
      }

      const oldName = batch.name;
      if (name && name.trim() && name.trim() !== oldName) {
        const cleanName = name.trim();
        const existing = await Batch.findOne({
          name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
          _id: { $ne: id },
        });
        if (existing) {
          return res.status(409).json({ success: false, message: `Batch "${cleanName}" already exists.` });
        }
        batch.name = cleanName;

        // Synchronize all assigned students to new batch name
        await User.updateMany({ batch: oldName }, { $set: { batch: cleanName } });
      }

      if (description !== undefined) batch.description = description.trim();
      if (department !== undefined) batch.department = department.trim();
      if (isActive !== undefined) batch.isActive = Boolean(isActive);

      await batch.save();
      const updated = await Batch.findById(id).populate('createdBy', 'name email role');

      res.status(200).json({
        success: true,
        message: 'Batch updated successfully',
        data: { batch: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete batch
   */
  static async deleteBatch(req, res, next) {
    try {
      const { id } = req.params;
      const batch = await Batch.findById(id);
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      if (!isSuperAdmin && String(batch.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only delete batches you created.' });
      }

      // Detach batch name from users who were assigned
      await User.updateMany({ batch: batch.name }, { $set: { batch: '' } });
      await Batch.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: `Batch "${batch.name}" deleted successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Add / Assign students to a batch
   */
  static async addStudentsToBatch(req, res, next) {
    try {
      const { id } = req.params;
      const { studentIds } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Please provide an array of studentIds to add.' });
      }

      const batch = await Batch.findById(id);
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      const studentFilter = { _id: { $in: studentIds }, role: 'USER' };
      if (!isSuperAdmin) {
        // Faculty can only assign students they created
        studentFilter.createdBy = req.user._id;
      }

      const result = await User.updateMany(studentFilter, { $set: { batch: batch.name } });

      res.status(200).json({
        success: true,
        message: `Added ${result.modifiedCount} student(s) to batch "${batch.name}".`,
        modifiedCount: result.modifiedCount,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove a student from a batch
   */
  static async removeStudentFromBatch(req, res, next) {
    try {
      const { id } = req.params;
      const { studentId } = req.body;

      if (!studentId) {
        return res.status(400).json({ success: false, message: 'studentId is required' });
      }

      const batch = await Batch.findById(id);
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      const user = await User.findById(studentId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      if (!isSuperAdmin && String(user.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only remove students you created.' });
      }

      user.batch = '';
      await user.save();

      res.status(200).json({
        success: true,
        message: `Removed ${user.name} from batch "${batch.name}".`,
      });
    } catch (err) {
      next(err);
    }
  }
}
