import { AdminService } from '../services/adminService.js';
import { ResultService } from '../services/resultService.js';
import { Submission } from '../models/Submission.js';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import User from '../models/User.js';
import ExamAttempt from '../models/ExamAttempt.js';
import { Exam } from '../models/Exam.js';
import { Batch } from '../models/Batch.js';
import { Organization } from '../models/Organization.js';
import { Technology } from '../models/Technology.js';

/**
 * 1. Manually Create a Single Student
 */
export const createStudent = async (req, res) => {
  try {
    const { name, email, studentId, rollNumber, password, phone, batch, technology, organization, gender, age } = req.body;
    const finalStudentId = (studentId || rollNumber || '').trim();

    if (!name || !name.trim() || !finalStudentId || !password) {
      return res.status(400).json({ success: false, message: 'Student ID, Name, and password are required' });
    }

    const cleanTech = technology ? String(technology).trim() : '';
    const cleanBatch = batch ? String(batch).trim() : '';

    if (!cleanTech) {
      return res.status(400).json({ success: false, message: 'Technology is mandatory for students.' });
    }
    if (!cleanBatch) {
      return res.status(400).json({ success: false, message: 'Batch is mandatory for students.' });
    }

    // Role check: Faculty must belong to an organization and can only create students in their organization
    let studentOrg = organization ? String(organization).trim() : '';
    if (req.user?.role === 'FACULTY') {
      if (!req.user.organization || !req.user.organization.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must be assigned to an organization by an administrator before adding candidates.',
        });
      }
      studentOrg = req.user.organization.trim();
    }

    if (!studentOrg) {
      return res.status(400).json({ success: false, message: 'Organization is mandatory for students.' });
    }

    // Check existing student by Student ID / Roll Number
    const existingById = await User.findOne({
      $or: [
        { studentId: { $regex: new RegExp(`^${finalStudentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { rollNumber: { $regex: new RegExp(`^${finalStudentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      ],
    });
    if (existingById) {
      return res.status(409).json({ success: false, message: `A student with Student ID "${finalStudentId}" already exists.` });
    }

    const cleanEmail = email && String(email).trim() ? String(email).toLowerCase().trim() : undefined;
    if (cleanEmail) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'A user with this email already exists' });
      }
    }

    // 1. Verify organization exists in the system
    const escapedOrg = studentOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const orgDoc = await Organization.findOne({
      name: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
    });
    if (!orgDoc) {
      return res.status(400).json({
        success: false,
        message: `Organization "${studentOrg}" does not exist in the system. Please create the organization first.`,
      });
    }
    const finalOrg = orgDoc.name;

    // 2. Verify technology exists under that organization
    const escapedTech = cleanTech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const techDoc = await Technology.findOne({
      name: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
      organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
    });
    if (!techDoc) {
      return res.status(400).json({
        success: false,
        message: `Technology "${cleanTech}" does not exist under organization "${finalOrg}". Please create this technology first.`,
      });
    }
    const finalTech = techDoc.name;

    // 3. Verify batch exists under that technology and organization
    const escapedBatch = cleanBatch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const batchDoc = await Batch.findOne({
      name: { $regex: new RegExp(`^${escapedBatch}$`, 'i') },
      technology: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
      organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
    });
    if (!batchDoc) {
      return res.status(400).json({
        success: false,
        message: `Batch "${cleanBatch}" does not exist under technology "${finalTech}" in organization "${finalOrg}". Please create this batch first.`,
      });
    }
    const finalBatch = batchDoc.name;

    const hashedPassword = await bcrypt.hash(password, 10);
    const studentPayload = {
      name: name.trim(),
      studentId: finalStudentId,
      rollNumber: finalStudentId,
      passwordHash: hashedPassword,
      plainPassword: password,
      role: 'USER',
      phone: phone ? String(phone).trim() : '',
      technology: finalTech,
      batch: finalBatch,
      batchId: batchDoc._id,
      organization: finalOrg,
      gender: gender ? String(gender).trim() : '',
      age: age ? Number(age) : null,
      createdBy: req.user._id,
      assignedFaculties: req.user?.role === 'FACULTY' ? [req.user._id] : [],
      isActive: true,
      isVerified: true,
    };
    if (cleanEmail) {
      studentPayload.email = cleanEmail;
    }
    const newStudent = await User.create(studentPayload);

    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        id: newStudent._id,
        _id: newStudent._id,
        name: newStudent.name,
        studentId: newStudent.studentId,
        rollNumber: newStudent.rollNumber,
        email: newStudent.email || '',
        technology: newStudent.technology,
        batch: newStudent.batch,
        organization: newStudent.organization,
        gender: newStudent.gender,
        plainPassword: newStudent.plainPassword || password,
        createdBy: req.user._id,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Bulk Upload Students via Excel
 */
