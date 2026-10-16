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

      // Compute student count for each batch scoped to this batch
      const batchesWithCounts = await Promise.all(
        batches.map(async (batch) => {
          const studentFilter = {
            role: 'USER',
            $or: [
              { batchId: batch._id },
              { batch: batch.name, createdBy: batch.createdBy },
            ],
          };
          const studentCount = await User.countDocuments(studentFilter);

          return {
            ...batch.toObject(),
            studentCount,
            totalBatchStudents: studentCount,
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
      if (!isSuperAdmin && String(batch.createdBy?._id || batch.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied to this batch.' });
      }

      const studentFilter = {
        role: 'USER',
        $or: [
          { batchId: batch._id },
          { batch: batch.name, createdBy: batch.createdBy?._id || batch.createdBy },
        ],
      };

      const students = await User.find(studentFilter)
        .populate('createdBy', 'name email role')
        .select('name email rollNumber phone batch batchId gender isActive createdAt createdBy')
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
   * Create a new batch (scoped uniquely to creator)
   */
  static async createBatch(req, res, next) {
    try {
      const { name, description, department } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Batch name is required' });
      }

      const cleanName = name.trim();
      const escapedName = cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Uniqueness is scoped to the current user (faculty or admin)
      const existing = await Batch.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        createdBy: req.user._id,
      });
      if (existing) {
        return res.status(409).json({ success: false, message: `You already have a batch named "${cleanName}".` });
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
        const escapedName = cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const existing = await Batch.findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          createdBy: batch.createdBy,
          _id: { $ne: id },
        });
        if (existing) {
          return res.status(409).json({ success: false, message: `A batch named "${cleanName}" already exists for this creator.` });
        }
        batch.name = cleanName;

        // Synchronize only students assigned to this creator's batch
        await User.updateMany(
          {
            role: 'USER',
            $or: [
              { batchId: batch._id },
              { batch: oldName, createdBy: batch.createdBy },
            ],
          },
          { $set: { batch: cleanName, batchId: batch._id } }
        );
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

      // Detach only from users assigned to this creator's batch
      await User.updateMany(
        {
          role: 'USER',
          $or: [
            { batchId: batch._id },
            { batch: batch.name, createdBy: batch.createdBy },
          ],
        },
        { $set: { batch: '', batchId: null } }
      );
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
        // Faculty can only assign students they created or manage
        studentFilter.$or = [
          { createdBy: req.user._id },
          { assignedFaculties: req.user._id },
        ];
      }

      const result = await User.updateMany(studentFilter, {
        $set: { batch: batch.name, batchId: batch._id },
      });

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
      user.batchId = null;
      await user.save();

      res.status(200).json({
        success: true,
        message: `Removed ${user.name} from batch "${batch.name}".`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bulk delete batches
   */
  static async bulkDeleteBatches(req, res, next) {
    try {
      const { batchIds, ids } = req.body;
      const targetIds = batchIds || ids || [];
      if (!Array.isArray(targetIds) || !targetIds.length) {
        return res.status(400).json({ success: false, message: 'Please provide batch IDs to delete.' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      const filter = { _id: { $in: targetIds } };
      if (!isSuperAdmin) {
        filter.createdBy = req.user._id;
      }

      const batchesToDelete = await Batch.find(filter);
      for (const b of batchesToDelete) {
        await User.updateMany(
          {
            role: 'USER',
            $or: [
              { batchId: b._id },
              { batch: b.name, createdBy: b.createdBy },
            ],
          },
          { $set: { batch: '', batchId: null } }
        );
      }

      const result = await Batch.deleteMany(filter);

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} batch(es).`,
        data: { deletedCount: result.deletedCount },
      });
    } catch (err) {
      next(err);
    }
  }
}
