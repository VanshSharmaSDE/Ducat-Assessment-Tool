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
        'Title *': 'Reverse String',
        'Description *': 'Given a single line string s, print the reverse of the string.',
        'SampleInput1 *': 'hello',
        'SampleOutput1 *': 'olleh',
        'HiddenInput1 *': 'world',
        'HiddenOutput1 *': 'dlrow',
        'Difficulty': 'EASY',
        'Marks': 10,
        'AllowedLanguages': 'java, python, javascript',
        'InputFormat': 'Single string without spaces',
        'OutputFormat': 'The reversed string',
        'Constraints': '1 <= length <= 1000',
        'Explanation1': 'Reversing "hello" produces "olleh".',
        'HiddenInput2': 'programming',
        'HiddenOutput2': 'gnimmargorp',
        'HiddenInput3': '12345',
        'HiddenOutput3': '54321',
      },
      {
        'Title *': 'Find Maximum Number',
        'Description *': 'Given an array of n integers, find and print the maximum integer in the array.',
        'SampleInput1 *': '5\n1 9 3 7 4',
        'SampleOutput1 *': '9',
        'HiddenInput1 *': '3\n-10 -5 -20',
        'HiddenOutput1 *': '-5',
        'Difficulty': 'EASY',
        'Marks': 15,
        'AllowedLanguages': 'java, python, javascript',
        'InputFormat': 'First line contains n. Second line contains n space-separated integers.',
        'OutputFormat': 'Print the maximum integer.',
        'Constraints': '1 <= n <= 10^5, -10^9 <= arr[i] <= 10^9',
        'Explanation1': 'The maximum element among 1, 9, 3, 7, 4 is 9.',
        'HiddenInput2': '1\n100',
        'HiddenOutput2': '100',
        'HiddenInput3': '4\n50 50 50 50',
        'HiddenOutput3': '50',
      },
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Questions_Template');

    // Sheet 2: Guidelines (Mandatory vs Optional)
    const guidelines = [
      { 'Field Name': 'Title *', 'Status': 'MANDATORY (*)', 'Description': 'Problem statement title (e.g. Reverse String, Two Sum)' },
      { 'Field Name': 'Description *', 'Status': 'MANDATORY (*)', 'Description': 'Full problem description and instructions for candidates' },
      { 'Field Name': 'SampleInput1 *', 'Status': 'MANDATORY (*)', 'Description': 'Public / Unhidden Test Case 1 input visible to candidate in test cases console' },
      { 'Field Name': 'SampleOutput1 *', 'Status': 'MANDATORY (*)', 'Description': 'Public / Unhidden Test Case 1 expected output' },
      { 'Field Name': 'HiddenInput1 *', 'Status': 'MANDATORY (*)', 'Description': 'Hidden / Private Test Case 1 input used for final evaluation and marks' },
      { 'Field Name': 'HiddenOutput1 *', 'Status': 'MANDATORY (*)', 'Description': 'Hidden / Private Test Case 1 expected output' },
      { 'Field Name': 'Difficulty', 'Status': 'OPTIONAL', 'Description': 'EASY, MEDIUM, or HARD (default: MEDIUM if blank)' },
      { 'Field Name': 'Marks', 'Status': 'OPTIONAL', 'Description': 'Integer points awarded for this problem (default: 10 if blank)' },
      { 'Field Name': 'AllowedLanguages', 'Status': 'OPTIONAL', 'Description': 'Comma-separated (java, python, javascript). Default: all allowed' },
      { 'Field Name': 'InputFormat', 'Status': 'OPTIONAL', 'Description': 'Explanation of standard input format' },
      { 'Field Name': 'OutputFormat', 'Status': 'OPTIONAL', 'Description': 'Explanation of expected stdout format' },
      { 'Field Name': 'Constraints', 'Status': 'OPTIONAL', 'Description': 'Data type ranges and problem limits' },
      { 'Field Name': 'Explanation1', 'Status': 'OPTIONAL', 'Description': 'Optional explanation for Sample 1' },
      { 'Field Name': 'SampleInput2..N', 'Status': 'OPTIONAL', 'Description': 'Additional public unhidden test case input' },
      { 'Field Name': 'SampleOutput2..N', 'Status': 'OPTIONAL', 'Description': 'Additional public unhidden test case output' },
      { 'Field Name': 'HiddenInput2..10', 'Status': 'OPTIONAL', 'Description': 'Additional hidden test case input' },
      { 'Field Name': 'HiddenOutput2..10', 'Status': 'OPTIONAL', 'Description': 'Additional hidden test case expected output' },
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

      const title = String(
        row['Title *'] || row['Title'] || row['title'] || row['Question Title'] || ''
      ).trim();
      const description = String(
        row['Description *'] || row['Description'] || row['description'] || ''
      ).trim();

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

      // Build examples & public test cases
      const sampleIn1 = row['SampleInput1 *'] ?? row['SampleInput1'] ?? row['SampleInput'] ?? row['sample_input'];
      const sampleOut1 = row['SampleOutput1 *'] ?? row['SampleOutput1'] ?? row['SampleOutput'] ?? row['sample_output'];
      const hiddenIn1 = row['HiddenInput1 *'] ?? row['HiddenInput1'] ?? row['HiddenInput'] ?? row['hidden_input'];
      const hiddenOut1 = row['HiddenOutput1 *'] ?? row['HiddenOutput1'] ?? row['HiddenOutput'] ?? row['hidden_output'];

      if (sampleIn1 === undefined || sampleOut1 === undefined) {
        errors.push(`Row ${rowNum}: Public unhidden test case (SampleInput1 * and SampleOutput1 *) is mandatory.`);
        continue;
      }

      if (hiddenIn1 === undefined || hiddenOut1 === undefined) {
        errors.push(`Row ${rowNum}: Hidden test case (HiddenInput1 * and HiddenOutput1 *) is mandatory.`);
        continue;
      }

      const examples = [];
      examples.push({
        input: String(sampleIn1),
        output: String(sampleOut1),
        explanation: String(row['Explanation1'] || row['Explanation'] || ''),
      });

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

        // 1. If sample test case exists, add as public unhidden test case(s)
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

        for (let s = 2; s <= 5; s++) {
          const sIn = row[`SampleInput${s} *`] ?? row[`SampleInput${s}`];
          const sOut = row[`SampleOutput${s} *`] ?? row[`SampleOutput${s}`];
          if (sIn !== undefined && sOut !== undefined) {
            testCasesToCreate.push({
              questionId: question._id,
              input: String(sIn),
              expectedOutput: String(sOut),
              isHidden: false,
              marks: 0,
              order: s - 1,
            });
          }
        }

        // 2. Collect hidden test cases (HiddenInput1..10)
        const hiddenCases = [];
        if (hiddenIn1 !== undefined && hiddenOut1 !== undefined) {
          hiddenCases.push({
            input: String(hiddenIn1),
            expectedOutput: String(hiddenOut1),
          });
        }
        for (let h = 2; h <= 10; h++) {
          const inKey = row[`HiddenInput${h} *`] ?? row[`HiddenInput${h}`];
          const outKey = row[`HiddenOutput${h} *`] ?? row[`HiddenOutput${h}`];
          if (inKey !== undefined && outKey !== undefined) {
            hiddenCases.push({
              input: String(inKey),
              expectedOutput: String(outKey),
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

  /**
   * Generates a sample Excel template for bulk MCQ questions uploading
   */
  static generateMcqTemplate() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template data with sample MCQs
    const sampleRows = [
      {
        'Question Title *': 'What is the time complexity of searching in a balanced Binary Search Tree?',
        'Option A *': 'O(1)',
        'Option B *': 'O(log n)',
        'Option C': 'O(n)',
        'Option D': 'O(n log n)',
        'Option E': '',
        'Correct Answer *': 'B',
        'Difficulty': 'EASY',
        'Marks': 1,
        'Description': 'Consider a self-balancing binary search tree (such as AVL or Red-Black tree) containing n elements.',
        'Explanation': 'In a balanced BST, the maximum height of the tree is O(log n), so search operation runs in O(log n) time.',
        'Tags': 'Data Structures, Trees, BST',
      },
      {
        'Question Title *': 'Which HTTP status code signifies that a resource was successfully created?',
        'Option A *': '200 OK',
        'Option B *': '201 Created',
        'Option C': '204 No Content',
        'Option D': '400 Bad Request',
        'Option E': '',
        'Correct Answer *': 'B',
        'Difficulty': 'EASY',
        'Marks': 1,
        'Description': 'RESTful API standard convention for resource creation response.',
        'Explanation': 'HTTP 201 Created status indicates that the request has been fulfilled and has resulted in one or more new resources being created.',
        'Tags': 'Web, Networking, HTTP, REST',
      },
      {
        'Question Title *': 'Which sorting algorithm has a worst-case time complexity of O(n^2)?',
        'Option A *': 'Merge Sort',
        'Option B *': 'Quick Sort',
        'Option C': 'Heap Sort',
        'Option D': 'Counting Sort',
        'Option E': '',
        'Correct Answer *': 'B',
        'Difficulty': 'MEDIUM',
        'Marks': 2,
        'Description': '',
        'Explanation': 'Quick Sort has average time complexity of O(n log n), but in the worst case (e.g. already sorted array with unbalanced pivot choices) it degrades to O(n^2).',
        'Tags': 'Algorithms, Sorting, Complexity',
      },
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'MCQ_Template');

    // Sheet 2: Guidelines (Mandatory vs Optional)
    const guidelines = [
      { 'Field Name': 'Question Title *', 'Status': 'MANDATORY (*)', 'Description': 'The question text or problem statement (e.g. What is the time complexity...)' },
      { 'Field Name': 'Option A *', 'Status': 'MANDATORY (*)', 'Description': 'First choice alternative text (mandatory)' },
      { 'Field Name': 'Option B *', 'Status': 'MANDATORY (*)', 'Description': 'Second choice alternative text (mandatory)' },
      { 'Field Name': 'Correct Answer *', 'Status': 'MANDATORY (*)', 'Description': 'Correct option letter (A, B, C, D, E) or 1-based index (1, 2, 3, 4, 5)' },
      { 'Field Name': 'Option C', 'Status': 'OPTIONAL', 'Description': 'Third choice alternative text' },
      { 'Field Name': 'Option D', 'Status': 'OPTIONAL', 'Description': 'Fourth choice alternative text' },
      { 'Field Name': 'Option E', 'Status': 'OPTIONAL', 'Description': 'Fifth choice alternative text' },
      { 'Field Name': 'Difficulty', 'Status': 'OPTIONAL', 'Description': 'EASY, MEDIUM, or HARD (default: MEDIUM)' },
      { 'Field Name': 'Marks', 'Status': 'OPTIONAL', 'Description': 'Marks awarded for correct answer (default: 1)' },
      { 'Field Name': 'Description', 'Status': 'OPTIONAL', 'Description': 'Optional context, code snippet, or background details' },
      { 'Field Name': 'Explanation', 'Status': 'OPTIONAL', 'Description': 'Detailed explanation displayed in evaluation dossier / candidate review' },
      { 'Field Name': 'Tags', 'Status': 'OPTIONAL', 'Description': 'Comma-separated keywords or categories (e.g. Algorithms, Trees)' },
    ];

    const wsGuidelines = XLSX.utils.json_to_sheet(guidelines);
    XLSX.utils.book_append_sheet(wb, wsGuidelines, 'Guidelines');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Imports MCQ questions from an uploaded Excel workbook
   */
  static async importMcqQuestions(fileBuffer, creatorId) {
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

      const title = String(
        row['Question Title *'] || row['Question Title'] || row['Title *'] || row['Title'] || row['Question *'] || row['Question'] || row['title'] || ''
      ).trim();
      const description = String(row['Description'] || row['description'] || '').trim();

      if (!title) {
        errors.push(`Row ${rowNum}: Question Title is required.`);
        continue;
      }

      // Collect options: Option A, Option B, Option C, Option D, Option E
      const rawOptions = [];
      const optionKeys = [
        ['Option A *', 'Option A', 'OptionA', 'optionA', 'option_a', 'A'],
        ['Option B *', 'Option B', 'OptionB', 'optionB', 'option_b', 'B'],
        ['Option C', 'OptionC', 'optionC', 'option_c', 'C'],
        ['Option D', 'OptionD', 'optionD', 'option_d', 'D'],
        ['Option E', 'OptionE', 'optionE', 'option_e', 'E'],
      ];

      for (let optIdx = 0; optIdx < optionKeys.length; optIdx++) {
        const keys = optionKeys[optIdx];
        let val = '';
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
            val = String(row[k]).trim();
            break;
          }
        }
        if (val) {
          rawOptions.push({ text: val });
        }
      }

      if (rawOptions.length < 2) {
        errors.push(`Row ${rowNum} ("${title.slice(0, 30)}..."): At least 2 options (Option A and Option B) are required.`);
        continue;
      }

      // Parse Correct Answer
      const rawCorrect =
        row['Correct Answer *'] ||
        row['Correct Answer'] ||
        row['CorrectAnswer'] ||
        row['correctAnswer'] ||
        row['Correct Option *'] ||
        row['Correct Option'] ||
        row['CorrectOption'] ||
        row['Answer *'] ||
        row['Answer'] ||
        row['answer'];

      if (rawCorrect === undefined || rawCorrect === null || String(rawCorrect).trim() === '') {
        errors.push(`Row ${rowNum} ("${title.slice(0, 30)}..."): Correct Answer is required.`);
        continue;
      }

      let correctIndex = -1;
      const strCorrect = String(rawCorrect).trim().toUpperCase();

      // Check letter: 'A' -> 0, 'B' -> 1, 'C' -> 2, etc.
      if (/^[A-E]$/.test(strCorrect)) {
        correctIndex = strCorrect.charCodeAt(0) - 65;
      } else if (/^\d+$/.test(strCorrect)) {
        const num = parseInt(strCorrect, 10);
        // If 1-based (1..N)
        if (num >= 1 && num <= rawOptions.length) {
          correctIndex = num - 1;
        } else if (num === 0) {
          correctIndex = 0;
        }
      } else {
        // Try matching option text
        const matched = rawOptions.findIndex((o) => o.text.trim().toLowerCase() === strCorrect.toLowerCase());
        if (matched !== -1) {
          correctIndex = matched;
        }
      }

      if (correctIndex < 0 || correctIndex >= rawOptions.length) {
        errors.push(
          `Row ${rowNum} ("${title.slice(0, 30)}..."): Invalid Correct Answer "${rawCorrect}". Must be A-${String.fromCharCode(
            64 + rawOptions.length
          )} or 1-${rawOptions.length}.`
        );
        continue;
      }

      let difficulty = String(row['Difficulty'] || row['difficulty'] || 'MEDIUM').toUpperCase().trim();
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        difficulty = 'MEDIUM';
      }

      const marks = Number(row['Marks'] || row['marks'] || 1) || 1;
      const explanation = String(row['Explanation'] || row['explanation'] || '').trim();

      // Tags
      let tags = [];
      const rawTags = row['Tags'] || row['tags'] || row['Category'];
      if (rawTags) {
        tags = String(rawTags).split(',').map((t) => t.trim()).filter(Boolean);
      }

      try {
        const question = await Question.create({
          title,
          description,
          type: 'MCQ',
          difficulty,
          marks,
          options: rawOptions,
          correctAnswer: correctIndex,
          explanation,
          tags,
          createdBy: creatorId,
        });

        createdQuestions.push({
          id: question._id,
          title: question.title,
          optionsCount: rawOptions.length,
        });
      } catch (err) {
        errors.push(`Row ${rowNum} ("${title.slice(0, 30)}..."): ${err.message}`);
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
