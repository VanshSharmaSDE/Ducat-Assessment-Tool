import * as XLSX from 'xlsx';
import { Question } from '../models/Question.js';
import { TestCase } from '../models/TestCase.js';
import { DEFAULT_STARTER_CODE, SUPPORTED_LANGUAGES } from '../utils/starterCode.js';

export class QuestionExcelService {
  /**
   * Generates a sample Excel template for bulk question uploading
   */
  static generateTemplate() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template data with examples
    const sampleRows = [
      {
        'Title': 'Reverse String',
        'Description': 'Given a single line string s, print the reverse of the string.',
        'Difficulty': 'EASY',
        'Marks': 10,
        'AllowedLanguages': 'java, python, javascript',
        'InputFormat': 'Single string without spaces',
        'OutputFormat': 'The reversed string',
        'Constraints': '1 <= length <= 1000',
        'SampleInput1': 'hello',
        'SampleOutput1': 'olleh',
        'Explanation1': 'Reversing "hello" produces "olleh".',
        'HiddenInput1': 'world',
        'HiddenOutput1': 'dlrow',
        'HiddenInput2': 'programming',
        'HiddenOutput2': 'gnimmargorp',
        'HiddenInput3': '12345',
        'HiddenOutput3': '54321',
      },
      {
        'Title': 'Find Maximum Number',
        'Description': 'Given an array of n integers, find and print the maximum integer in the array.',
        'Difficulty': 'EASY',
        'Marks': 15,
        'AllowedLanguages': 'java, python, javascript',
        'InputFormat': 'First line contains n. Second line contains n space-separated integers.',
        'OutputFormat': 'Print the maximum integer.',
        'Constraints': '1 <= n <= 10^5, -10^9 <= arr[i] <= 10^9',
        'SampleInput1': '5\n1 9 3 7 4',
        'SampleOutput1': '9',
        'Explanation1': 'The maximum element among 1, 9, 3, 7, 4 is 9.',
        'HiddenInput1': '3\n-10 -5 -20',
        'HiddenOutput1': '-5',
        'HiddenInput2': '1\n100',
        'HiddenOutput2': '100',
        'HiddenInput3': '4\n50 50 50 50',
        'HiddenOutput3': '50',
      },
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Questions_Template');

    // Sheet 2: Guidelines
    const guidelines = [
      { 'Field': 'Title', 'Required': 'YES', 'Description': 'Problem statement title (e.g. Two Sum, Palindrome Check)' },
      { 'Field': 'Description', 'Required': 'YES', 'Description': 'Full problem description and instructions for candidates' },
      { 'Field': 'Difficulty', 'Required': 'NO', 'Description': 'EASY, MEDIUM, or HARD (default: MEDIUM)' },
      { 'Field': 'Marks', 'Required': 'NO', 'Description': 'Integer points awarded for this problem (default: 10)' },
      { 'Field': 'AllowedLanguages', 'Required': 'NO', 'Description': 'Comma-separated (java, python, javascript)' },
      { 'Field': 'InputFormat', 'Required': 'NO', 'Description': 'Explanation of standard input format' },
      { 'Field': 'OutputFormat', 'Required': 'NO', 'Description': 'Explanation of expected stdout format' },
      { 'Field': 'Constraints', 'Required': 'NO', 'Description': 'Data type ranges and problem limits' },
      { 'Field': 'SampleInput1', 'Required': 'NO', 'Description': 'Public sample input visible to candidate in problem description' },
      { 'Field': 'SampleOutput1', 'Required': 'NO', 'Description': 'Public sample expected output' },
      { 'Field': 'Explanation1', 'Required': 'NO', 'Description': 'Optional explanation for Sample 1' },
      { 'Field': 'HiddenInput1..5', 'Required': 'RECOMMENDED', 'Description': 'Hidden test case input used during Docker evaluation' },
      { 'Field': 'HiddenOutput1..5', 'Required': 'RECOMMENDED', 'Description': 'Hidden test case expected output used during evaluation' },
    ];

    const wsGuidelines = XLSX.utils.json_to_sheet(guidelines);
    XLSX.utils.book_append_sheet(wb, wsGuidelines, 'Guidelines');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Imports questions and their test cases from an uploaded Excel workbook
   */
  static async importQuestions(fileBuffer, creatorId) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      throw new Error('Uploaded Excel sheet is empty or contains no valid rows.');
    }

    const createdQuestions = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const title = String(row['Title'] || row['title'] || row['Question Title'] || '').trim();
      const description = String(row['Description'] || row['description'] || '').trim();