export const uploadStudentsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx or .xls) file' });
    }

    // Role check: Faculty must be assigned to an organization before uploading
    if (req.user?.role === 'FACULTY') {
      if (!req.user.organization || !req.user.organization.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must be assigned to an organization by an administrator before uploading candidates.',
        });
      }
    }

    // Parse Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty' });
    }

    const createdUsers = [];
    const updatedUsers = [];
    const errors = [];

    for (let index = 0; index < sheetData.length; index++) {
      const row = sheetData[index];
      const rowNumber = index + 2; // Accounting for 1-based index and header row

      const name = row['Full Name *'] || row['Full Name'] || row['name'] || row['Name'] || row['FULL NAME'] || row['Student Name'];
      const rawStudentId = row['Student ID *'] || row['Student ID'] || row['studentId'] || row['StudentID'] || row['Roll Number *'] || row['Roll Number'] || row['rollNumber'] || row['Roll'] || row['ID'] || row['id'];
      const email = row['Email'] || row['email'];
      const password = String(row['Password'] || row['password'] || 'Student@123');
      const phone = String(row['Phone'] || row['phone'] || '');
      const rawTech = String(row['Technology *'] || row['Technology'] || row['technology'] || row['Technologies'] || row['technologies'] || '').trim();
      const rawBatch = String(row['Batch *'] || row['Batch'] || row['batch'] || '').trim();
      const rawOrg = String(row['Organization *'] || row['Organization'] || row['organization'] || row['Organisation'] || row['organisation'] || '').trim();
      const gender = String(row['Gender'] || row['gender'] || '');
      const rawAge = row['Age'] || row['age'];
      const age = rawAge ? Number(rawAge) : null;

      const studentId = rawStudentId ? String(rawStudentId).trim() : '';

      if (!name || !studentId) {
        errors.push(`Row ${rowNumber}: Full Name and Student ID are required.`);
        continue;
      }

      if (!rawTech) {
        errors.push(`Row ${rowNumber}: Technology is mandatory for students.`);
        continue;
      }

      if (!rawBatch) {
        errors.push(`Row ${rowNumber}: Batch is mandatory for students.`);
        continue;
      }

      // Enforce organization attribution
      let effectiveOrg = rawOrg;
      if (req.user?.role === 'FACULTY') {
        const facultyOrg = req.user.organization ? req.user.organization.trim() : '';
        if (rawOrg && facultyOrg && rawOrg.toLowerCase().trim() !== facultyOrg.toLowerCase()) {
          errors.push(
            `Row ${rowNumber}: Permission denied. You belong to organization "${facultyOrg}" and cannot upload students for "${rawOrg}".`
          );
          continue;
        }
        effectiveOrg = facultyOrg;
      }

      if (!effectiveOrg) {
        errors.push(`Row ${rowNumber}: Organization is mandatory for students.`);
        continue;
      }

      // Verify Organization exists in the system
      const escapedOrg = effectiveOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const orgDoc = await Organization.findOne({
        name: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!orgDoc) {
        errors.push(
          `Row ${rowNumber}: Organization "${effectiveOrg}" does not exist in the system. Please create the organization first.`
        );
        continue;
      }
      const finalOrg = orgDoc.name;

      // Verify Technology exists under that organization
      const escapedTech = rawTech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const techDoc = await Technology.findOne({
        name: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
        organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!techDoc) {
        errors.push(
          `Row ${rowNumber}: Technology "${rawTech}" does not exist under organization "${finalOrg}". Please create this technology first.`
        );
        continue;
      }
      const finalTech = techDoc.name;

      // Verify Batch exists under that technology and organization
      const escapedBatch = rawBatch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const batchDoc = await Batch.findOne({
        name: { $regex: new RegExp(`^${escapedBatch}$`, 'i') },
        technology: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
        organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!batchDoc) {
        errors.push(
          `Row ${rowNumber}: Batch "${rawBatch}" does not exist under technology "${finalTech}" in organization "${finalOrg}". Please create this batch first.`
        );
        continue;
      }
      const finalBatch = batchDoc.name;
      const finalBatchId = batchDoc._id;

      const cleanEmail = email && String(email).trim() ? String(email).toLowerCase().trim() : undefined;

      // Find existing student by Student ID (or by email if provided)
      const escapedId = studentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let existing = await User.findOne({
        $or: [
          { studentId: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
          { rollNumber: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      });

      if (existing) {
        if (existing.role !== 'USER') {
          errors.push(`Row ${rowNumber}: Student ID "${studentId}" belongs to an administrative account and cannot be modified.`);
          continue;
        }

        // If uploaded by faculty: cannot import or take over students belonging to a different organization
        if (req.user?.role === 'FACULTY') {
          if (
            existing.organization &&
            existing.organization.trim().toLowerCase() !== req.user.organization.trim().toLowerCase()
          ) {
            errors.push(
              `Row ${rowNumber}: Student "${studentId}" belongs to organization "${existing.organization}". You can only import students for your current active organization ("${req.user.organization}").`
            );
            continue;
          }
        }

        // Update existing student profile information
        if (name) existing.name = String(name).trim();
        existing.studentId = studentId;
        existing.rollNumber = studentId;
        if (cleanEmail) existing.email = cleanEmail;
        if (phone) existing.phone = phone.trim();
        existing.technology = finalTech;
        existing.batch = finalBatch;
        existing.batchId = finalBatchId;
        existing.organization = finalOrg;
        if (gender) existing.gender = gender.trim();
        if (age !== null && !isNaN(age)) existing.age = age;
        if (row['Password'] || row['password']) {
          existing.passwordHash = await bcrypt.hash(password, 10);
          existing.plainPassword = password;
        } else if (!existing.plainPassword) {
          existing.plainPassword = 'Student@123';
        }

        // If uploaded by faculty who is not the creator, link to assignedFaculties
        if (req.user?.role === 'FACULTY') {
          if (!existing.assignedFaculties) existing.assignedFaculties = [];
          if (!existing.assignedFaculties.some((f) => String(f) === String(req.user._id))) {
            existing.assignedFaculties.push(req.user._id);
          }
        }

        await existing.save();
        updatedUsers.push(existing.studentId || existing.name);
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const studentPayload = {
        name: String(name).trim(),
        studentId,
        rollNumber: studentId,
        passwordHash: hashedPassword,
        plainPassword: password,
        role: 'USER',
        phone: phone.trim(),
        technology: finalTech,
        batch: finalBatch,
        batchId: finalBatchId,
        organization: finalOrg,
        gender: gender.trim(),
        age: age,
        createdBy: req.user._id,
        assignedFaculties: req.user?.role === 'FACULTY' ? [req.user._id] : [],
        isActive: true,
        isVerified: true,
      };
      if (cleanEmail) {
        studentPayload.email = cleanEmail;
      }
      const student = await User.create(studentPayload);

      createdUsers.push(student.studentId || student.name);
    }

    const message = updatedUsers.length > 0
      ? `Imported ${createdUsers.length} new student(s) and updated ${updatedUsers.length} profile(s).`
      : `Imported ${createdUsers.length} student(s) successfully.`;

    return res.status(200).json({
      success: true,
      message,
      importedCount: createdUsers.length,
      updatedCount: updatedUsers.length,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Download Student Sample Template Excel
 */
export const downloadStudentTemplate = async (req, res) => {
  try {
    const sampleData = [
      {
        'Student ID *': 'STU2026001',
        'Full Name *': 'Amit Verma',
        'Organization *': 'Shape My Skills',
        'Technology *': 'Java Full Stack',
        'Batch *': 'Batch-1',
        'Password': 'Student@123',
        'Email': 'amit.verma@example.com',
        'Phone': '9876543210',
        'Gender': 'Male',
        'Age': 21,
      },
      {
        'Student ID *': 'STU2026002',
        'Full Name *': 'Sneha Rao',
        'Organization *': 'Shape My Skills',
        'Technology *': 'Python Development',
        'Batch *': 'Morning Batch',
        'Password': 'Student@123',
        'Email': '', // Optional
        'Phone': '9876543211',
        'Gender': 'Female',
        'Age': 20,
      },
    ];

    const guidelines = [
      { 'Field Name': 'Student ID *', 'Status': 'MANDATORY (*)', 'Description': 'Unique Student ID or Roll Number (e.g. STU2026001)' },
      { 'Field Name': 'Full Name *', 'Status': 'MANDATORY (*)', 'Description': 'Full candidate legal or official name' },
      { 'Field Name': 'Organization *', 'Status': 'MANDATORY (*)', 'Description': 'Must be an existing Organization created in the system (Faculty can only upload for their own assigned organization)' },
      { 'Field Name': 'Technology *', 'Status': 'MANDATORY (*)', 'Description': 'Must be an existing Technology created under the specified Organization' },
      { 'Field Name': 'Batch *', 'Status': 'MANDATORY (*)', 'Description': 'Must be an existing Batch created under the specified Technology & Organization' },
      { 'Field Name': 'Password', 'Status': 'OPTIONAL', 'Description': 'Candidate initial login password (defaults to Student@123 if omitted)' },
      { 'Field Name': 'Email', 'Status': 'OPTIONAL', 'Description': 'Candidate email address (optional, must be unique across system if provided)' },
      { 'Field Name': 'Phone', 'Status': 'OPTIONAL', 'Description': 'Candidate contact mobile / telephone number' },
      { 'Field Name': 'Gender', 'Status': 'OPTIONAL', 'Description': 'Candidate gender (e.g. Male, Female, Other)' },
      { 'Field Name': 'Age', 'Status': 'OPTIONAL', 'Description': 'Candidate age in numeric years (e.g. 21)' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const wsGuidelines = XLSX.utils.json_to_sheet(guidelines);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');
    XLSX.utils.book_append_sheet(workbook, wsGuidelines, 'Guidelines');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="students_upload_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate Share Link / Token for Organization Students
 */
export const generateStudentShareToken = async (req, res) => {
  try {
    const { organization, batches } = req.body;
    if (!organization) {
      return res.status(400).json({ success: false, message: 'Organization is required to share students' });
    }

    // Role check: Faculty can ONLY share students from their own assigned organization
    if (req.user.role === 'FACULTY') {
      if (!req.user.organization || !req.user.organization.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not currently assigned to an organization by an administrator.',
        });
      }
      if (req.user.organization.trim().toLowerCase() !== organization.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only share students from your assigned organization ("${req.user.organization}").`,
        });
      }
    }

    const filter = {
      role: 'USER',
      organization: { $regex: new RegExp(`^${organization.trim()}$`, 'i') },
    };
    if (req.user.role === 'FACULTY') {
      filter.$or = [
        { createdBy: req.user._id },
        { assignedFaculties: req.user._id },
      ];
    }
    if (batches && Array.isArray(batches) && batches.length > 0) {
      filter.batch = { $in: batches };
    }

    const count = await User.countDocuments(filter);
    if (count === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students found in the selected organization and batches to share.',
      });
    }

    const token = jwt.sign(
      {
        shareType: 'STUDENT_ORG_SHARE',
        organization: organization.trim(),
        batches: batches || [],
        sharedBy: req.user._id,
        sharedByName: req.user.name,
      },
      config.jwt.secret,
      { expiresIn: '30d' }
    );

    const origin = req.headers.origin || req.headers.referer || '';
    const cleanOrigin = origin ? origin.replace(/\/$/, '') : '';
    const shareLink = cleanOrigin
      ? `${cleanOrigin}/admin/students?importToken=${encodeURIComponent(token)}`
      : `/admin/students?importToken=${encodeURIComponent(token)}`;

    const responseData = {
      token,
      shareToken: token,
      shareLink,
      studentCount: count,
      organization: organization.trim(),
      batches: batches || [],
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      token,
      shareToken: token,
      shareLink,
      studentCount: count,
      message: `Share token and link generated for ${count} student(s).`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Import Shared Students Using Token
 */
export const importSharedStudents = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Share token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token.trim(), config.jwt.secret);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired student share token' });
    }

    if (decoded.shareType !== 'STUDENT_ORG_SHARE' || !decoded.organization) {
      return res.status(400).json({ success: false, message: 'Invalid share token format' });
    }

    // Role check: Faculty can ONLY import students belonging to their own organization
    if (req.user.role === 'FACULTY') {
      if (!req.user.organization || !req.user.organization.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not currently assigned to any organization, so you cannot import shared students.',
        });
      }
      if (req.user.organization.trim().toLowerCase() !== decoded.organization.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only import students from your active organization ("${req.user.organization}"). This shared token is for "${decoded.organization}".`,
        });
      }
    }

    const filter = {
      role: 'USER',
      organization: { $regex: new RegExp(`^${decoded.organization.trim()}$`, 'i') },
    };
    if (decoded.batches && Array.isArray(decoded.batches) && decoded.batches.length > 0) {
      filter.batch = { $in: decoded.batches };
    }

    const students = await User.find(filter);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No students found matching this shared organization' });
    }

    let linkedCount = 0;
    for (const student of students) {
      let changed = false;
      student.isImported = true;
      if (!student.importedBy) student.importedBy = [];
      const alreadyLogged = student.importedBy.some(
        (ib) => String(ib.user) === String(req.user._id) && ib.organization === decoded.organization
      );
      if (!alreadyLogged) {
        student.importedBy.push({
          user: req.user._id,
          organization: decoded.organization,
          at: new Date(),
        });
        changed = true;
      }

      if (String(student.createdBy) !== String(req.user._id)) {
        if (!student.assignedFaculties) student.assignedFaculties = [];
        if (!student.assignedFaculties.some((fId) => String(fId) === String(req.user._id))) {
          student.assignedFaculties.push(req.user._id);
          changed = true;
        }
      }

      if (changed) {
        await student.save();
        linkedCount++;
      }
    }

    const responseData = {
      linkedCount,
      totalOrganizationStudents: students.length,
      organization: decoded.organization,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      linkedCount,
      totalOrganizationStudents: students.length,
      organization: decoded.organization,
      message: linkedCount > 0
        ? `Successfully imported and linked ${linkedCount} student(s) from organization "${decoded.organization}" to your dashboard.`
        : `All ${students.length} student(s) from "${decoded.organization}" are already linked to your account!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Export Student Exam Results to Excel (supports individual exam or filtered)
 */
export const exportResultsExcel = async (req, res) => {
  try {
    const examId = req.params.id || req.query.examId;
    const { batch, technology, organization, gender, language, resultStatus, search, attemptIds, timezone } = req.query;

    const filter = { 
      status: { $in: ['EVALUATED', 'SUBMITTED', 'COMPLETED', 'EXPIRED', 'TERMINATED', 'IN_PROGRESS'] } 
    };

    if (examId) {
      filter.examId = examId;
    }

    if (resultStatus) {
      if (resultStatus === 'PASS') {
        filter.resultStatus = 'PASS';
        filter.status = { $ne: 'TERMINATED' };
      } else if (resultStatus === 'FAIL') {
        filter.resultStatus = 'FAIL';
        filter.status = { $ne: 'TERMINATED' };
      } else if (resultStatus === 'TERMINATED') {
        filter.$or = [
          { status: 'TERMINATED' },
          { resultStatus: 'TERMINATED' },
        ];
      } else if (resultStatus === 'ONGOING') {
        filter.status = 'IN_PROGRESS';
      } else if (resultStatus === 'PENDING') {
        filter.status = { $in: ['EVALUATING', 'SUBMITTED'] };
      } else {
        filter.resultStatus = resultStatus;
      }
    }

    if (attemptIds) {
      const ids = String(attemptIds).split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        filter._id = { $in: ids };
      }
    }

    // Role check: Faculty can export results for their students (created, assigned, or institutional) or their exams
    if (req.user?.role === 'FACULTY') {
      const myExamIds = await Exam.find({ createdBy: req.user._id }).distinct('_id');
      const adminIds = await User.find({ role: 'ADMIN' }).distinct('_id');
      const allowedStudentIds = await User.find({
        role: 'USER',
        $or: [
          { createdBy: req.user._id },
          { assignedFaculties: req.user._id },
          { organization: req.user.organization || '__NONE__' },
          { createdBy: { $in: adminIds } },
          { createdBy: null },
          { createdBy: { $exists: false } },
        ],
      }).distinct('_id');

      if (examId) {
        const isMyExam = myExamIds.map(String).includes(String(examId));
        if (!isMyExam) {
          filter.userId = { $in: allowedStudentIds };
        }
      } else {
        filter.$or = [
          { examId: { $in: myExamIds } },
          { userId: { $in: allowedStudentIds } },
        ];
      }
    }

    // Filter by student organization, technology, batch, gender, or search keyword
    const userFilter = {};
    if (req.user?.role === 'FACULTY') {
      const adminIds = await User.find({ role: 'ADMIN' }).distinct('_id');
      userFilter.$or = [
        { createdBy: req.user._id },
        { assignedFaculties: req.user._id },
        { organization: req.user.organization || '__NONE__' },
        { createdBy: { $in: adminIds } },
        { createdBy: null },
        { createdBy: { $exists: false } },
      ];
    }
    if (organization) userFilter.organization = organization;
    if (technology) userFilter.technology = technology;
    if (batch) userFilter.batch = batch;
    if (gender) userFilter.gender = gender;
    if (search && search.trim()) {
      const s = search.trim();
      const sRegex = new RegExp(s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      userFilter.$and = userFilter.$and || [];
      userFilter.$and.push({
        $or: [
          { name: sRegex },
          { email: sRegex },
          { rollNumber: sRegex },
          { studentId: sRegex },
        ],
      });
    }

    if (Object.keys(userFilter).length > 0) {
      const userIds = await User.find(userFilter).distinct('_id');
      if (filter.userId && filter.userId.$in) {
        const existingIds = new Set(filter.userId.$in.map(String));
        filter.userId = { $in: userIds.filter((id) => existingIds.has(String(id))) };
      } else {
        filter.userId = { $in: userIds };
      }
    }

    // Filter by programming language
    if (language) {
      const attemptIds = await Submission.find({ language }).distinct('attemptId');
      filter._id = { $in: attemptIds };
    }

    const attempts = await ExamAttempt.find(filter)
      .populate({
        path: 'userId',
        select: 'name email rollNumber studentId batch technology gender organization createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      })
      .populate({
        path: 'examId',
        select: 'title totalMarks passingMarks createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      })
      .sort({ createdAt: -1 });

    let examTitle = 'All_Exams';
    if (examId && attempts.length > 0 && attempts[0].examId) {
      examTitle = attempts[0].examId.title || 'Exam';
    } else if (examId) {
      const examDoc = await Exam.findById(examId);
      if (examDoc) examTitle = examDoc.title;
    }

    // Fetch languages used for each attempt
    const attemptIdsList = attempts.map((a) => a._id);
    const submissions = await Submission.find({ attemptId: { $in: attemptIdsList } }, 'attemptId language');
    const attemptLangMap = {};
    submissions.forEach((sub) => {
      const idStr = sub.attemptId.toString();
      if (!attemptLangMap[idStr]) {
        attemptLangMap[idStr] = new Set();
      }
      attemptLangMap[idStr].add(sub.language);
    });

    const clientTimezone = timezone || 'Asia/Kolkata';

    const formatDateTime = (dateVal, tz) => {
      if (!dateVal) return '—';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      try {
        return d.toLocaleString('en-IN', {
          timeZone: tz,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      } catch (e) {
        return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
      }
    };

    const formatDateOnly = (dateVal, tz) => {
      if (!dateVal) return '—';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      try {
        return d.toLocaleDateString('en-IN', {
          timeZone: tz,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch (e) {
        return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      }
    };

    const formatTimeOnly = (dateVal, tz) => {
      if (!dateVal) return '—';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      try {
        return d.toLocaleTimeString('en-IN', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      } catch (e) {
        return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
      }
    };

    const rows = attempts.length > 0 ? attempts.map((att, idx) => {
      const score = att.totalScore ?? att.totalScoreObtained ?? 0;
      const max = att.maxScore || att.examId?.totalMarks || 100;
      const passMarks = att.examId?.passingMarks ?? 40;

      const isTerminated = att.status === 'TERMINATED' || att.resultStatus === 'TERMINATED';
      const isOngoing = att.status === 'IN_PROGRESS';

      // Pass/Fail/Terminated/Ongoing status
      let outcome = att.resultStatus;
      if (isTerminated) {
        outcome = 'TERMINATED';
      } else if (isOngoing) {
        outcome = 'ONGOING';
      } else if (!outcome || outcome === 'PENDING') {
        if (att.status === 'EXPIRED') {
          outcome = 'FAIL';
        } else if (att.status === 'EVALUATED') {
          outcome = score >= passMarks ? 'PASS' : 'FAIL';
        } else {
          outcome = att.resultStatus || 'PENDING';
        }
      }

      const terminationReason = isTerminated
        ? (att.terminationReason ||
            (att.violationCount > 0
              ? `Exceeded maximum proctoring violations (${att.violationCount} violations recorded)`
              : 'Examination terminated due to security violation'))
        : '';

      const langs = Array.from(attemptLangMap[att._id.toString()] || []).join(', ') || 'N/A';
      const studentCreator = att.userId?.createdBy?.name 
        ? `${att.userId.createdBy.name} (${att.userId.createdBy.role})` 
        : 'System / Admin';
      const examCreator = att.examId?.createdBy?.name
        ? `${att.examId.createdBy.name} (${att.examId.createdBy.role})`
        : 'System';

      const submissionDateObj = att.submittedAt || att.startedAt || att.createdAt;
      const formattedDateTime = formatDateTime(submissionDateObj, clientTimezone);
      const formattedDate = formatDateOnly(submissionDateObj, clientTimezone);
      const formattedTime = formatTimeOnly(submissionDateObj, clientTimezone);

      const percentageVal = isOngoing
        ? 'In Progress'
        : (typeof att.percentage === 'number'
            ? `${att.percentage}%`
            : (max > 0 ? `${((score / max) * 100).toFixed(2)}%` : '0%'));

      return {
        'S.No': idx + 1,
        'Student Name': att.userId?.name || 'N/A',
        'Student ID / Roll No': att.userId?.studentId || att.userId?.rollNumber || 'N/A',
        'Email': att.userId?.email || 'N/A',
        'Organization': att.userId?.organization || 'N/A',
        'Technology': att.userId?.technology || 'N/A',
        'Batch': att.userId?.batch || 'N/A',
        'Gender': att.userId?.gender || 'N/A',
        'Created By (Faculty)': studentCreator,
        'Exam Title': att.examId?.title || 'N/A',
        'Exam Created By': examCreator,
        'Languages Used': langs,
        'Violations': att.violationCount || 0,
        'Score Obtained': isOngoing ? 'Ongoing' : score,
        'Max Marks': max,
        'Percentage (%)': percentageVal,
        'Status': outcome,
        'Termination Reason': terminationReason,
        'Submitted Date & Time': formattedDateTime,
        'Submission Date': formattedDate,
        'Submission Time': formattedTime,
      };
    }) : [{
      'Status': 'No student exam results found matching the selected filters'
    }];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 22 }, // Student Name
      { wch: 20 }, // Student ID / Roll No
      { wch: 26 }, // Email
      { wch: 18 }, // Organization
      { wch: 16 }, // Technology
      { wch: 16 }, // Batch
      { wch: 10 }, // Gender
      { wch: 24 }, // Created By (Faculty)
      { wch: 26 }, // Exam Title
      { wch: 20 }, // Exam Created By
      { wch: 16 }, // Languages Used
      { wch: 10 }, // Violations
      { wch: 14 }, // Score Obtained
      { wch: 12 }, // Max Marks
      { wch: 14 }, // Percentage (%)
      { wch: 14 }, // Status
      { wch: 36 }, // Termination Reason
      { wch: 24 }, // Submitted Date & Time
      { wch: 16 }, // Submission Date
      { wch: 16 }, // Submission Time
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exam Results');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const cleanFileName = examTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}_Results.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export class AdminController {
  static async getAnalytics(req, res, next) {
    try {
      const data = await AdminService.getDashboardAnalytics(req.user);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req, res, next) {
    try {
      const result = await AdminService.getUsers(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.toggleUserStatus(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteUser(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllExams(req, res, next) {
    try {
      const exams = await AdminService.getAllExams(req.user);
      res.status(200).json({
        success: true,
        data: { exams },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createExam(req, res, next) {
    try {
      const exam = await AdminService.createExam(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Exam created successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateExam(req, res, next) {
    try {
      const { id } = req.params;
      const exam = await AdminService.updateExam(id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: 'Exam updated successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteExam(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteExam(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkDeleteExams(req, res, next) {
    try {
      const { ids, examIds } = req.body;
      const targetIds = ids || examIds || [];
      const result = await AdminService.bulkDeleteExams(targetIds, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkDeleteUsers(req, res, next) {
    try {
      const { ids, userIds, studentIds } = req.body;
      const targetIds = ids || userIds || studentIds || [];
      const result = await AdminService.bulkDeleteUsers(targetIds, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkDeleteFaculty(req, res, next) {
    try {
      const { ids, facultyIds } = req.body;
      const targetIds = ids || facultyIds || [];
      const result = await AdminService.bulkDeleteFaculty(targetIds);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async duplicateExam(req, res, next) {
    try {
      const { id } = req.params;
      const exam = await AdminService.duplicateExam(id, req.user._id, req.user);
      res.status(201).json({
        success: true,
        message: 'Exam duplicated successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async reorderQuestions(req, res, next) {
    try {
      const { id } = req.params;
      const { questionIds } = req.body;
      const exam = await AdminService.reorderQuestions(id, questionIds, req.user);
      res.status(200).json({
        success: true,
        message: 'Questions reordered successfully',
        data: { exam },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllResults(req, res, next) {
    try {
      const result = await ResultService.getAllResultsAdmin(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteResult(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteResult(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async allowRetake(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.allowRetake(id, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async terminateAttempt(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await AdminService.terminateAttempt(id, reason, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkDeleteResults(req, res, next) {
    try {
      const { ids, resultIds, attemptIds } = req.body;
      const targetIds = ids || resultIds || attemptIds || [];
      const result = await AdminService.bulkDeleteResults(targetIds, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllSubmissions(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      let filter = {};
      if (req.user?.role === 'FACULTY') {
        const myExamIds = await Exam.find({ createdBy: req.user._id }).distinct('_id');
        const myStudentIds = await User.find({
          role: 'USER',
          $or: [
            { createdBy: req.user._id },
            { assignedFaculties: req.user._id },
            { organization: req.user.organization || '__NONE__' },
          ],
        }).distinct('_id');
        filter.$or = [
          { examId: { $in: myExamIds } },
          { userId: { $in: myStudentIds } },
        ];
      }

      const [submissions, total] = await Promise.all([
        Submission.find(filter)
          .populate({
            path: 'userId',
            select: 'name email createdBy',
            populate: { path: 'createdBy', select: 'name email role' }
          })
          .populate({
            path: 'examId',
            select: 'title createdBy',
            populate: { path: 'createdBy', select: 'name email role' }
          })
          .populate('questionId', 'title marks')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Submission.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          submissions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, studentId, rollNumber, phone, batch, technology, organization, gender, age, password, oldPassword } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const isCreator = String(user.createdBy) === String(req.user._id);
    const isAssigned = user.assignedFaculties?.some((fId) => String(fId) === String(req.user._id));
    if (req.user.role === 'FACULTY' && !isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only update students you created or have imported.' });
    }

    const finalStudentId = studentId !== undefined ? String(studentId).trim() : (rollNumber !== undefined ? String(rollNumber).trim() : undefined);
    if (finalStudentId !== undefined && finalStudentId !== '') {
      if (finalStudentId !== user.studentId && finalStudentId !== user.rollNumber) {
        const existingById = await User.findOne({
          _id: { $ne: id },
          $or: [
            { studentId: { $regex: new RegExp(`^${finalStudentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { rollNumber: { $regex: new RegExp(`^${finalStudentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          ],
        });
        if (existingById) {
          return res.status(409).json({ success: false, message: `Student ID "${finalStudentId}" is already registered to another user.` });
        }
      }
      user.studentId = finalStudentId;
      user.rollNumber = finalStudentId;
    }

    if (email !== undefined) {
      const cleanEmail = email && String(email).trim() ? String(email).toLowerCase().trim() : undefined;
      if (cleanEmail && cleanEmail !== user.email) {
        const existing = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already registered to another user.' });
        }
        user.email = cleanEmail;
      } else if (!cleanEmail) {
        user.email = undefined;
      }
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (organization !== undefined) {
      let targetOrg = '';
      if (req.user?.role === 'FACULTY') {
        targetOrg = req.user.organization ? req.user.organization.trim() : '';
      } else {
        targetOrg = String(organization).trim();
      }
      if (!targetOrg) {
        return res.status(400).json({ success: false, message: 'Organization is mandatory for students.' });
      }
      const escapedOrg = targetOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const orgDoc = await Organization.findOne({
        name: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!orgDoc) {
        return res.status(400).json({
          success: false,
          message: `Organization "${targetOrg}" does not exist in the system. Please create the organization first.`,
        });
      }
      user.organization = orgDoc.name;
    }

    if (technology !== undefined) {
      const cleanTech = String(technology).trim();
      if (!cleanTech) {
        return res.status(400).json({ success: false, message: 'Technology cannot be empty for students.' });
      }
      const escapedOrg = user.organization.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedTech = cleanTech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const techDoc = await Technology.findOne({
        name: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
        organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!techDoc) {
        return res.status(400).json({
          success: false,
          message: `Technology "${cleanTech}" does not exist under organization "${user.organization}". Please create this technology first.`,
        });
      }
      user.technology = techDoc.name;
    }

    if (batch !== undefined) {
      const cleanBatch = String(batch).trim();
      if (!cleanBatch) {
        return res.status(400).json({ success: false, message: 'Batch cannot be empty for students.' });
      }
      const escapedOrg = user.organization.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedTech = user.technology.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedBatch = cleanBatch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const batchDoc = await Batch.findOne({
        name: { $regex: new RegExp(`^${escapedBatch}$`, 'i') },
        technology: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
        organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!batchDoc) {
        return res.status(400).json({
          success: false,
          message: `Batch "${cleanBatch}" does not exist under technology "${user.technology}" in organization "${user.organization}". Please create this batch first.`,
        });
      }
      user.batch = batchDoc.name;
      user.batchId = batchDoc._id;
    } else if (user.batch && user.technology && user.organization) {
      const escapedBatch = user.batch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedTech = user.technology.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedOrg = user.organization.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const batchDoc = await Batch.findOne({
        name: { $regex: new RegExp(`^${escapedBatch}$`, 'i') },
        technology: { $regex: new RegExp(`^${escapedTech}$`, 'i') },
        organization: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      user.batchId = batchDoc ? batchDoc._id : null;
    }
    if (gender !== undefined) user.gender = String(gender).trim();
    if (age !== undefined) user.age = age === '' || age === null ? null : Number(age);

    if (password && password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(password.trim(), 10);
      user.plainPassword = password.trim();
    } else if (!user.plainPassword) {
      user.plainPassword = 'Student@123';
    }

    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportSubmissionsDocx = async (req, res) => {
  try {
    const { examId, userId, timezone } = req.query;

    if (req.user?.role === 'FACULTY') {
      if (userId) {
        const student = await User.findById(userId).populate('createdBy', 'role');
        const isMyStudent = student && String(student.createdBy?._id || student.createdBy) === String(req.user._id);
        const isSameOrg = student && student.organization && student.organization === req.user.organization;
        const isAdminStudent = !student?.createdBy || student?.createdBy?.role === 'ADMIN';
        if (!isMyStudent && !isSameOrg && !isAdminStudent) {
          return res.status(403).json({ success: false, message: 'Access denied. You can only export submissions for your own organization or students.' });
        }
      }
    }

    const { DocxExportService } = await import('../services/docxExportService.js');
    const buffer = await DocxExportService.generateSubmissionsDocx({
      examId,
      userId,
      requestingUser: req.user,
      timezone: timezone || 'Asia/Kolkata',
    });

    let examTitle = 'All_Exams';
    if (examId) {
      const examDoc = await Exam.findById(examId);
      if (examDoc?.title) examTitle = examDoc.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    }

    let candidateName = '';
    if (userId) {
      const studentDoc = await User.findById(userId);
      if (studentDoc?.name) candidateName = `_${studentDoc.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}`;
    }

    const filename = userId
      ? `Candidate${candidateName}_${examTitle}_Submission_${Date.now()}.docx`
      : `${examTitle}_All_Submissions_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('DOCX Export Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ========================================================
 * FACULTY MANAGEMENT CONTROLLERS (Super Admin)
 * ========================================================
 */

export const getFacultyList = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const skip = (page - 1) * limit;

    const filter = { role: 'FACULTY' };
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { facultyId: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { batch: { $regex: req.query.search, $options: 'i' } },
        { technology: { $regex: req.query.search, $options: 'i' } },
        { technologies: { $in: [new RegExp(req.query.search, 'i')] } },
        { organization: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.organization) {
      filter.organization = req.query.organization;
    }
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.isActive = req.query.status === 'active';
    }

    const [faculty, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        faculty: faculty.map((f) => ({
          _id: f._id,
          facultyId: f.facultyId || '',
          name: f.name,
          email: f.email || '',
          phone: f.phone || '',
          department: f.batch || '',
          technology: f.technology || (f.technologies?.[0] || ''),
          technologies: f.technologies && f.technologies.length > 0 ? f.technologies : (f.batch ? f.batch.split(',').map(s=>s.trim()).filter(Boolean) : []),
          organization: f.organization || '',
          isActive: f.isActive,
          createdAt: f.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { facultyId, name, email, password, department, technologies, technology, organization, phone } = req.body;

    const finalFacultyId = facultyId ? String(facultyId).trim() : '';
    if (!name || !password || !finalFacultyId) {
      return res.status(400).json({ success: false, message: 'Faculty ID, Name, and Password are required.' });
    }

    const finalOrg = organization ? String(organization).trim() : '';
    if (!finalOrg) {
      return res.status(400).json({ success: false, message: 'Organization is mandatory for faculty.' });
    }

    const escapedOrg = finalOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const orgDoc = await Organization.findOne({
      name: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
    });
    if (!orgDoc) {
      return res.status(400).json({
        success: false,
        message: `Organization "${finalOrg}" does not exist in the system. Please create the organization first.`,
      });
    }
    const validatedOrg = orgDoc.name;

    const rawTechs = technologies || (department ? [department] : (technology ? [technology] : []));
    const cleanTechs = Array.isArray(rawTechs)
      ? rawTechs.map((t) => String(t).trim()).filter(Boolean)
      : String(rawTechs).split(',').map((t) => t.trim()).filter(Boolean);

    const existingById = await User.findOne({
      facultyId: { $regex: new RegExp(`^${finalFacultyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existingById) {
      return res.status(409).json({ success: false, message: `A faculty member with Faculty ID "${finalFacultyId}" already exists.` });
    }

    const cleanEmail = email && String(email).trim() ? String(email).toLowerCase().trim() : undefined;
    if (cleanEmail) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const facultyPayload = {
      facultyId: finalFacultyId,
      name: name.trim(),
      passwordHash: hashedPassword,
      role: 'FACULTY',
      technologies: cleanTechs,
      technology: cleanTechs[0] || '',
      batch: cleanTechs.join(', '),
      organization: validatedOrg,
      phone: phone ? String(phone).trim() : '',
      createdBy: req.user._id,
      isActive: true,
      isVerified: true,
    };
    if (cleanEmail) {
      facultyPayload.email = cleanEmail;
    }
    const newFaculty = await User.create(facultyPayload);

    res.status(201).json({
      success: true,
      message: 'Faculty account created successfully',
      data: {
        faculty: {
          _id: newFaculty._id,
          facultyId: newFaculty.facultyId,
          name: newFaculty.name,
          email: newFaculty.email || '',
          phone: newFaculty.phone,
          department: newFaculty.batch,
          technology: newFaculty.technology,
          technologies: newFaculty.technologies,
          organization: newFaculty.organization,
          isActive: newFaculty.isActive,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId, name, email, phone, department, technologies, technology, organization, password } = req.body;

    const faculty = await User.findOne({ _id: id, role: 'FACULTY' });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    if (facultyId !== undefined && String(facultyId).trim() !== '') {
      const finalFacultyId = String(facultyId).trim();
      if (finalFacultyId !== faculty.facultyId) {
        const existingById = await User.findOne({
          facultyId: { $regex: new RegExp(`^${finalFacultyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: id },
        });
        if (existingById) {
          return res.status(409).json({ success: false, message: `Faculty ID "${finalFacultyId}" is already registered to another user.` });
        }
        faculty.facultyId = finalFacultyId;
      }
    }

    if (email !== undefined) {
      const cleanEmail = email && String(email).trim() ? String(email).toLowerCase().trim() : undefined;
      if (cleanEmail && cleanEmail !== faculty.email) {
        const existing = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already registered to another user.' });
        }
        faculty.email = cleanEmail;
      } else if (!cleanEmail) {
        faculty.email = undefined;
      }
    }

    if (name) faculty.name = name.trim();
    if (phone !== undefined) faculty.phone = String(phone).trim();

    if (organization !== undefined) {
      const finalOrg = String(organization).trim();
      if (!finalOrg) {
        return res.status(400).json({ success: false, message: 'Organization is mandatory for faculty.' });
      }
      const escapedOrg = finalOrg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const orgDoc = await Organization.findOne({
        name: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!orgDoc) {
        return res.status(400).json({
          success: false,
          message: `Organization "${finalOrg}" does not exist in the system. Please create the organization first.`,
        });
      }
      faculty.organization = orgDoc.name;
    }

    if (technologies !== undefined || department !== undefined || technology !== undefined) {
      const rawTechs = technologies !== undefined ? technologies : (department ? [department] : (technology ? [technology] : []));
      const cleanTechs = Array.isArray(rawTechs)
        ? rawTechs.map((t) => String(t).trim()).filter(Boolean)
        : String(rawTechs).split(',').map((t) => t.trim()).filter(Boolean);

      faculty.technologies = cleanTechs;
      faculty.technology = cleanTechs[0] || '';
      faculty.batch = cleanTechs.join(', ');
    }

    if (password && password.trim().length >= 6) {
      faculty.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await faculty.save();

    res.status(200).json({
      success: true,
      message: 'Faculty account updated successfully',
      data: {
        faculty: {
          _id: faculty._id,
          facultyId: faculty.facultyId || '',
          name: faculty.name,
          email: faculty.email || '',
          phone: faculty.phone,
          department: faculty.batch,
          technology: faculty.technology,
          technologies: faculty.technologies,
          organization: faculty.organization,
          isActive: faculty.isActive,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await User.findOne({ _id: id, role: 'FACULTY' });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Faculty member "${faculty.name}" deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadFacultyTemplate = async (req, res) => {
  try {
    const sampleData = [
      {
        'Faculty ID *': 'FAC2026001',
        'Full Name *': 'Dr. Rajesh Sharma',
        'Organization *': 'Tech University',
        'Technologies': 'Java Full Stack, Python',
        'Password': 'Faculty@123',
        'Email': 'rajesh.sharma@university.edu',
        'Phone': '9876543210',
      },
      {
        'Faculty ID *': 'FAC2026002',
        'Full Name *': 'Prof. Ananya Gupta',
        'Organization *': 'Tech University',
        'Technologies': 'Web Development, MERN Stack',
        'Password': 'Faculty@123',
        'Email': '', // Optional
        'Phone': '9876543211',
      },
    ];

    const guidelines = [
      { 'Field Name': 'Faculty ID *', 'Status': 'MANDATORY (*)', 'Description': 'Unique identifier for the faculty member (e.g. FAC2026001)' },
      { 'Field Name': 'Full Name *', 'Status': 'MANDATORY (*)', 'Description': 'Full legal or official name of the faculty instructor' },
      { 'Field Name': 'Organization *', 'Status': 'MANDATORY (*)', 'Description': 'University, College, or Organization name (e.g. Tech University)' },
      { 'Field Name': 'Technologies', 'Status': 'OPTIONAL', 'Description': 'Comma-separated technologies taught (optional, e.g. Java Full Stack, Python)' },
      { 'Field Name': 'Password', 'Status': 'OPTIONAL', 'Description': 'Initial login password (defaults to Faculty@123 if omitted)' },
      { 'Field Name': 'Email', 'Status': 'OPTIONAL', 'Description': 'Faculty email address (optional, must be unique across system if provided)' },
      { 'Field Name': 'Phone', 'Status': 'OPTIONAL', 'Description': 'Faculty mobile / contact telephone number' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const wsGuidelines = XLSX.utils.json_to_sheet(guidelines);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faculty_Template');
    XLSX.utils.book_append_sheet(workbook, wsGuidelines, 'Guidelines');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="faculty_upload_template.xlsx"');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadFacultyExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx or .xls) file' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty' });
    }

    const createdFaculty = [];
    const errors = [];

    for (let index = 0; index < sheetData.length; index++) {
      const row = sheetData[index];
      const rowNumber = index + 2;

      const facultyIdRaw =
        row['Faculty ID *'] ||
        row['Faculty ID'] ||
        row['FacultyId'] ||
        row['facultyId'] ||
        row['FACULTY ID'] ||
        row['faculty_id'] ||
        row['Faculty Id'] ||
        row['ID'];
      const name =
        row['Full Name *'] ||
        row['Full Name'] ||
        row['name'] ||
        row['Name'] ||
        row['FULL NAME'];
      const emailRaw = row['Email'] || row['email'] || row['EMAIL'];
      const password = String(row['Password'] || row['password'] || 'Faculty@123');
      const organizationRaw =
        row['Organization *'] ||
        row['Organization'] ||
        row['organization'] ||
        row['Organisation'] ||
        row['organisation'];
      const technologiesRaw =
        row['Technologies *'] ||
        row['Technologies'] ||
        row['Technology *'] ||
        row['Technology'] ||
        row['technologies'] ||
        row['technology'] ||
        row['Department'] ||
        row['department'] ||
        row['batch'];
      const phone = String(row['Phone'] || row['phone'] || '');

      const facultyId = facultyIdRaw ? String(facultyIdRaw).trim() : '';
      const email = emailRaw && String(emailRaw).trim() ? String(emailRaw).toLowerCase().trim() : undefined;

      if (!name || !facultyId) {
        errors.push(`Row ${rowNumber}: Faculty ID and Full Name are required.`);
        continue;
      }

      const organization = organizationRaw ? String(organizationRaw).trim() : '';
      if (!organization) {
        errors.push(`Row ${rowNumber}: Organization is mandatory for faculty.`);
        continue;
      }

      const escapedOrg = organization.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const orgDoc = await Organization.findOne({
        name: { $regex: new RegExp(`^${escapedOrg}$`, 'i') },
      });
      if (!orgDoc) {
        errors.push(`Row ${rowNumber}: Organization "${organization}" does not exist in the system. Please create the organization first.`);
        continue;
      }
      const finalOrg = orgDoc.name;

      const rawTechs = technologiesRaw || '';
      const cleanTechs = Array.isArray(rawTechs)
        ? rawTechs.map((t) => String(t).trim()).filter(Boolean)
        : String(rawTechs).split(',').map((t) => t.trim()).filter(Boolean);

      // Check existing faculty by Faculty ID or Email
      let existing = await User.findOne({
        role: 'FACULTY',
        facultyId: { $regex: new RegExp(`^${facultyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (!existing && email) {
        existing = await User.findOne({ email });
      }

      if (existing) {
        // Update existing faculty member
        existing.facultyId = facultyId;
        existing.name = String(name).trim();
        if (email) existing.email = email;
        existing.organization = finalOrg;
        existing.technologies = cleanTechs;
        existing.technology = cleanTechs[0] || '';
        existing.batch = cleanTechs.join(', ');
        if (phone) existing.phone = phone.trim();
        await existing.save();
        createdFaculty.push(facultyId);
      } else {
        // Validate email uniqueness if provided
        if (email) {
          const emailExists = await User.findOne({ email });
          if (emailExists) {
            errors.push(`Row ${rowNumber}: Email "${email}" already registered to another user.`);
            continue;
          }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const facultyPayload = {
          facultyId,
          name: String(name).trim(),
          passwordHash: hashedPassword,
          role: 'FACULTY',
          organization: finalOrg,
          technologies: cleanTechs,
          technology: cleanTechs[0] || '',
          batch: cleanTechs.join(', '),
          phone: phone.trim(),
          createdBy: req.user._id,
          isActive: true,
          isVerified: true,
        };
        if (email) {
          facultyPayload.email = email;
        }
        const faculty = await User.create(facultyPayload);

        createdFaculty.push(faculty.facultyId);
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${sheetData.length} rows. Successfully imported/updated ${createdFaculty.length} faculty accounts.`,
      data: {
        importedCount: createdFaculty.length,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
