import { Technology } from '../models/Technology.js';
import { Batch } from '../models/Batch.js';
import { User } from '../models/User.js';

export class TechnologyController {
  /**
   * Get all technologies
   * Filterable by organization & search
   */
  static async getAllTechnologies(req, res, next) {
    try {
      const isSuperAdmin = req.user?.role === 'ADMIN';
      const filter = {};

      if (!isSuperAdmin) {
        // Faculty is scoped to their active assigned organization
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

      if (req.query.search) {
        const s = req.query.search.trim();
        filter.$or = [
          { name: { $regex: s, $options: 'i' } },
          { description: { $regex: s, $options: 'i' } },
          { organization: { $regex: s, $options: 'i' } },
        ];
      }

      const technologies = await Technology.find(filter)
        .populate('createdBy', 'name email role')
        .sort({ name: 1 });

      // Compute batch count and student count for each technology
      const techsWithCounts = await Promise.all(
        technologies.map(async (tech) => {
          const batchCount = await Batch.countDocuments({
            technology: tech.name,
            organization: tech.organization,
          });

          const studentCount = await User.countDocuments({
            role: 'USER',
            technology: tech.name,
            organization: tech.organization,
          });

          return {
            ...tech.toObject(),
            batchCount,
            studentCount,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: { technologies: techsWithCounts },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get technology details by ID
   */
  static async getTechnologyById(req, res, next) {
    try {
      const { id } = req.params;
      const technology = await Technology.findById(id).populate('createdBy', 'name email role');
      if (!technology) {
        return res.status(404).json({ success: false, message: 'Technology not found' });
      }

      const batches = await Batch.find({
        technology: technology.name,
        organization: technology.organization,
      }).sort({ name: 1 });

      const studentCount = await User.countDocuments({
        role: 'USER',
        technology: technology.name,
        organization: technology.organization,
      });

      res.status(200).json({
        success: true,
        data: {
          technology: {
            ...technology.toObject(),
            batches,
            batchCount: batches.length,
            studentCount,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new technology under an organization
   */
  static async createTechnology(req, res, next) {
    try {
      const { name, organization, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Technology name is required.' });
      }

      let targetOrg = organization ? organization.trim() : '';
      if (req.user?.role === 'FACULTY') {
        if (!req.user.organization || !req.user.organization.trim()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You must be assigned to an organization before creating technologies.',
          });
        }
        targetOrg = req.user.organization.trim();
      }

      if (!targetOrg) {
        return res.status(400).json({ success: false, message: 'Organization is required for technology.' });
      }

      const cleanName = name.trim();
      const escapedName = cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedOrg = targetOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

      const existing = await Technology.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Technology "${cleanName}" already exists for organization "${targetOrg}".`,
        });
      }

      const tech = await Technology.create({
        name: cleanName,
        organization: targetOrg,
        description: description ? description.trim() : '',
        createdBy: req.user._id,
      });

      const populated = await Technology.findById(tech._id).populate('createdBy', 'name email role');

      res.status(201).json({
        success: true,
        message: `Technology "${cleanName}" created successfully for "${targetOrg}".`,
        data: {
          technology: {
            ...populated.toObject(),
            batchCount: 0,
            studentCount: 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update technology details
   */
  static async updateTechnology(req, res, next) {
    try {
      const { id } = req.params;
      const { name, organization, description, isActive } = req.body;

      const tech = await Technology.findById(id);
      if (!tech) {
        return res.status(404).json({ success: false, message: 'Technology not found.' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      if (!isSuperAdmin) {
        if (tech.organization.toLowerCase() !== (req.user?.organization || '').toLowerCase()) {
          return res.status(403).json({ success: false, message: 'Access denied. You can only manage technologies for your organization.' });
        }
      }

      const oldName = tech.name;
      const oldOrg = tech.organization;
      const newName = name && name.trim() ? name.trim() : oldName;
      const newOrg = isSuperAdmin && organization && organization.trim() ? organization.trim() : oldOrg;

      if (newName.toLowerCase() !== oldName.toLowerCase() || newOrg.toLowerCase() !== oldOrg.toLowerCase()) {
        const escapedName = newName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const escapedOrg = newOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const existing = await Technology.findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
          _id: { $ne: id },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: `Technology "${newName}" already exists for organization "${newOrg}".`,
          });
        }
      }

      tech.name = newName;
      tech.organization = newOrg;
      if (description !== undefined) tech.description = description ? description.trim() : '';
      if (isActive !== undefined) tech.isActive = Boolean(isActive);

      await tech.save();

      // Cascade update to batches and users if name or org changed
      if (oldName !== newName || oldOrg !== newOrg) {
        await Batch.updateMany(
          { technology: oldName, organization: oldOrg },
          { $set: { technology: newName, organization: newOrg } }
        );
        await User.updateMany(
          { role: 'USER', technology: oldName, organization: oldOrg },
          { $set: { technology: newName, organization: newOrg } }
        );
      }

      const populated = await Technology.findById(tech._id).populate('createdBy', 'name email role');

      res.status(200).json({
        success: true,
        message: 'Technology updated successfully.',
        data: { technology: populated },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete technology
   */
  static async deleteTechnology(req, res, next) {
    try {
      const { id } = req.params;
      const tech = await Technology.findById(id);
      if (!tech) {
        return res.status(404).json({ success: false, message: 'Technology not found.' });
      }

      const isSuperAdmin = req.user?.role === 'ADMIN';
      if (!isSuperAdmin) {
        if (tech.organization.toLowerCase() !== (req.user?.organization || '').toLowerCase()) {
          return res.status(403).json({ success: false, message: 'Access denied.' });
        }
      }

      await Technology.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: `Technology "${tech.name}" deleted successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bulk delete technologies
   */
  static async bulkDeleteTechnologies(req, res, next) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No technology IDs provided.' });
      }

      const filter = { _id: { $in: ids } };
      if (req.user?.role !== 'ADMIN') {
        filter.organization = req.user?.organization || '__NONE__';
      }

      const result = await Technology.deleteMany(filter);

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} technologies.`,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default TechnologyController;