      if (!title || !description) {
        errors.push(`Row ${rowNum}: Title and Description are required.`);
        continue;
      }

      let difficulty = String(row['Difficulty'] || row['difficulty'] || 'MEDIUM').toUpperCase().trim();
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        difficulty = 'MEDIUM';
      }

      const marks = Number(row['Marks'] || row['marks'] || 10) || 10;
      const inputFormat = String(row['InputFormat'] || row['input_format'] || row['Input Format'] || '').trim();
      const outputFormat = String(row['OutputFormat'] || row['output_format'] || row['Output Format'] || '').trim();
      const constraints = String(row['Constraints'] || row['constraints'] || '').trim();

      // Parse Allowed Languages
      let allowedLanguages = SUPPORTED_LANGUAGES;
      const rawLangs = row['AllowedLanguages'] || row['allowed_languages'] || row['Languages'];
      if (rawLangs) {
        const parsed = String(rawLangs)
          .split(',')
          .map((l) => l.trim().toLowerCase())
          .filter((l) => SUPPORTED_LANGUAGES.includes(l));
        if (parsed.length > 0) allowedLanguages = parsed;
      }

      // Build examples
      const examples = [];
      const sampleIn1 = row['SampleInput1'] || row['SampleInput'] || row['sample_input'];
      const sampleOut1 = row['SampleOutput1'] || row['SampleOutput'] || row['sample_output'];
      if (sampleIn1 !== undefined && sampleOut1 !== undefined) {
        examples.push({
          input: String(sampleIn1),
          output: String(sampleOut1),
          explanation: String(row['Explanation1'] || row['Explanation'] || ''),
        });
      }

      const sampleIn2 = row['SampleInput2'];
      const sampleOut2 = row['SampleOutput2'];
      if (sampleIn2 !== undefined && sampleOut2 !== undefined) {
        examples.push({
          input: String(sampleIn2),
          output: String(sampleOut2),
          explanation: String(row['Explanation2'] || ''),
        });
      }

      try {
        // Create Question Document
        const question = await Question.create({
          title,
          description,
          difficulty,
          marks,
          allowedLanguages,
          inputFormat,
          outputFormat,
          constraints,
          examples,
          starterCode: DEFAULT_STARTER_CODE,
          createdBy: creatorId,
        });

        // Create Test Cases
        const testCasesToCreate = [];

        // 1. If sample test case exists, add as public test case
        if (sampleIn1 !== undefined && sampleOut1 !== undefined) {
          testCasesToCreate.push({
            questionId: question._id,
            input: String(sampleIn1),
            expectedOutput: String(sampleOut1),
            isHidden: false,
            marks: 0,
            order: 0,
          });
        }

        // 2. Collect hidden test cases (HiddenInput1..5)
        const hiddenCases = [];
        for (let h = 1; h <= 10; h++) {
          const inKey = `HiddenInput${h}`;
          const outKey = `HiddenOutput${h}`;
          if (row[inKey] !== undefined && row[outKey] !== undefined) {
            hiddenCases.push({
              input: String(row[inKey]),
              expectedOutput: String(row[outKey]),
            });
          }
        }

        // If no hidden test cases provided, fallback to sample input if available
        if (hiddenCases.length === 0 && sampleIn1 !== undefined && sampleOut1 !== undefined) {
          hiddenCases.push({
            input: String(sampleIn1),
            expectedOutput: String(sampleOut1),
          });
        }

        const marksPerCase = hiddenCases.length > 0 ? Math.max(1, Math.round(marks / hiddenCases.length)) : marks;

        hiddenCases.forEach((hc, idx) => {
          testCasesToCreate.push({
            questionId: question._id,
            input: hc.input,
            expectedOutput: hc.expectedOutput,
            isHidden: true,
            marks: idx === hiddenCases.length - 1 ? marks - marksPerCase * (hiddenCases.length - 1) : marksPerCase,
            order: idx + 1,
          });
        });

        if (testCasesToCreate.length > 0) {
          await TestCase.insertMany(testCasesToCreate);
        }

        createdQuestions.push({
          id: question._id,
          title: question.title,
          testCasesCount: testCasesToCreate.length,
        });
      } catch (qErr) {
        errors.push(`Row ${rowNum} (${title}): ${qErr.message}`);
      }
    }

    return {
      importedCount: createdQuestions.length,
      failedCount: errors.length,
      createdQuestions,
      errors,
    };
  }
}
export default QuestionExcelService;
