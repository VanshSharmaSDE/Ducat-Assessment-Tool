import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  PageBreak,
} from 'docx';
import { Exam } from '../models/Exam.js';
import { User } from '../models/User.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';
import { Batch } from '../models/Batch.js';

export class DocxExportService {
  /**
   * Format date & time into client timezone
   */
  static formatDateTime(dateVal, tz = 'Asia/Kolkata') {
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
    } catch {
      return d.toLocaleString();
    }
  }

  /**
   * Helper to build clean styled table cells
   */
  static createCell(content, widthPercent, {
    align = AlignmentType.LEFT,
    bold = false,
    color = '0F172A',
    bg = 'FFFFFF',
    font = 'Arial',
    size = 18,
    borders = null,
  } = {}) {
    const defaultBorder = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
    const children = [];

    if (Array.isArray(content)) {
      children.push(...content);
    } else {
      children.push(
        new TextRun({
          text: String(content ?? '—'),
          bold,
          color,
          font,
          size,
        })
      );
    }

    const cellOptions = {
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      margins: { top: 110, bottom: 110, left: 140, right: 140 },
      borders: borders || {
        top: defaultBorder,
        bottom: defaultBorder,
        left: defaultBorder,
        right: defaultBorder,
      },
      children: [
        new Paragraph({
          alignment: align,
          children,
        }),
      ],
    };

    if (bg && bg !== 'FFFFFF') {
      cellOptions.shading = { fill: bg, type: ShadingType.CLEAR };
    }

    return new TableCell(cellOptions);
  }

  /**
   * Helper to build key-value 4-column summary grid
   */
  static createKeyValueTable(pairs) {
    const subtleBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
    const rows = [];

    for (let i = 0; i < pairs.length; i += 2) {
      const p1 = pairs[i];
      const p2 = pairs[i + 1];

      const cells = [
        DocxExportService.createCell(p1.label, 20, {
          bold: true,
          color: '334155',
          bg: 'F1F5F9',
          size: 17,
          borders: { top: subtleBorder, bottom: subtleBorder, left: subtleBorder, right: subtleBorder },
        }),
        DocxExportService.createCell(p1.value, 30, {
          bold: false,
          color: p1.color || '0F172A',
          bg: 'FFFFFF',
          size: 17,
          borders: { top: subtleBorder, bottom: subtleBorder, left: subtleBorder, right: subtleBorder },
        }),
      ];

      if (p2) {
        cells.push(
          DocxExportService.createCell(p2.label, 20, {
            bold: true,
            color: '334155',
            bg: 'F1F5F9',
            size: 17,
            borders: { top: subtleBorder, bottom: subtleBorder, left: subtleBorder, right: subtleBorder },
          }),
          DocxExportService.createCell(p2.value, 30, {
            bold: false,
            color: p2.color || '0F172A',
            bg: 'FFFFFF',
            size: 17,
            borders: { top: subtleBorder, bottom: subtleBorder, left: subtleBorder, right: subtleBorder },
          })
        );
      } else {
        cells.push(
          DocxExportService.createCell('', 20, { bg: 'F8FAFC' }),
          DocxExportService.createCell('', 30, { bg: 'F8FAFC' })
        );
      }

      rows.push(new TableRow({ children: cells }));
    }

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    });
  }

  /**
   * Formats source code inside an IDE-like shaded monospace box
   */
  static createCodeBlock(code) {
    const raw = (code != null && String(code).trim().length > 0)
      ? String(code)
      : '// No source code submitted for this problem.';

    const lines = raw.split(/\r?\n/);
    const paragraphs = lines.map((line, idx) => {
      const lineNum = String(idx + 1).padStart(3, ' ');
      return new Paragraph({
        spacing: { before: 20, after: 20, line: 240 },
        children: [
          new TextRun({
            text: `${lineNum}  `,
            font: 'Consolas',
            color: '94A3B8',
            size: 16,
          }),
          new TextRun({
            text: line || ' ',
            font: 'Consolas',
            color: '0F172A',
            size: 17,
          }),
        ],
      });
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 6, color: '2563EB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: paragraphs,
            }),
          ],
        }),
      ],
    });
  }

  /**
   * Main Document Generator
   */
  static async generateSubmissionsDocx({ examId, userId, requestingUser = null, timezone = 'Asia/Kolkata' }) {
    const clientTimezone = timezone || 'Asia/Kolkata';

    let exam = null;
    if (examId) {
      exam = await Exam.findById(examId)
        .populate({
          path: 'questions.questionId',
          select: 'title description type options correctAnswer inputFormat outputFormat constraints examples difficulty marks starterCode allowedLanguages',
        })
        .populate('createdBy', 'name email role');
    }

    // Determine target attempts
    const attemptQuery = {};
    if (examId) attemptQuery.examId = examId;
    if (userId) attemptQuery.userId = userId;

    // Faculty scoping
    if (requestingUser?.role === 'FACULTY' && !userId) {
      const myBatchDocs = await Batch.find({
        $or: [
          { createdBy: requestingUser._id },
          { assignedFaculties: requestingUser._id },
        ],
      });
      const myBatchIds = myBatchDocs.map((b) => b._id);
      const myBatchNames = myBatchDocs.map((b) => b.name);

      const studentQuery = {
        role: 'USER',
        $or: [
          { createdBy: requestingUser._id },
          { assignedFaculties: requestingUser._id },
          { batchId: { $in: myBatchIds } },
          { batch: { $in: myBatchNames } },
        ],
      };
      if (requestingUser.organization && requestingUser.organization.trim()) {
        const escapedOrg = requestingUser.organization.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        studentQuery.organization = { $regex: new RegExp(`^${escapedOrg}$`, 'i') };
      }

      const allowedStudentIds = await User.find(studentQuery).distinct('_id');
      attemptQuery.userId = { $in: allowedStudentIds };
    }

    const attempts = await ExamAttempt.find(attemptQuery)
      .populate({
        path: 'userId',
        select: 'name email rollNumber studentId batch technology organization phone gender age createdBy',
      })
      .populate({
        path: 'examId',
        populate: {
          path: 'questions.questionId',
          select: 'title description type options correctAnswer inputFormat outputFormat constraints examples difficulty marks starterCode allowedLanguages',
        },
      })
      .sort({ createdAt: -1 });

    const docChildren = [];

    // ==========================================
    // 1. DOCUMENT HEADER & BRANDING
    // ==========================================
    docChildren.push(
      new Paragraph({
        text: 'CODEASSESS PLATFORM',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 60 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: userId
              ? 'INDIVIDUAL CANDIDATE EXAMINATION & SUBMISSION DOSSIER'
              : 'COMPREHENSIVE EXAMINATION PERFORMANCE & SUBMISSIONS REPORT',
            bold: true,
            size: 24,
            color: '1E3A8A',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Generated On: ', bold: true, color: '64748B', size: 18 }),
          new TextRun({ text: `${DocxExportService.formatDateTime(new Date(), clientTimezone)} (${clientTimezone})   |   `, color: '334155', size: 18 }),
          new TextRun({ text: 'Generated By: ', bold: true, color: '64748B', size: 18 }),
          new TextRun({ text: `${requestingUser?.name || 'Administrator'} (${requestingUser?.role || 'ADMIN'})`, color: '334155', size: 18 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );

    // ==========================================
    // 2. EXAMINATION METADATA OVERVIEW
    // ==========================================
    const currentExam = exam || (attempts.length > 0 ? attempts[0].examId : null);

    if (currentExam) {
      docChildren.push(
        new Paragraph({
          text: `Examination Overview: ${currentExam.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 150 },
        })
      );

      const examPairs = [
        { label: 'Exam Title', value: currentExam.title || 'N/A' },
        { label: 'Created By', value: currentExam.createdBy?.name ? `${currentExam.createdBy.name} (${currentExam.createdBy.role || 'STAFF'})` : 'Faculty / Administrator' },
        { label: 'Total Marks', value: String(currentExam.totalMarks || 0) },
        { label: 'Passing Marks', value: String(currentExam.passingMarks || 'N/A') },
        { label: 'Duration', value: `${currentExam.duration || 0} Minutes` },
        { label: 'Total Questions', value: String(currentExam.questions?.length || 0) },
        { label: 'Assessment Window', value: `${DocxExportService.formatDateTime(currentExam.startDate, clientTimezone)} to ${DocxExportService.formatDateTime(currentExam.endDate, clientTimezone)}` },
        { label: 'Total Attempts in Report', value: String(attempts.length) },
      ];

      docChildren.push(DocxExportService.createKeyValueTable(examPairs));

      if (currentExam.instructions) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({ text: 'Exam Instructions: ', bold: true, color: '475569', size: 18 }),
              new TextRun({ text: currentExam.instructions, italics: true, color: '64748B', size: 18 }),
            ],
          })
        );
      }

      docChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 250 },
        })
      );
    }

    if (attempts.length === 0) {
      docChildren.push(
        new Paragraph({
          text: 'No student exam attempts or submissions were found matching the selected criteria.',
          spacing: { before: 200, after: 200 },
        })
      );
    }

    // ==========================================
    // 3. EXECUTIVE SUMMARY TABLE (For Multi-Candidate / Whole Exam)
    // ==========================================
    if (attempts.length > 0 && !userId) {
      let passedCount = 0;
      let failedCount = 0;
      let terminatedCount = 0;
      let ongoingCount = 0;
      let pendingCount = 0;
      let totalScores = 0;
      let maxRecordedScore = 0;

      attempts.forEach((att) => {
        const score = att.totalScore || 0;
        totalScores += score;
        if (score > maxRecordedScore) maxRecordedScore = score;

        const passingScore = currentExam?.passingMarks || 0;
        const isTerminated = att.status === 'TERMINATED' || att.resultStatus === 'TERMINATED';
        const isOngoing = att.status === 'IN_PROGRESS';

        if (isTerminated) {
          terminatedCount++;
        } else if (isOngoing) {
          ongoingCount++;
        } else if (att.resultStatus === 'PASS' || (passingScore > 0 && score >= passingScore)) {
          passedCount++;
        } else if (att.resultStatus === 'FAIL' || (passingScore > 0 && score < passingScore && att.status === 'EVALUATED')) {
          failedCount++;
        } else {
          pendingCount++;
        }
      });

      const avgScore = (totalScores / attempts.length).toFixed(1);

      docChildren.push(
        new Paragraph({
          text: 'Executive Performance Summary',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        })
      );

      const kpiPairs = [
        { label: 'Total Candidates', value: String(attempts.length) },
        { label: 'Candidates Passed', value: String(passedCount), color: '16A34A' },
        { label: 'Candidates Failed', value: String(failedCount), color: 'DC2626' },
        { label: 'Terminated Candidates', value: String(terminatedCount), color: '991B1B' },
        { label: 'Ongoing / In Progress', value: String(ongoingCount), color: '2563EB' },
        { label: 'Pending / Evaluating', value: String(pendingCount), color: 'D97706' },
        { label: 'Average Score', value: `${avgScore} / ${currentExam?.totalMarks || 100}` },
        { label: 'Highest Score Recorded', value: `${maxRecordedScore} / ${currentExam?.totalMarks || 100}`, color: '16A34A' },
      ];

      docChildren.push(DocxExportService.createKeyValueTable(kpiPairs));

      // Candidates Master Table
      docChildren.push(
        new Paragraph({
          text: 'Candidates Examination Roster & Results Summary:',
          bold: true,
          spacing: { before: 200, after: 120 },
        })
      );

      const masterHeaderRow = new TableRow({
        tableHeader: true,
        children: [
          DocxExportService.createCell('#', 5, { bold: true, color: 'FFFFFF', bg: '1E3A8A', align: AlignmentType.CENTER }),
          DocxExportService.createCell('Candidate Name', 20, { bold: true, color: 'FFFFFF', bg: '1E3A8A' }),
          DocxExportService.createCell('Roll / Student ID', 14, { bold: true, color: 'FFFFFF', bg: '1E3A8A' }),
          DocxExportService.createCell('Organization', 14, { bold: true, color: 'FFFFFF', bg: '1E3A8A' }),
          DocxExportService.createCell('Tech / Batch', 15, { bold: true, color: 'FFFFFF', bg: '1E3A8A' }),
          DocxExportService.createCell('Score', 12, { bold: true, color: 'FFFFFF', bg: '1E3A8A', align: AlignmentType.CENTER }),
          DocxExportService.createCell('Result', 10, { bold: true, color: 'FFFFFF', bg: '1E3A8A', align: AlignmentType.CENTER }),
          DocxExportService.createCell('Violations', 10, { bold: true, color: 'FFFFFF', bg: '1E3A8A', align: AlignmentType.CENTER }),
        ],
      });

      const masterRows = [masterHeaderRow];

      attempts.forEach((att, idx) => {
        const std = att.userId || {};
        const score = att.totalScore || 0;
        const max = currentExam?.totalMarks || att.maxScore || 100;
        const passing = currentExam?.passingMarks || 0;

        const isTerminated = att.status === 'TERMINATED' || att.resultStatus === 'TERMINATED';
        const isOngoing = att.status === 'IN_PROGRESS';

        let statusText = 'PENDING';
        let statusColor = 'D97706';

        if (isTerminated) {
          statusText = 'TERMINATED';
          statusColor = '991B1B';
        } else if (isOngoing) {
          statusText = 'ONGOING';
          statusColor = '2563EB';
        } else if (att.resultStatus === 'PASS') {
          statusText = 'PASSED';
          statusColor = '16A34A';
        } else if (att.resultStatus === 'FAIL') {
          statusText = 'FAILED';
          statusColor = 'DC2626';
        } else if (passing > 0 && att.status === 'EVALUATED') {
          if (score >= passing) {
            statusText = 'PASSED';
            statusColor = '16A34A';
          } else {
            statusText = 'FAILED';
            statusColor = 'DC2626';
          }
        }

        const rowBg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';

        masterRows.push(
          new TableRow({
            children: [
              DocxExportService.createCell(String(idx + 1), 5, { align: AlignmentType.CENTER, bg: rowBg }),
              DocxExportService.createCell(std.name || 'Anonymous', 20, { bold: true, bg: rowBg }),
              DocxExportService.createCell(std.studentId || std.rollNumber || 'N/A', 14, { bg: rowBg }),
              DocxExportService.createCell(std.organization || 'N/A', 14, { bg: rowBg }),
              DocxExportService.createCell(`${std.technology || '—'}${std.batch ? ' / ' + std.batch : ''}`, 15, { bg: rowBg }),
              DocxExportService.createCell(`${score} / ${max}`, 12, { align: AlignmentType.CENTER, bold: true, bg: rowBg }),
              DocxExportService.createCell(statusText, 10, { align: AlignmentType.CENTER, bold: true, color: statusColor, bg: rowBg }),
              DocxExportService.createCell(String(att.violationCount || 0), 10, {
                align: AlignmentType.CENTER,
                bold: (att.violationCount || 0) > 0,
                color: (att.violationCount || 0) > 0 ? 'DC2626' : '0F172A',
                bg: rowBg,
              }),
            ],
          })
        );
      });

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: masterRows,
        }),
        new Paragraph({
          spacing: { after: 300 },
        })
      );
    }

    // ==========================================
    // 4. CANDIDATE-BY-CANDIDATE DETAILED DOSSIERS
    // ==========================================
    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const student = attempt.userId || {};
      const targetExam = attempt.examId || exam || {};

      // Page break between candidates
      if (i > 0 || (!userId && attempts.length > 0)) {
        docChildren.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }

      // Candidate Section Header
      docChildren.push(
        new Paragraph({
          text: `CANDIDATE DOSSIER #${i + 1}: ${student.name || 'Anonymous'}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 150, after: 120 },
        })
      );

      // Student Demographics Table
      const studentPairs = [
        { label: 'Candidate Name', value: student.name || 'N/A' },
        { label: 'Email Address', value: student.email || 'N/A' },
        { label: 'Student ID', value: student.studentId || 'N/A' },
        { label: 'Roll Number', value: student.rollNumber || 'N/A' },
        { label: 'Organization', value: student.organization || 'N/A' },
        { label: 'Technology', value: student.technology || 'N/A' },
        { label: 'Batch', value: student.batch || 'N/A' },
        { label: 'Phone Number', value: student.phone || 'N/A' },
        { label: 'Gender', value: student.gender || 'N/A' },
        { label: 'Age', value: student.age != null ? String(student.age) : 'N/A' },
      ];

      docChildren.push(DocxExportService.createKeyValueTable(studentPairs));

      // Determine outcome
      const isTerminated = attempt.status === 'TERMINATED' || attempt.resultStatus === 'TERMINATED';
      const isOngoing = attempt.status === 'IN_PROGRESS';

      let outcomeText = 'PENDING';
      let outcomeColor = 'D97706';
      const maxMarks = targetExam.totalMarks || attempt.maxScore || 100;
      const passMarks = targetExam.passingMarks || 0;
      const totalScore = attempt.totalScore != null ? attempt.totalScore : 0;
      const percentage = typeof attempt.percentage === 'number'
        ? attempt.percentage
        : (maxMarks > 0 ? Number(((totalScore / maxMarks) * 100).toFixed(2)) : 0);

      if (isTerminated) {
        outcomeText = 'TERMINATED';
        outcomeColor = '991B1B';
      } else if (isOngoing) {
        outcomeText = 'ONGOING';
        outcomeColor = '2563EB';
      } else if (attempt.resultStatus === 'PASS') {
        outcomeText = 'PASSED';
        outcomeColor = '16A34A';
      } else if (attempt.resultStatus === 'FAIL') {
        outcomeText = 'FAILED';
        outcomeColor = 'DC2626';
      } else if (attempt.status === 'EXPIRED') {
        outcomeText = 'EXPIRED';
        outcomeColor = 'EA580C';
      } else if (passMarks > 0 && (attempt.status === 'EVALUATED' || attempt.status === 'SUBMITTED')) {
        if (totalScore >= passMarks) {
          outcomeText = 'PASSED';
          outcomeColor = '16A34A';
        } else {
          outcomeText = 'FAILED';
          outcomeColor = 'DC2626';
        }
      }

      // Performance Summary Table
      docChildren.push(
        new Paragraph({
          text: 'Examination Performance & Outcome:',
          bold: true,
          spacing: { before: 180, after: 100 },
        })
      );

      const performancePairs = [
        { label: 'Attempt Status', value: isTerminated ? 'TERMINATED' : (isOngoing ? 'IN_PROGRESS' : (attempt.status || 'SUBMITTED')) },
        { label: 'Evaluation Result', value: outcomeText, color: outcomeColor },
        { label: 'Score Earned', value: isOngoing ? 'Assessment In Progress' : `${totalScore} / ${maxMarks} (${percentage}%)`, color: outcomeColor },
        { label: 'Passing Required', value: `${passMarks} Marks` },
        ...(isTerminated ? [{
          label: 'Termination Reason',
          value: attempt.terminationReason || (attempt.violationCount > 0 ? `Exceeded violation limit (${attempt.violationCount} violations)` : 'Security violation'),
          color: '991B1B',
        }] : []),
        { label: 'Exam Started At', value: DocxExportService.formatDateTime(attempt.startedAt || attempt.createdAt, clientTimezone) },
        { label: 'Submitted Date & Time', value: DocxExportService.formatDateTime(attempt.submittedAt || attempt.updatedAt, clientTimezone) },
        { label: 'Proctoring Incidents', value: String(attempt.violationCount || 0), color: (attempt.violationCount || 0) > 0 ? 'DC2626' : '0F172A' },
        { label: 'Client IP Address', value: attempt.clientIp || 'N/A' },
      ];

      docChildren.push(DocxExportService.createKeyValueTable(performancePairs));

      // Fetch Submissions & Results for this candidate
      const submissions = await Submission.find({ attemptId: attempt._id })
        .populate('questionId', 'title description type options correctAnswer marks difficulty inputFormat outputFormat constraints examples')
        .sort({ createdAt: 1 });

      const submissionResults = await SubmissionResult.find({ attemptId: attempt._id });
      const resultMap = new Map();
      submissionResults.forEach((r) => {
        resultMap.set(String(r.questionId), r);
      });

      const subMap = new Map();
      submissions.forEach((s) => {
        const qId = String(s.questionId?._id || s.questionId);
        subMap.set(qId, s);
      });

      // Build complete question roster from exam questions
      const questionList = [];
      const seenQIds = new Set();

      if (targetExam?.questions && Array.isArray(targetExam.questions) && targetExam.questions.length > 0) {
        for (let qIdx = 0; qIdx < targetExam.questions.length; qIdx++) {
          const eq = targetExam.questions[qIdx];
          const qDoc = eq.questionId;
          if (!qDoc) continue;
          const qIdStr = String(qDoc._id || qDoc);
          seenQIds.add(qIdStr);
          questionList.push({
            question: qDoc,
            marks: eq.marks || qDoc.marks || 0,
            order: eq.order ?? qIdx,
            submission: subMap.get(qIdStr) || null,
            result: resultMap.get(qIdStr) || null,
          });
        }
      }

      // Add any submissions that weren't in targetExam.questions
      for (const sub of submissions) {
        const qIdStr = String(sub.questionId?._id || sub.questionId);
        if (!seenQIds.has(qIdStr)) {
          seenQIds.add(qIdStr);
          questionList.push({
            question: sub.questionId || { _id: qIdStr, title: 'Question' },
            marks: sub.questionId?.marks || 0,
            order: questionList.length,
            submission: sub,
            result: resultMap.get(qIdStr) || null,
          });
        }
      }

      docChildren.push(
        new Paragraph({
          text: 'Question-Wise Solutions, Code & Evaluation Breakdown:',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 140 },
        })
      );

      if (questionList.length === 0) {
        docChildren.push(
          new Paragraph({
            text: 'No question solutions recorded for this examination attempt.',
            italics: true,
            spacing: { after: 150 },
          })
        );
      } else {
        for (let qIndex = 0; qIndex < questionList.length; qIndex++) {
          const qItem = questionList[qIndex];
          const q = qItem.question || {};
          const sub = qItem.submission;
          const evalRes = qItem.result;
          const qMarks = qItem.marks || q.marks || 0;
          const qType = q.type || sub?.questionType || 'CODING';
          const qDifficulty = q.difficulty || 'MEDIUM';

          // Clean HTML from description
          const cleanDesc = (q.description || '')
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          // Question Banner
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Question #${qIndex + 1}: ${q.title || 'Problem'} `, bold: true, size: 22, color: '1E3A8A' }),
                new TextRun({
                  text: `[Type: ${qType}  |  Marks: ${qMarks}  |  Difficulty: ${qDifficulty}]`,
                  bold: true,
                  size: 18,
                  color: '64748B',
                }),
              ],
              spacing: { before: 200, after: 60 },
            })
          );

          if (cleanDesc) {
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: 'Problem Statement: ', bold: true, color: '334155', size: 17 }),
                  new TextRun({ text: cleanDesc, color: '475569', size: 17 }),
                ],
                spacing: { after: 100 },
              })
            );
          }

          // Case A: CODING QUESTION
          if (qType === 'CODING') {
            if (!sub) {
              // Not Attempted
              docChildren.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Status: ', bold: true, color: '64748B' }),
                    new TextRun({ text: 'NOT ATTEMPTED', bold: true, color: 'DC2626' }),
                    new TextRun({ text: '   |   Score Earned: ', bold: true, color: '64748B' }),
                    new TextRun({ text: `0 / ${qMarks}`, bold: true, color: 'DC2626' }),
                  ],
                  spacing: { after: 120 },
                })
              );
            } else {
              // Submitted Coding Solution
              const earnedScore = evalRes?.score != null ? evalRes.score : (sub.score || 0);
              const execStatus = evalRes?.status || sub.status || 'COMPLETED';
              const language = (sub.language || 'java').toUpperCase();
              const passedTests = evalRes?.passedTests ?? 0;
              const totalTests = evalRes?.totalTests ?? (evalRes?.testResults?.length || 0);
              const execTimeMs = evalRes?.executionTime != null ? `${(evalRes.executionTime * 1000).toFixed(0)} ms` : '—';
              const memMb = evalRes?.memoryUsed != null ? `${evalRes.memoryUsed.toFixed(2)} MB` : '—';

              const codingMetaPairs = [
                { label: 'Language Used', value: language },
                { label: 'Submission Status', value: sub.status || 'COMPLETED' },
                { label: 'Evaluation Status', value: execStatus, color: execStatus === 'PASSED' ? '16A34A' : 'DC2626' },
                { label: 'Marks Awarded', value: `${earnedScore} / ${qMarks}`, color: earnedScore > 0 ? '16A34A' : 'DC2626' },
                { label: 'Test Cases Passed', value: `${passedTests} / ${totalTests}` },
                { label: 'Execution Metrics', value: `Time: ${execTimeMs}  |  Memory: ${memMb}` },
              ];

              docChildren.push(DocxExportService.createKeyValueTable(codingMetaPairs));

              // Submitted Source Code (using sub.sourceCode || sub.code)
              docChildren.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: `Submitted Source Code (${language}):`, bold: true, color: '1E3A8A', size: 18 }),
                  ],
                  spacing: { before: 120, after: 60 },
                })
              );

              const candidateCode = sub.sourceCode || sub.code || '';
              docChildren.push(DocxExportService.createCodeBlock(candidateCode));

              // Compiler or Runtime Output if any
              if (evalRes?.compileOutput && evalRes.compileOutput.trim()) {
                docChildren.push(
                  new Paragraph({
                    text: 'Compiler / Execution Output:',
                    bold: true,
                    color: 'DC2626',
                    spacing: { before: 120, after: 40 },
                  }),
                  DocxExportService.createCodeBlock(evalRes.compileOutput)
                );
              }

              // Test Cases Execution Results Table
              if (evalRes?.testResults && evalRes.testResults.length > 0) {
                docChildren.push(
                  new Paragraph({
                    text: 'Test Cases Execution Breakdown:',
                    bold: true,
                    spacing: { before: 140, after: 80 },
                  })
                );

                const testTableRows = [
                  new TableRow({
                    tableHeader: true,
                    children: [
                      DocxExportService.createCell('#', 8, { bold: true, color: 'FFFFFF', bg: '334155', align: AlignmentType.CENTER }),
                      DocxExportService.createCell('Test Type', 18, { bold: true, color: 'FFFFFF', bg: '334155' }),
                      DocxExportService.createCell('Verdict', 24, { bold: true, color: 'FFFFFF', bg: '334155' }),
                      DocxExportService.createCell('Exec Time', 16, { bold: true, color: 'FFFFFF', bg: '334155' }),
                      DocxExportService.createCell('Memory', 16, { bold: true, color: 'FFFFFF', bg: '334155' }),
                      DocxExportService.createCell('Result Detail', 18, { bold: true, color: 'FFFFFF', bg: '334155' }),
                    ],
                  }),
                ];

                evalRes.testResults.forEach((tr, tIdx) => {
                  const tRowBg = tIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
                  const isPass = tr.passed || tr.status === 'PASSED';
                  const trTime = tr.executionTime != null ? `${(tr.executionTime * 1000).toFixed(0)} ms` : '—';
                  const trMem = tr.memoryUsed != null ? `${tr.memoryUsed.toFixed(2)} MB` : '—';

                  testTableRows.push(
                    new TableRow({
                      children: [
                        DocxExportService.createCell(String(tIdx + 1), 8, { align: AlignmentType.CENTER, bg: tRowBg }),
                        DocxExportService.createCell(tr.isHidden ? 'Hidden Test' : 'Public Test', 18, { bg: tRowBg }),
                        DocxExportService.createCell(tr.status || (isPass ? 'PASSED' : 'FAILED'), 24, {
                          bold: true,
                          color: isPass ? '16A34A' : 'DC2626',
                          bg: tRowBg,
                        }),
                        DocxExportService.createCell(trTime, 16, { bg: tRowBg }),
                        DocxExportService.createCell(trMem, 16, { bg: tRowBg }),
                        DocxExportService.createCell(isPass ? 'Matches Expected' : (tr.errorMessage || 'Wrong Output'), 18, {
                          color: isPass ? '16A34A' : 'DC2626',
                          bg: tRowBg,
                        }),
                      ],
                    })
                  );
                });

                docChildren.push(
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: testTableRows,
                  })
                );
              }
            }
          }
          // Case B: MULTIPLE CHOICE QUESTION (MCQ)
          else if (qType === 'MCQ') {
            const hasSubmission = sub && sub.selectedOption != null;
            const chosenIdx = sub?.selectedOption;
            const correctIdx = q.correctAnswer;
            const isCorrect = evalRes?.isCorrect ?? (hasSubmission && chosenIdx === correctIdx);
            const earnedMarks = evalRes?.score ?? (isCorrect ? qMarks : 0);

            const chosenText = chosenIdx != null && q.options?.[chosenIdx]
              ? q.options[chosenIdx].text
              : 'No Option Chosen';

            const correctText = correctIdx != null && q.options?.[correctIdx]
              ? q.options[correctIdx].text
              : 'Not Specified';

            const mcqPairs = [
              { label: 'Candidate Selection', value: chosenIdx != null ? `Option ${chosenIdx + 1}: ${chosenText}` : 'Not Attempted', color: isCorrect ? '16A34A' : 'DC2626' },
              { label: 'Correct Answer', value: correctIdx != null ? `Option ${correctIdx + 1}: ${correctText}` : 'N/A', color: '16A34A' },
              { label: 'Validation Verdict', value: !hasSubmission ? 'SKIPPED' : (isCorrect ? 'CORRECT' : 'INCORRECT'), color: isCorrect ? '16A34A' : 'DC2626' },
              { label: 'Marks Awarded', value: `${earnedMarks} / ${qMarks}`, color: earnedMarks > 0 ? '16A34A' : 'DC2626' },
            ];

            docChildren.push(DocxExportService.createKeyValueTable(mcqPairs));

            // Options List
            if (q.options && q.options.length > 0) {
              docChildren.push(
                new Paragraph({
                  text: 'Multiple Choice Options Roster:',
                  bold: true,
                  spacing: { before: 100, after: 60 },
                })
              );

              q.options.forEach((opt, oIdx) => {
                const isCandidateChoice = chosenIdx === oIdx;
                const isCorrectOption = correctIdx === oIdx;

                let marker = '[  ] ';
                let markerColor = '64748B';
                let tag = '';

                if (isCandidateChoice && isCorrectOption) {
                  marker = '[ ✓ ] ';
                  markerColor = '16A34A';
                  tag = '  <-- CANDIDATE SELECTED & CORRECT';
                } else if (isCandidateChoice) {
                  marker = '[ ✗ ] ';
                  markerColor = 'DC2626';
                  tag = '  <-- CANDIDATE SELECTED CHOICE';
                } else if (isCorrectOption) {
                  marker = '[ ✓ ] ';
                  markerColor = '16A34A';
                  tag = '  <-- CORRECT ANSWER';
                }

                docChildren.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: marker, bold: true, color: markerColor, font: 'Consolas', size: 18 }),
                      new TextRun({ text: `Option ${oIdx + 1}: `, bold: true, size: 18 }),
                      new TextRun({ text: opt.text || '', size: 18 }),
                      new TextRun({ text: tag, bold: true, color: markerColor, size: 16 }),
                    ],
                    spacing: { before: 20, after: 20 },
                  })
                );
              });
            }
          }

          docChildren.push(
            new Paragraph({
              text: '----------------------------------------------------------------------------------------------------',
              color: 'CBD5E1',
              spacing: { before: 140, after: 140 },
            })
          );
        }
      }

      // ==========================================
      // 5. PROCTORING VIOLATION LOGS
      // ==========================================
      const events = attempt.events || attempt.proctoringEvents || [];

      docChildren.push(
        new Paragraph({
          text: `Proctoring & Exam Integrity Incidents Log (${events.length} Detected):`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 180, after: 100 },
        })
      );

      if (events.length === 0) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Integrity Check: ', bold: true, color: '16A34A' }),
              new TextRun({ text: 'Verified Clean - Zero proctoring security incidents or tab switches detected during this session.' }),
            ],
            spacing: { after: 150 },
          })
        );
      } else {
        const eventTypeMap = {
          tab_switch: 'Tab Switch / Window Lost Focus',
          fullscreen_exit: 'Exited Fullscreen Mode',
          page_refresh: 'Browser Page Reloaded',
          exam_exit: 'Attempted Early Exam Exit',
          blur: 'Window Blur / Lost Focus',
          copy_paste: 'Clipboard Copy / Paste Attempt',
        };

        const eventTableRows = [
          new TableRow({
            tableHeader: true,
            children: [
              DocxExportService.createCell('#', 8, { bold: true, color: 'FFFFFF', bg: '991B1B', align: AlignmentType.CENTER }),
              DocxExportService.createCell('Incident Timestamp', 28, { bold: true, color: 'FFFFFF', bg: '991B1B' }),
              DocxExportService.createCell('Violation Category', 30, { bold: true, color: 'FFFFFF', bg: '991B1B' }),
              DocxExportService.createCell('Details & Remarks', 34, { bold: true, color: 'FFFFFF', bg: '991B1B' }),
            ],
          }),
        ];

        events.forEach((ev, evIdx) => {
          const evRowBg = evIdx % 2 === 0 ? 'FFFFFF' : 'FEF2F2';
          const typeName = eventTypeMap[ev.type] || (ev.type ? ev.type.toUpperCase() : 'SECURITY VIOLATION');

          eventTableRows.push(
            new TableRow({
              children: [
                DocxExportService.createCell(String(evIdx + 1), 8, { align: AlignmentType.CENTER, bg: evRowBg }),
                DocxExportService.createCell(DocxExportService.formatDateTime(ev.timestamp, clientTimezone), 28, { bg: evRowBg }),
                DocxExportService.createCell(typeName, 30, { bold: true, color: 'DC2626', bg: evRowBg }),
                DocxExportService.createCell(ev.details || 'Candidate breached browser security bounds.', 34, { bg: evRowBg }),
              ],
            })
          );
        });

        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: eventTableRows,
          }),
          new Paragraph({
            spacing: { after: 150 },
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}

export default DocxExportService;
