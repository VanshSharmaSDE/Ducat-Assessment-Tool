import { Batch } from '../models/Batch.js';
import { User } from '../models/User.js';

export class BatchController {
  /**
   * Get all batches
   * Supports filtering by organization, technology, and search term
   */
  static async getAllBatches(req, res, next) {
    try {
      const isSuperAdmin = req.user?.role === 'ADMIN';
      const filter = {};

      if (!isSuperAdmin) {
        // Faculty is scoped to their organization or created batches
        if (req.user?.organization && req.user.organization.trim()) {
          const escapedOrg = req.user.organization.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          filter.organization = { $regex: new RegExp(`^${escapedOrg}$`, 'i') };
        } else {
          filter.createdBy = req.user._id;
        }
      } else if (req.query.organization && req.query.organization !== '__ALL__') {
        const escapedOrg = req.query.organization.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        filter.organization = { $regex: new RegExp(`^${escapedOrg}$`, 'i') };
      }

      if (req.query.technology && req.query.technology !== '__ALL__') {
        const escapedTech = req.query.technology.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        filter.technology = { $regex: new RegExp(`^${escapedTech}$`, 'i') };
      }

      if (req.query.search) {
        const s = req.query.search.trim();
        filter.$or = [
          { name: { $regex: s, $options: 'i' } },
          { technology: { $regex: s, $options: 'i' } },
          { organization: { $regex: s, $options: 'i' } },
          { department: { $regex: s, $options: 'i' } },
          { description: { $regex: s, $options: 'i' } },
        ];
      }

      const batches = await Batch.find(filter)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 });

      // Compute student count for each batch scoped to organization, technology, and batch name
      const batchesWithCounts = await Promise.all(
        batches.map(async (batch) => {
          const studentFilter = {
            role: 'USER',
            $or: [
              { batchId: batch._id },
              {
                batch: batch.name,
                technology: batch.technology,
                organization: batch.organization,
              },
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
      if (!isSuperAdmin) {
        const userOrg = (req.user?.organization || '').toLowerCase();
        const batchOrg = (batch.organization || '').toLowerCase();
        if (userOrg && batchOrg && userOrg !== batchOrg && String(batch.createdBy?._id || batch.createdBy) !== String(req.user._id)) {
          return res.status(403).json({ success: false, message: 'Access denied to this batch.' });
        }
      }

      const studentFilter = {
        role: 'USER',
        $or: [
          { batchId: batch._id },
          {
            batch: batch.name,
            technology: batch.technology,
            organization: batch.organization,
          },
        ],
      };

      const students = await User.find(studentFilter)
        .populate('createdBy', 'name email role')
        .select('name email rollNumber phone batch technology organization batchId gender isActive createdAt createdBy')
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
   * Create a new batch (scoped to technology, organization, and creator)
   */
  static async createBatch(req, res, next) {
    try {
      const { name, technology, organization, description, department } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Batch name is required.' });
      }
      if (!technology || !technology.trim()) {
        return res.status(400).json({ success: false, message: 'Technology is required for batch.' });
      }

      let targetOrg = organization ? organization.trim() : '';
      if (req.user?.role === 'FACULTY') {
        if (!req.user.organization || !req.user.organization.trim()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You must be assigned to an organization before creating batches.',
          });
        }
        targetOrg = req.user.organization.trim();
      }

      if (!targetOrg) {
        return res.status(400).json({ success: false, message: 'Organization is required for batch.' });
      }

      const cleanName = name.trim();
      const cleanTech = technology.trim();
      const escapedName = cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedTech = cleanTech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedOrg = targetOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

      // Uniqueness is scoped to (name, technology, organization, createdBy)
      const existing = await Batch.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        technology: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
        organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
        createdBy: req.user._id,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `You already have a batch named "${cleanName}" under technology "${cleanTech}" in "${targetOrg}".`,
        });
      }

      const batch = await Batch.create({
        name: cleanName,
        technology: cleanTech,
        organization: targetOrg,
        description: description ? description.trim() : '',
        department: department ? department.trim() : '',
        createdBy: req.user._id,
      });

      const populated = await Batch.findById(batch._id).populate('createdBy', 'name email role');

      res.status(201).json({
        success: true,
        message: `Batch "${batch.name}" created successfully under "${cleanTech}".`,
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
      const { name, technology, organization, description, department, isActive } = req.body;

      const batch = await Batch.findById(id);
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      if (!isSuperAdmin && String(batch.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only update batches you created.' });
      }

      const oldName = batch.name;
      const oldTech = batch.technology;
      const oldOrg = batch.organization;
      const newName = name && name.trim() ? name.trim() : oldName;
      const newTech = technology && technology.trim() ? technology.trim() : oldTech;
      const newOrg = isSuperAdmin && organization && organization.trim() ? organization.trim() : oldOrg;

      if (
        newName.toLowerCase() !== oldName.toLowerCase() ||
        newTech.toLowerCase() !== oldTech.toLowerCase() ||
        newOrg.toLowerCase() !== oldOrg.toLowerCase()
      ) {
        const escapedName = newName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const escapedTech = newTech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const escapedOrg = newOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const existing = await Batch.findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          technology: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
          organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
          createdBy: batch.createdBy,
          _id: { $ne: id },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: `A batch named "${newName}" already exists under "${newTech}" in this organization.`,
          });
        }

        // Synchronize students assigned to this batch
        await User.updateMany(
          {
            role: 'USER',
            $or: [
              { batchId: batch._id },
              { batch: oldName, technology: oldTech, organization: oldOrg },
            ],
          },
          { $set: { batch: newName, technology: newTech, organization: newOrg, batchId: batch._id } }
        );
      }

      batch.name = newName;
      batch.technology = newTech;
      batch.organization = newOrg;
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
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      if (!isSuperAdmin && String(batch.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only delete batches you created.' });
      }

      await User.updateMany(
        {
          role: 'USER',
          $or: [
            { batchId: batch._id },
            { batch: batch.name, technology: batch.technology, organization: batch.organization },
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
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      const studentFilter = { _id: { $in: studentIds }, role: 'USER' };
      if (!isSuperAdmin) {
        studentFilter.$or = [
          { createdBy: req.user._id },
          { assignedFaculties: req.user._id },
        ];
      }

      const result = await User.updateMany(studentFilter, {
        $set: {
          batch: batch.name,
          technology: batch.technology,
          organization: batch.organization,
          batchId: batch._id,
        },
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
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      const user = await User.findById(studentId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      if (!isSuperAdmin && String(user.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
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
              { batch: b.name, technology: b.technology, organization: b.organization },
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

export default BatchController;
