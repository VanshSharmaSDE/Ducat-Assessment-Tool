import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx';
import { Exam } from '../models/Exam.js';
import { User } from '../models/User.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';

export class DocxExportService {
  /**
   * Generate Word Document for submissions
   * If userId is provided, generates single candidate report.
   * If only examId is provided, generates report for all candidates in that exam.
   */
  static async generateSubmissionsDocx({ examId, userId }) {
    let exam = null;
    if (examId) {
      exam = await Exam.findById(examId);
    }

    const docChildren = [];

    // Document Header
    docChildren.push(
      new Paragraph({
        text: 'CODEASSESS PLATFORM - CANDIDATE SUBMISSION REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Generated On: ${new Date().toLocaleString()}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    if (exam) {
      docChildren.push(
        new Paragraph({
          text: `Examination: ${exam.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Duration: ', bold: true }),
            new TextRun(`${exam.duration} Minutes   |   `),
            new TextRun({ text: 'Total Marks: ', bold: true }),
            new TextRun(`${exam.totalMarks}   |   `),
            new TextRun({ text: 'Passing Marks: ', bold: true }),
            new TextRun(`${exam.passingMarks}`),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // Determine target attempts
    const attemptQuery = {};
    if (examId) attemptQuery.examId = examId;
    if (userId) attemptQuery.userId = userId;

    const attempts = await ExamAttempt.find(attemptQuery)
      .populate('userId', 'name email rollNumber batch gender age')
      .populate('examId', 'title totalMarks passingMarks duration questions')
      .sort({ createdAt: -1 });

    if (attempts.length === 0) {
      docChildren.push(
        new Paragraph({
          text: 'No exam attempts or submissions found for the specified criteria.',
          spacing: { before: 200 },
        })
      );
    }

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const student = attempt.userId || {};
      const targetExam = attempt.examId || exam || {};

      // Student Header
      docChildren.push(
        new Paragraph({
          text: `Candidate #${i + 1}: ${student.name || 'Anonymous'}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Email: ', bold: true }),
            new TextRun(`${student.email || 'N/A'}   |   `),
            new TextRun({ text: 'Roll Number: ', bold: true }),
            new TextRun(`${student.rollNumber || 'N/A'}   |   `),
            new TextRun({ text: 'Batch: ', bold: true }),
            new TextRun(`${student.batch || 'N/A'}   |   `),
            new TextRun({ text: 'Gender: ', bold: true }),
            new TextRun(`${student.gender || 'N/A'}   |   `),
            new TextRun({ text: 'Age: ', bold: true }),
            new TextRun(`${student.age ? String(student.age) : 'N/A'}`),
          ],
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Attempt Status: ', bold: true }),
            new TextRun(`${attempt.status}   |   `),
            new TextRun({ text: 'Score: ', bold: true }),
            new TextRun(`${attempt.totalScore || 0} / ${targetExam.totalMarks || 100} (${attempt.percentage || 0}%)   |   `),
            new TextRun({ text: 'Result: ', bold: true }),
            new TextRun(`${attempt.passed ? 'PASSED' : 'NOT PASSED'}   |   `),
            new TextRun({ text: 'Violations: ', bold: true }),
            new TextRun(`${attempt.violationCount || 0}`),
          ],
          spacing: { after: 200 },
        })
      );

      // Fetch Submissions for this attempt
      const submissions = await Submission.find({ attemptId: attempt._id })
        .populate('questionId', 'title marks difficulty')
        .sort({ createdAt: 1 });

      const submissionResults = await SubmissionResult.find({ attemptId: attempt._id });
      const resultMap = new Map();
      submissionResults.forEach((r) => {
        resultMap.set(String(r.questionId), r);
      });

      if (submissions.length === 0) {
        docChildren.push(
          new Paragraph({
            text: 'No question solutions submitted by this candidate.',
            spacing: { after: 200 },
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            text: 'Problem Submissions & Executed Code:',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 150 },
          })
        );

        for (const sub of submissions) {
          const q = sub.questionId || {};
          const evalRes = resultMap.get(String(q._id || sub.questionId));

          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Question: ${q.title || 'Problem'} `, bold: true }),
                new TextRun(`[Marks: ${q.marks || 0} | Difficulty: ${q.difficulty || 'MEDIUM'}]`),
              ],
              spacing: { before: 200, after: 80 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Language: ', bold: true }),
                new TextRun(`${(sub.language || 'java').toUpperCase()}   |   `),
                new TextRun({ text: 'Status: ', bold: true }),
                new TextRun(`${sub.status}   |   `),
                new TextRun({ text: 'Score Earned: ', bold: true }),
                new TextRun(`${evalRes?.earnedMarks || sub.score || 0} / ${q.marks || 0}`),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: 'Submitted Source Code:',
              italics: true,
              spacing: { after: 60 },
            })
          );

          // Code block paragraph formatted with monospace
          const codeLines = (sub.code || '// No source code provided').split('\n');
          const codeParagraphs = codeLines.map((line) => {
            return new Paragraph({
              children: [
                new TextRun({
                  text: line || ' ',
                  font: 'Consolas',
                  size: 18,
                }),
              ],
              spacing: { before: 20, after: 20 },
            });
          });

          docChildren.push(...codeParagraphs);

          // Test Cases summary if available
          if (evalRes?.testResults && evalRes.testResults.length > 0) {
            docChildren.push(
              new Paragraph({
                text: 'Test Case Execution Results:',
                bold: true,
                spacing: { before: 150, after: 80 },
              })
            );

            const tableRows = [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '#', bold: true })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: 'Status', bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: 'Exec Time', bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: 'Marks', bold: true })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                ],
              }),
            ];

            evalRes.testResults.forEach((tr, tIdx) => {
              tableRows.push(
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(String(tIdx + 1))] }),
                    new TableCell({ children: [new Paragraph(tr.passed ? 'PASSED' : tr.status || 'FAILED')] }),
                    new TableCell({ children: [new Paragraph(`${tr.executionTimeMs || 0} ms`)] }),
                    new TableCell({ children: [new Paragraph(`${tr.marksEarned || 0} / ${tr.marks || 0}`)] }),
                  ],
                })
              );
            });

            docChildren.push(
              new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          }

          docChildren.push(
            new Paragraph({
              text: '----------------------------------------------------------------------------------',
              spacing: { before: 150, after: 150 },
            })
          );
        }
      }

      // Proctoring Events
      if (attempt.proctoringEvents && attempt.proctoringEvents.length > 0) {
        docChildren.push(
          new Paragraph({
            text: 'Security & Proctoring Incidents Logged:',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );

        attempt.proctoringEvents.forEach((ev, evIdx) => {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${evIdx + 1}. [${new Date(ev.timestamp).toLocaleTimeString()}] `, bold: true }),
                new TextRun({ text: `${ev.type.toUpperCase()}: `, color: 'C00000', bold: true }),
                new TextRun(ev.details || ''),
              ],
              spacing: { after: 50 },
            })
          );
        });
      }

      docChildren.push(
        new Paragraph({
          text: '==================================================================================',
          spacing: { before: 300, after: 300 },
        })
      );
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
