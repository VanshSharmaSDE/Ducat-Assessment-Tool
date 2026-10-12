import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export class OrganizationController {
  /**
   * Get all organizations
   * Returns organizations with computed facultyCount and studentCount
   */
  static async getAllOrganizations(req, res, next) {
    try {
      const isSuperAdmin = req.user?.role === 'ADMIN';
      const filter = {};

      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { code: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      if (req.query.status !== undefined && req.query.status !== '') {
        filter.isActive = req.query.status === 'active';
      }

      const organizations = await Organization.find(filter)
        .populate('createdBy', 'name email role')
        .sort({ name: 1 });

      // Compute faculty and student counts for each organization
      const organizationsWithCounts = await Promise.all(
        organizations.map(async (org) => {
          const [facultyCount, studentCount, activeStudentCount, batches] = await Promise.all([
            User.countDocuments({ role: 'FACULTY', organization: org.name }),
            User.countDocuments({ role: 'USER', organization: org.name }),
            User.countDocuments({ role: 'USER', organization: org.name, isActive: true }),
            User.distinct('batch', { role: 'USER', organization: org.name, batch: { $ne: '' } }),
          ]);

          return {
            ...org.toObject(),
            facultyCount,
            studentCount,
            activeStudentCount,
            batches: batches.filter(Boolean),
          };
        })
      );

      res.status(200).json({
        success: true,
        data: { organizations: organizationsWithCounts },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get organization by ID with enrolled faculty and students
   */
  static async getOrganizationById(req, res, next) {
    try {
      const { id } = req.params;
      const org = await Organization.findById(id).populate('createdBy', 'name email role');
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      const [faculties, students] = await Promise.all([
        User.find({ role: 'FACULTY', organization: org.name })
          .select('name email department phone isActive createdAt')
          .sort({ name: 1 }),
        User.find({ role: 'USER', organization: org.name })
          .select('name email rollNumber batch phone gender isActive createdAt')
          .sort({ name: 1 }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          organization: {
            ...org.toObject(),
            faculties,
            facultyCount: faculties.length,
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
   * Create organization (Admin only)
   */
  static async createOrganization(req, res, next) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only administrators can create organizations.' });
      }

      const { name, code, description, website } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Organization name is required.' });
      }

      const cleanName = name.trim();
      const existing = await Organization.findOne({
        name: { $regex: new RegExp(`^${cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      });
      if (existing) {
        return res.status(409).json({ success: false, message: `Organization "${cleanName}" already exists.` });
      }

      const org = await Organization.create({
        name: cleanName,
        code: code ? code.trim().toUpperCase() : '',
        description: description ? description.trim() : '',
        website: website ? website.trim() : '',
        createdBy: req.user._id,
      });

      const populated = await Organization.findById(org._id).populate('createdBy', 'name email role');

      res.status(201).json({
        success: true,
        message: `Organization "${org.name}" created successfully.`,
        data: {
          organization: {
            ...populated.toObject(),
            facultyCount: 0,
            studentCount: 0,
            activeStudentCount: 0,
            batches: [],
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update organization (Admin only)
   */
  static async updateOrganization(req, res, next) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only administrators can modify organizations.' });
      }

      const { id } = req.params;
      const { name, code, description, website, isActive } = req.body;

      const org = await Organization.findById(id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }

      const oldName = org.name;

      if (name && name.trim()) {
        const cleanName = name.trim();
        if (cleanName.toLowerCase() !== org.name.toLowerCase()) {
          const duplicate = await Organization.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
          });
          if (duplicate) {
            return res.status(409).json({ success: false, message: `An organization with name "${cleanName}" already exists.` });
          }
          org.name = cleanName;

          // Cascade name change to users belonging to this organization
          await User.updateMany({ organization: oldName }, { $set: { organization: cleanName } });
        }
      }

      if (code !== undefined) org.code = code ? code.trim().toUpperCase() : '';
      if (description !== undefined) org.description = description ? description.trim() : '';
      if (website !== undefined) org.website = website ? website.trim() : '';
      if (isActive !== undefined) org.isActive = Boolean(isActive);

      await org.save();
      const populated = await Organization.findById(org._id).populate('createdBy', 'name email role');

      res.status(200).json({
        success: true,
        message: 'Organization updated successfully.',
        data: { organization: populated },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete organization (Admin only)
   */
  static async deleteOrganization(req, res, next) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only administrators can delete organizations.' });
      }

      const { id } = req.params;
      const org = await Organization.findById(id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }

      await Organization.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: `Organization "${org.name}" deleted successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bulk delete organizations (Admin only)
   */
  static async bulkDeleteOrganizations(req, res, next) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only administrators can delete organizations.' });
      }

      const { orgIds, ids } = req.body;
      const targetIds = orgIds || ids || [];
      const validIds = targetIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (!validIds.length) {
        return res.status(400).json({ success: false, message: 'No valid organization IDs provided.' });
      }

      const result = await Organization.deleteMany({ _id: { $in: validIds } });

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} organization(s).`,
        data: { deletedCount: result.deletedCount },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default OrganizationController;
