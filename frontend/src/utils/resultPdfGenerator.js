import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and downloads a clean, professional PDF scorecard for a student's examination result.
 * 
 * @param {Object} data - Contains { attempt, questionBreakdown }
 */
export function generateResultPdf(data) {
  if (!data?.attempt) {
    throw new Error('Result data is incomplete');
  }

  const { attempt, questionBreakdown = [] } = data;
  const user = attempt.user || {};
  const exam = attempt.exam || {};

  const isTerminated = attempt.status === 'TERMINATED' || attempt.resultStatus === 'TERMINATED';
  const isOngoing = attempt.status === 'IN_PROGRESS' || attempt.resultStatus === 'ONGOING';
  const isPass = !isTerminated && attempt.resultStatus === 'PASS';

  // Create A4 portrait document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let currentY = 40;

  // 1. TOP HEADER BRANDING
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin, currentY, contentWidth, 54, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(margin, currentY, contentWidth, 54, 'S');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('CodeAssess', margin + 14, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('ASSESSMENT & PROCTORING CORE', margin + 14, currentY + 38);

  // Document Title (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(79, 107, 247); // #4f6bf7
  doc.text('OFFICIAL PERFORMANCE SCORECARD', pageWidth - margin - 14, currentY + 24, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated on: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - margin - 14,
    currentY + 38,
    { align: 'right' }
  );

  currentY += 66;

  // 2. CANDIDATE & EXAMINATION METADATA CARDS (2 COLUMNS)
  const colWidth = (contentWidth - 12) / 2;

  // Candidate Details Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, colWidth, 90, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('CANDIDATE INFORMATION', margin + 12, currentY + 18);
  doc.setDrawColor(241, 245, 249);
  doc.line(margin + 12, currentY + 24, margin + colWidth - 12, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  doc.text('Name:', margin + 12, currentY + 38);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(user.name || 'Student Candidate', margin + 70, currentY + 38);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Roll / ID:', margin + 12, currentY + 52);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(user.studentId || user.rollNumber || 'N/A', margin + 70, currentY + 52);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Email:', margin + 12, currentY + 66);
  doc.setTextColor(30, 41, 59);
  doc.text(user.email || 'N/A', margin + 70, currentY + 66);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Batch:', margin + 12, currentY + 80);
  doc.setTextColor(30, 41, 59);
  doc.text(user.batch || 'General Batch', margin + 70, currentY + 80);

  // Examination Details Card
  const col2X = margin + colWidth + 12;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(col2X, currentY, colWidth, 90, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('EXAMINATION DETAILS', col2X + 12, currentY + 18);
  doc.setDrawColor(241, 245, 249);
  doc.line(col2X + 12, currentY + 24, col2X + colWidth - 12, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  doc.text('Exam:', col2X + 12, currentY + 38);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const examTitleText = doc.splitTextToSize(exam.title || 'Coding Assessment', colWidth - 80);
  doc.text(examTitleText[0] || 'Coding Assessment', col2X + 70, currentY + 38);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Date:', col2X + 12, currentY + 52);
  doc.setTextColor(30, 41, 59);
  doc.text(
    new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    col2X + 70,
    currentY + 52
  );

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Duration:', col2X + 12, currentY + 66);
  doc.setTextColor(30, 41, 59);
  doc.text(`${exam.duration || '—'} Minutes`, col2X + 70, currentY + 66);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Passing Marks:', col2X + 12, currentY + 80);
  doc.setTextColor(30, 41, 59);
  doc.text(`${exam.passingMarks || 0} Marks`, col2X + 70, currentY + 80);

  currentY += 102;

  // 3. OVERALL SCORE & RESULT STATUS SUMMARY BANNER
  let statusBg = [240, 253, 244]; // emerald-50
  let statusBorder = [187, 247, 208]; // emerald-200
  let statusText = [22, 101, 52]; // emerald-800
  let statusLabel = 'PASSED';

  if (isTerminated) {
    statusBg = [255, 241, 242]; // rose-50
    statusBorder = [254, 205, 211]; // rose-200
    statusText = [159, 18, 57]; // rose-800
    statusLabel = 'TERMINATED';
  } else if (isOngoing) {
    statusBg = [239, 246, 255]; // blue-50
    statusBorder = [191, 219, 254]; // blue-200
    statusText = [30, 64, 175]; // blue-800
    statusLabel = 'ONGOING';
  } else if (!isPass) {
    statusBg = [255, 241, 242]; // rose-50
    statusBorder = [254, 205, 211]; // rose-200
    statusText = [159, 18, 57]; // rose-800
    statusLabel = 'FAILED';
  }

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.setDrawColor(statusBorder[0], statusBorder[1], statusBorder[2]);
  doc.rect(margin, currentY, contentWidth, 58, 'FD');

  // Left: Total Score
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL MARKS EARNED', margin + 16, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  const scoreDisplay = isOngoing ? 'In Progress' : `${attempt.totalScore || 0} / ${attempt.maxScore || 0}`;
  doc.text(scoreDisplay, margin + 16, currentY + 42);

  // Center: Percentage
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PERCENTAGE', margin + 190, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(isOngoing ? '—' : `${attempt.percentage || 0}%`, margin + 190, currentY + 42);

  // Center-Right: Violations
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PROCTORING VIOLATIONS', margin + 310, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(attempt.violationCount > 0 ? 225 : 71, attempt.violationCount > 0 ? 29 : 85, attempt.violationCount > 0 ? 72 : 105);
  doc.text(`${attempt.violationCount || 0} Recorded`, margin + 310, currentY + 42);

  // Right: Final Status Stamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.text(statusLabel, pageWidth - margin - 16, currentY + 36, { align: 'right' });

  currentY += 68;

  // 4. TERMINATED WARNING BANNER (IF APPLICABLE)
  if (isTerminated) {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(244, 63, 94);
    doc.rect(margin, currentY, contentWidth, 34, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(159, 18, 57);
    doc.text('SECURITY NOTICE: EXAMINATION TERMINATED', margin + 12, currentY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(190, 18, 60);
    const reasonText = attempt.terminationReason || 'This exam was terminated by automated proctoring security rules.';
    doc.text(`Reason: ${reasonText}`, margin + 12, currentY + 26);

    currentY += 42;
  }

  // 5. QUESTION-WISE PERFORMANCE TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Question-Wise Evaluation Breakdown', margin, currentY + 4);
  currentY += 12;

  const tableRows = questionBreakdown.map((item, idx) => {
    const res = item.result;
    const isMcq = item.questionType === 'MCQ';
    const status = res ? res.status : 'PENDING';

    let displayStatus = status;
    if (status === 'PASSED' && isMcq) displayStatus = 'CORRECT';
    if (status === 'WRONG_ANSWER' && isMcq) displayStatus = 'INCORRECT';

    const testInfo = isMcq
      ? (status === 'PASSED' ? 'Passed' : 'Failed')
      : res && res.totalTests > 0
      ? `${res.passedTests || 0} / ${res.totalTests}`
      : '—';

    const scoreEarned = res ? res.score : 0;
    const maxScore = item.maxMarks || (res ? res.maxScore : 0);

    return [
      `Q${idx + 1}`,
      item.questionTitle || 'Question',
      isMcq ? 'MCQ' : 'Coding',
      isMcq ? 'Multiple Choice' : (item.language || 'code').toUpperCase(),
      displayStatus.replace('_', ' '),
      testInfo,
      `${scoreEarned} / ${maxScore}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Question Title', 'Type', 'Format/Lang', 'Status', 'Test Cases', 'Marks']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 6,
    },
    bodyStyles: {
      textColor: [51, 65, 85],
      fontSize: 8,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.5 },
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold', textColor: [79, 107, 247] },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 45 },
      3: { cellWidth: 65 },
      4: { cellWidth: 80, fontStyle: 'bold' },
      5: { cellWidth: 55, halign: 'center' },
      6: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const val = hookData.cell.raw;
        if (val === 'PASSED' || val === 'CORRECT') {
          hookData.cell.styles.textColor = [16, 185, 129];
        } else if (val === 'WRONG ANSWER' || val === 'INCORRECT' || val === 'RUNTIME ERROR') {
          hookData.cell.styles.textColor = [239, 68, 68];
        } else if (val === 'PARTIAL') {
          hookData.cell.styles.textColor = [217, 119, 6];
        } else if (val === 'COMPILE ERROR') {
          hookData.cell.styles.textColor = [147, 51, 234];
        } else if (val === 'TIME LIMIT EXCEEDED') {
          hookData.cell.styles.textColor = [234, 88, 12];
        }
      }
    },
  });

  // 6. PAGE NUMBERS & CERTIFICATION FOOTER ON ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'CodeAssess Automated Evaluation Engine • Certified Proctoring Integrity Record',
      margin,
      pageHeight - 20
    );

    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  // Sanitize filename for download
  const cleanStudentName = (user.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanExamTitle = (exam.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanStudentName}_${cleanExamTitle}_Result.pdf`;

  doc.save(filename);
}
