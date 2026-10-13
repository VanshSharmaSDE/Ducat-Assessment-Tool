import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export class OrganizationController {
  /**
   * Get all organizations
   * Returns organizations with computed facultyCount and studentCount
   */
  /**
   * Get all organizations
   * Returns organizations with computed facultyCount and studentCount
   */
  static async getAllOrganizations(req, res, next) {
    try {
      const isSuperAdmin = req.user?.role === 'ADMIN';
      const isFaculty = req.user?.role === 'FACULTY';
      const filter = {};

      // If user is FACULTY, strictly filter to their own assigned organization
      if (isFaculty) {
        if (req.user?.organization && req.user.organization.trim()) {
          const escapedOrg = req.user.organization.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          filter.name = { $regex: new RegExp(`^${escapedOrg}$`, 'i') };
        } else {
          // Faculty is not assigned to any organization -> return empty list
          return res.status(200).json({
            success: true,
            data: { organizations: [] },
          });
        }
      }

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
          const orgRegex = new RegExp(`^${org.name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
          const [facultyCount, studentCount, activeStudentCount, batches] = await Promise.all([
            User.countDocuments({ role: 'FACULTY', organization: orgRegex }),
            User.countDocuments({ role: 'USER', organization: orgRegex }),
            User.countDocuments({ role: 'USER', organization: orgRegex, isActive: true }),
            User.distinct('batch', { role: 'USER', organization: orgRegex, batch: { $ne: '' } }),
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

      const orgRegex = new RegExp(`^${org.name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
      const [faculties, students] = await Promise.all([
        User.find({ role: 'FACULTY', organization: orgRegex })
          .select('name email batch phone isActive createdAt')
          .sort({ name: 1 }),
        User.find({ role: 'USER', organization: orgRegex })
          .select('name email rollNumber batch phone gender isActive createdAt')
          .sort({ name: 1 }),
      ]);

      const formattedFaculties = faculties.map((f) => ({
        ...f.toObject(),
        department: f.batch || 'General',
      }));

      res.status(200).json({
        success: true,
        data: {
          organization: {
            ...org.toObject(),
            faculties: formattedFaculties,
            facultyCount: formattedFaculties.length,
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

      const orgRegex = new RegExp(`^${org.name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
      // Detach users who belonged to this organization
      await User.updateMany({ organization: orgRegex }, { $set: { organization: '' } });

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

      const orgsToDelete = await Organization.find({ _id: { $in: validIds } }).select('name');
      const orgNames = orgsToDelete.map((o) => o.name);

      if (orgNames.length > 0) {
        await User.updateMany({ organization: { $in: orgNames } }, { $set: { organization: '' } });
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

  /**
   * Add / Assign Faculty to Organization (Admin only)
   */
  static async addFacultyToOrganization(req, res, next) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only administrators can assign faculty to organizations.' });
      }

      const { id } = req.params;
      const { facultyIds, facultyId } = req.body;
      const targets = facultyIds || (facultyId ? [facultyId] : []);

      if (!Array.isArray(targets) || targets.length === 0) {
        return res.status(400).json({ success: false, message: 'Please provide at least one faculty member ID to assign.' });
      }

      const org = await Organization.findById(id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }

      const result = await User.updateMany(
        { _id: { $in: targets }, role: 'FACULTY' },
        { $set: { organization: org.name } }
      );

      res.status(200).json({
        success: true,
        message: `Assigned ${result.modifiedCount} faculty member(s) to "${org.name}".`,
        modifiedCount: result.modifiedCount,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove Faculty from Organization (Admin only)
   */
  static async removeFacultyFromOrganization(req, res, next) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only administrators can remove faculty from organizations.' });
      }

      const { id } = req.params;
      const { facultyId } = req.body;

      if (!facultyId) {
        return res.status(400).json({ success: false, message: 'facultyId is required.' });
      }

      const org = await Organization.findById(id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }

      const faculty = await User.findOne({ _id: facultyId, role: 'FACULTY' });
      if (!faculty) {
        return res.status(404).json({ success: false, message: 'Faculty member not found.' });
      }

      faculty.organization = '';
      await faculty.save();

      res.status(200).json({
        success: true,
        message: `Removed ${faculty.name} from "${org.name}".`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Faculty available to be assigned to this Organization (Admin only)
   */
  static async getAvailableFaculty(req, res, next) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only administrators can view available faculty.' });
      }

      const { id } = req.params;
      const org = await Organization.findById(id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }

      const orgRegex = new RegExp(`^${org.name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');

      // Faculty who are NOT currently assigned to this organization
      const faculty = await User.find({
        role: 'FACULTY',
        organization: { $not: orgRegex },
      })
        .select('name email batch organization phone isActive')
        .sort({ name: 1 });

      const formatted = faculty.map((f) => ({
        _id: f._id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        department: f.batch || 'General',
        currentOrganization: f.organization || 'None (Unassigned)',
        isActive: f.isActive,
      }));

      res.status(200).json({
        success: true,
        data: { faculty: formatted },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default OrganizationController;
