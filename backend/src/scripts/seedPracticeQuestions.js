import { connectDB } from '../config/db.js';
import { Question } from '../models/Question.js';
import { TestCase } from '../models/TestCase.js';
import { Exam } from '../models/Exam.js';
import { User } from '../models/User.js';
import { DEFAULT_STARTER_CODE, SUPPORTED_LANGUAGES, CODING_LANGUAGES } from '../utils/starterCode.js';

export const PRACTICE_QUESTIONS = [
  {
    title: 'Sum of Two Numbers',
    description: 'Read two integers A and B separated by space from standard input; compute and print their sum A + B.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A single line containing two space-separated integers A and B.',
    outputFormat: 'Print a single integer representing A + B.',
    constraints: '-10^9 <= A, B <= 10^9',
    examples: [{ input: '5 7', output: '12', explanation: '5 + 7 = 12' }],
    testCases: [
      { input: '5 7', expectedOutput: '12', isHidden: false, marks: 0 },
      { input: '0 0', expectedOutput: '0', isHidden: true, marks: 5 },
      { input: '-3 8', expectedOutput: '5', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Even or Odd',
    description: 'Given an integer N, determine whether it is Even or Odd.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A single integer N.',
    outputFormat: 'Print "Even" if N is divisible by 2, otherwise print "Odd".',
    constraints: '-10^9 <= N <= 10^9',
    examples: [{ input: '4', output: 'Even', explanation: '4 is divisible by 2' }],
    testCases: [
      { input: '4', expectedOutput: 'Even', isHidden: false, marks: 0 },
      { input: '7', expectedOutput: 'Odd', isHidden: true, marks: 5 },
      { input: '0', expectedOutput: 'Even', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Load Test MCQ: Basic Computing',
    description: 'Which abstract data structure operates strictly in Last-In, First-Out (LIFO) order?',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 5,
    options: [
      { text: 'Queue' },
      { text: 'Stack' },
      { text: 'Array' },
      { text: 'Linked List' },
    ],
    correctAnswer: 1,
    testCases: [],
  },
  {
    title: 'Prime Check',
    description: 'Given a positive integer N, determine if N is a prime number. Print "true" if prime, otherwise "false".',
    type: 'CODING',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'A single integer N.',
    outputFormat: 'Print "true" or "false".',
    constraints: '1 <= N <= 10^8',
    examples: [{ input: '7', output: 'true', explanation: '7 is divisible only by 1 and 7' }],
    testCases: [
      { input: '7', expectedOutput: 'true', isHidden: false, marks: 0 },
      { input: '4', expectedOutput: 'false', isHidden: true, marks: 5 },
      { input: '1', expectedOutput: 'false', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Reverse Number',
    description: 'Given an integer N, reverse its digits. If N is negative, the negative sign should remain in front.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A single integer N.',
    outputFormat: 'Print the reversed integer without unnecessary leading zeros.',
    constraints: '-10^9 <= N <= 10^9',
    examples: [{ input: '1234', output: '4321', explanation: 'Reversed order of digits' }],
    testCases: [
      { input: '1234', expectedOutput: '4321', isHidden: false, marks: 0 },
      { input: '100', expectedOutput: '1', isHidden: true, marks: 5 },
      { input: '-456', expectedOutput: '-654', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Nth Fibonacci',
    description: 'Given an integer N, compute the Nth Fibonacci number where fib(0) = 0 and fib(1) = 1.',
    type: 'CODING',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'A single integer N.',
    outputFormat: 'Print the Nth Fibonacci number.',
    constraints: '0 <= N <= 30',
    examples: [{ input: '6', output: '8', explanation: 'Sequence: 0, 1, 1, 2, 3, 5, 8' }],
    testCases: [
      { input: '6', expectedOutput: '8', isHidden: false, marks: 0 },
      { input: '0', expectedOutput: '0', isHidden: true, marks: 5 },
      { input: '10', expectedOutput: '55', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Palindrome String',
    description: 'Given a single word string S, determine if it reads the same backwards as forwards. Print "YES" or "NO".',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A string S without whitespace.',
    outputFormat: 'Print "YES" if palindrome, otherwise "NO".',
    constraints: '1 <= |S| <= 10^4',
    examples: [{ input: 'racecar', output: 'YES', explanation: 'racecar reversed is racecar' }],
    testCases: [
      { input: 'racecar', expectedOutput: 'YES', isHidden: false, marks: 0 },
      { input: 'hello', expectedOutput: 'NO', isHidden: true, marks: 5 },
      { input: 'madam', expectedOutput: 'YES', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Count Vowels',
    description: 'Given a string S, count and print the total number of vowels (a, e, i, o, u) present, regardless of case.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A line of text string S.',
    outputFormat: 'Single integer representing the vowel count.',
    constraints: '1 <= |S| <= 10^5',
    examples: [{ input: 'hello world', output: '3', explanation: 'e, o, o are vowels' }],
    testCases: [
      { input: 'hello world', expectedOutput: '3', isHidden: false, marks: 0 },
      { input: 'SkillCodex', expectedOutput: '3', isHidden: true, marks: 5 },
      { input: 'rhythm', expectedOutput: '0', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Remove Spaces',
    description: 'Given a string S with whitespace, remove all space characters and print the compacted result.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A string S containing spaces.',
    outputFormat: 'Print the string with all space characters removed.',
    constraints: '1 <= |S| <= 10^5',
    examples: [{ input: 'Code Assess Platform', output: 'CodeAssessPlatform', explanation: 'Spaces removed' }],
    testCases: [
      { input: 'Code Assess Platform', expectedOutput: 'CodeAssessPlatform', isHidden: false, marks: 0 },
      { input: ' a b c ', expectedOutput: 'abc', isHidden: true, marks: 5 },
      { input: 'NoSpacesHere', expectedOutput: 'NoSpacesHere', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Linear Search',
    description: 'Given an array of N integers and a target value K, find the 0-based index of the first occurrence of K. If K is not present in the array, print -1.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Line 1: Two integers N and K.\nLine 2: N space-separated integers.',
    outputFormat: 'Print the 0-based index of K or -1.',
    constraints: '1 <= N <= 10^5',
    examples: [{ input: "5 3\n1 2 3 4 5", output: '2', explanation: '3 is at index 2' }],
    testCases: [
      { input: "5 3\n1 2 3 4 5", expectedOutput: '2', isHidden: false, marks: 0 },
      { input: "4 10\n1 2 3 4", expectedOutput: '-1', isHidden: true, marks: 5 },
      { input: "6 7\n7 7 7 7 7 7", expectedOutput: '0', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Two Sum Exists',
    description: 'Given an array of N integers and a target sum S, determine if there exist two distinct elements whose sum equals S. Print "YES" or "NO".',
    type: 'CODING',
    difficulty: 'INTERMEDIATE',
    marks: 10,
    inputFormat: 'Line 1: N and S.\nLine 2: N space-separated integers.',
    outputFormat: 'Print "YES" or "NO".',
    constraints: '2 <= N <= 10^5',
    examples: [{ input: "4 9\n2 7 11 15", output: 'YES', explanation: '2 + 7 = 9' }],
    testCases: [
      { input: "4 9\n2 7 11 15", expectedOutput: 'YES', isHidden: false, marks: 0 },
      { input: "3 10\n1 2 3", expectedOutput: 'NO', isHidden: true, marks: 5 },
      { input: "5 0\n-5 2 3 5 1", expectedOutput: 'YES', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Array Maximum',
    description: 'Given an array of N integers, find and print the maximum value in the array.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Line 1: Integer N.\nLine 2: N space-separated integers.',
    outputFormat: 'Print the maximum element.',
    constraints: '1 <= N <= 10^5',
    examples: [{ input: "5\n3 9 1 7 4", output: '9', explanation: '9 is the highest element' }],
    testCases: [
      { input: "5\n3 9 1 7 4", expectedOutput: '9', isHidden: false, marks: 0 },
      { input: "3\n-10 -20 -5", expectedOutput: '-5', isHidden: true, marks: 5 },
      { input: "1\n42", expectedOutput: '42', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Greatest Common Divisor',
    description: 'Given two positive integers A and B, compute their Greatest Common Divisor (GCD) using the Euclidean algorithm.',
    type: 'CODING',
    difficulty: 'INTERMEDIATE',
    marks: 10,
    inputFormat: 'A single line containing two positive integers A and B.',
    outputFormat: 'Print the GCD of A and B.',
    constraints: '1 <= A, B <= 10^9',
    examples: [{ input: '12 18', output: '6', explanation: 'GCD of 12 and 18 is 6' }],
    testCases: [
      { input: '12 18', expectedOutput: '6', isHidden: false, marks: 0 },
      { input: '100 25', expectedOutput: '25', isHidden: true, marks: 5 },
      { input: '17 19', expectedOutput: '1', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Matrix Diagonal Sum',
    description: 'Given an N x N square matrix, calculate the sum of the primary diagonal elements from top-left to bottom-right.',
    type: 'CODING',
    difficulty: 'INTERMEDIATE',
    marks: 10,
    inputFormat: 'Line 1: Integer N.\nNext N lines: N space-separated integers each.',
    outputFormat: 'Print the diagonal sum.',
    constraints: '1 <= N <= 100',
    examples: [{ input: "3\n1 2 3\n4 5 6\n7 8 9", output: '15', explanation: '1 + 5 + 9 = 15' }],
    testCases: [
      { input: "3\n1 2 3\n4 5 6\n7 8 9", expectedOutput: '15', isHidden: false, marks: 0 },
      { input: "2\n5 1\n2 3", expectedOutput: '8', isHidden: true, marks: 5 },
      { input: "1\n7", expectedOutput: '7', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Factorial',
    description: 'Given an integer N (0 <= N <= 12), calculate N! (N factorial). For N = 0, 0! = 1.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A single integer N.',
    outputFormat: 'Print the value of N!.',
    constraints: '0 <= N <= 12',
    examples: [{ input: '5', output: '120', explanation: '5 * 4 * 3 * 2 * 1 = 120' }],
    testCases: [
      { input: '5', expectedOutput: '120', isHidden: false, marks: 0 },
      { input: '0', expectedOutput: '1', isHidden: true, marks: 5 },
      { input: '6', expectedOutput: '720', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Select All Records',
    description: 'Write an SQL query to retrieve all columns and all records from the "students" table.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Pre-populated "students" table with columns: id (INT), name (TEXT), age (INT), department (TEXT).',
    outputFormat: 'Print all records from the students table.',
    constraints: '1 <= number of rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Alice', 22, 'Computer Science');
INSERT INTO students VALUES (2, 'Bob', 20, 'Electrical');
INSERT INTO students VALUES (3, 'Charlie', 23, 'Mechanical');
INSERT INTO students VALUES (4, 'Diana', 21, 'Computer Science');`,
        output: `1|Alice|22|Computer Science
2|Bob|20|Electrical
3|Charlie|23|Mechanical
4|Diana|21|Computer Science`,
        explanation: 'SELECT * FROM students; returns all columns and records.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Alice', 22, 'Computer Science');
INSERT INTO students VALUES (2, 'Bob', 20, 'Electrical');
INSERT INTO students VALUES (3, 'Charlie', 23, 'Mechanical');
INSERT INTO students VALUES (4, 'Diana', 21, 'Computer Science');`,
        expectedOutput: `1|Alice|22|Computer Science
2|Bob|20|Electrical
3|Charlie|23|Mechanical
4|Diana|21|Computer Science`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (10, 'Eve', 19, 'Physics');
INSERT INTO students VALUES (11, 'Frank', 24, 'Mathematics');
INSERT INTO students VALUES (12, 'Grace', 20, 'Chemistry');`,
        expectedOutput: `10|Eve|19|Physics
11|Frank|24|Mathematics
12|Grace|20|Chemistry`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (101, 'Hannah', 21, 'CS');`,
        expectedOutput: `101|Hannah|21|CS`,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Filter with WHERE',
    description: 'Write an SQL query to select the "name" of all students from the "students" table who are older than 20 (age > 20).',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Pre-populated "students" table with columns: id (INT), name (TEXT), age (INT), department (TEXT).',
    outputFormat: 'Print the names of students where age > 20, one per line.',
    constraints: '1 <= number of rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Alice', 22, 'Computer Science');
INSERT INTO students VALUES (2, 'Bob', 20, 'Electrical');
INSERT INTO students VALUES (3, 'Charlie', 23, 'Mechanical');
INSERT INTO students VALUES (4, 'Diana', 21, 'Computer Science');`,
        output: `Alice
Charlie
Diana`,
        explanation: 'Alice (22), Charlie (23), and Diana (21) have age > 20.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Alice', 22, 'Computer Science');
INSERT INTO students VALUES (2, 'Bob', 20, 'Electrical');
INSERT INTO students VALUES (3, 'Charlie', 23, 'Mechanical');
INSERT INTO students VALUES (4, 'Diana', 21, 'Computer Science');`,
        expectedOutput: `Alice
Charlie
Diana`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (5, 'Ethan', 19, 'Physics');
INSERT INTO students VALUES (6, 'Fiona', 25, 'Chemistry');
INSERT INTO students VALUES (7, 'George', 18, 'Biology');
INSERT INTO students VALUES (8, 'Helen', 22, 'Arts');`,
        expectedOutput: `Fiona
Helen`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (9, 'Ian', 20, 'Math');
INSERT INTO students VALUES (10, 'Julia', 20, 'History');`,
        expectedOutput: ``,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Aggregation',
    description: 'Write an SQL query to find the department and the total count of students in each department from the "students" table. Group the results by department.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Pre-populated "students" table with columns: id (INT), name (TEXT), age (INT), department (TEXT).',
    outputFormat: 'Print department and count separated by | for each department, grouped by department.',
    constraints: '1 <= number of rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Alice', 22, 'Computer Science');
INSERT INTO students VALUES (2, 'Bob', 20, 'Electrical');
INSERT INTO students VALUES (3, 'Charlie', 23, 'Mechanical');
INSERT INTO students VALUES (4, 'Diana', 21, 'Computer Science');`,
        output: `Computer Science|2
Electrical|1
Mechanical|1`,
        explanation: 'SELECT department, COUNT(*) FROM students GROUP BY department; groups records by department.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Alice', 22, 'Computer Science');
INSERT INTO students VALUES (2, 'Bob', 20, 'Electrical');
INSERT INTO students VALUES (3, 'Charlie', 23, 'Mechanical');
INSERT INTO students VALUES (4, 'Diana', 21, 'Computer Science');`,
        expectedOutput: `Computer Science|2
Electrical|1
Mechanical|1`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Sam', 20, 'Physics');
INSERT INTO students VALUES (2, 'Sara', 21, 'Physics');
INSERT INTO students VALUES (3, 'John', 22, 'Physics');
INSERT INTO students VALUES (4, 'Jake', 23, 'Math');`,
        expectedOutput: `Math|1
Physics|3`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE students (id INT, name TEXT, age INT, department TEXT);
INSERT INTO students VALUES (1, 'Liam', 21, 'Bio');
INSERT INTO students VALUES (2, 'Noah', 22, 'Chem');
INSERT INTO students VALUES (3, 'Emma', 20, 'Bio');`,
        expectedOutput: `Bio|2
Chem|1`,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Count Set Bits',
    description: 'Given a non-negative integer N, count and print the total number of set bits (1s) in its binary representation.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'A single non-negative integer N.',
    outputFormat: 'Print a single integer representing the count of set bits in the binary representation of N.',
    constraints: '0 <= N <= 10^9',
    allowedLanguages: ['java', 'python', 'javascript', 'c', 'cpp'],
    examples: [
      { input: '7', output: '3', explanation: '7 in binary is 111 (3 set bits).' },
      { input: '16', output: '1', explanation: '16 in binary is 10000 (1 set bit).' },
    ],
    testCases: [
      { input: '7', expectedOutput: '3', isHidden: false, marks: 0 },
      { input: '16', expectedOutput: '1', isHidden: true, marks: 5 },
      { input: '0', expectedOutput: '0', isHidden: true, marks: 5 },
      { input: '255', expectedOutput: '8', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Reverse an Array',
    description: 'Given an array of N integers, reverse the array in place and print its elements separated by a single space.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Line 1: Integer N.\nLine 2: N space-separated integers.',
    outputFormat: 'Print the N integers in reversed order separated by a single space.',
    constraints: '1 <= N <= 10^5\n-10^9 <= elements <= 10^9',
    allowedLanguages: ['java', 'python', 'javascript', 'c', 'cpp'],
    examples: [
      { input: "5\n1 2 3 4 5", output: '5 4 3 2 1', explanation: 'Array [1, 2, 3, 4, 5] reversed is [5, 4, 3, 2, 1].' },
    ],
    testCases: [
      { input: "5\n1 2 3 4 5", expectedOutput: '5 4 3 2 1', isHidden: false, marks: 0 },
      { input: "1\n42", expectedOutput: '42', isHidden: true, marks: 5 },
      { input: "4\n10 20 30 40", expectedOutput: '40 30 20 10', isHidden: true, marks: 5 },
      { input: "6\n-5 0 12 -3 99 4", expectedOutput: '4 99 -3 12 0 -5', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Check If Array Is Sorted',
    description: 'Given an array of N integers, determine whether the array is sorted in non-decreasing order. Print "YES" if sorted, otherwise print "NO".',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Line 1: Integer N.\nLine 2: N space-separated integers.',
    outputFormat: 'Print "YES" if the array is sorted in non-decreasing order, otherwise print "NO".',
    constraints: '1 <= N <= 10^5\n-10^9 <= elements <= 10^9',
    allowedLanguages: ['java', 'python', 'javascript', 'c', 'cpp'],
    examples: [
      { input: "5\n1 2 2 4 5", output: 'YES', explanation: 'Elements are in non-decreasing order.' },
      { input: "4\n10 5 20 30", output: 'NO', explanation: '10 > 5, so the array is not sorted.' },
    ],
    testCases: [
      { input: "5\n1 2 2 4 5", expectedOutput: 'YES', isHidden: false, marks: 0 },
      { input: "4\n10 5 20 30", expectedOutput: 'NO', isHidden: true, marks: 5 },
      { input: "1\n100", expectedOutput: 'YES', isHidden: true, marks: 5 },
      { input: "3\n3 2 1", expectedOutput: 'NO', isHidden: true, marks: 5 },
      { input: "5\n5 5 5 5 5", expectedOutput: 'YES', isHidden: true, marks: 5 },
    ],
  },
  {
    title: 'Inner Join Employees and Departments',
    description: 'Write an SQL query to retrieve employee "name", "salary", and their department "name" (from the departments table) for all employees whose department exists in the departments table. Order by employee "id" ascending.',
    type: 'CODING',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'Two pre-populated tables:\n1. departments: id (INT), name (TEXT)\n2. employees: id (INT), name (TEXT), salary (INT), department_id (INT)',
    outputFormat: 'Print employee name, salary, and department name separated by | for each employee, ordered by employee id ascending.',
    constraints: '1 <= rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE departments (id INT, name TEXT);
INSERT INTO departments VALUES (1, 'Engineering');
INSERT INTO departments VALUES (2, 'Marketing');
INSERT INTO departments VALUES (3, 'HR');
CREATE TABLE employees (id INT, name TEXT, salary INT, department_id INT);
INSERT INTO employees VALUES (101, 'Alice', 75000, 1);
INSERT INTO employees VALUES (102, 'Bob', 50000, 2);
INSERT INTO employees VALUES (103, 'Charlie', 60000, 1);
INSERT INTO employees VALUES (104, 'Diana', 45000, 3);`,
        output: `Alice|75000|Engineering
Bob|50000|Marketing
Charlie|60000|Engineering
Diana|45000|HR`,
        explanation: 'JOIN departments ON employees.department_id = departments.id matches each employee to their department.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE departments (id INT, name TEXT);
INSERT INTO departments VALUES (1, 'Engineering');
INSERT INTO departments VALUES (2, 'Marketing');
INSERT INTO departments VALUES (3, 'HR');
CREATE TABLE employees (id INT, name TEXT, salary INT, department_id INT);
INSERT INTO employees VALUES (101, 'Alice', 75000, 1);
INSERT INTO employees VALUES (102, 'Bob', 50000, 2);
INSERT INTO employees VALUES (103, 'Charlie', 60000, 1);
INSERT INTO employees VALUES (104, 'Diana', 45000, 3);`,
        expectedOutput: `Alice|75000|Engineering
Bob|50000|Marketing
Charlie|60000|Engineering
Diana|45000|HR`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE departments (id INT, name TEXT);
INSERT INTO departments VALUES (10, 'Finance');
INSERT INTO departments VALUES (20, 'Operations');
CREATE TABLE employees (id INT, name TEXT, salary INT, department_id INT);
INSERT INTO employees VALUES (1, 'Evan', 80000, 10);
INSERT INTO employees VALUES (2, 'Fay', 55000, 20);`,
        expectedOutput: `Evan|80000|Finance
Fay|55000|Operations`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE departments (id INT, name TEXT);
INSERT INTO departments VALUES (1, 'Sales');
CREATE TABLE employees (id INT, name TEXT, salary INT, department_id INT);
INSERT INTO employees VALUES (5, 'George', 40000, 1);
INSERT INTO employees VALUES (6, 'Hannah', 42000, 99);`,
        expectedOutput: `George|40000|Sales`,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Left Join Customers and Order Counts',
    description: 'Write an SQL query to retrieve customer "name" and the total count of orders placed (COUNT(orders.id)) for each customer. Include all customers, even those who have placed 0 orders (use LEFT JOIN). Group by customer id and name, and order by customer id ascending.',
    type: 'CODING',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'Two pre-populated tables:\n1. customers: id (INT), name (TEXT)\n2. orders: id (INT), customer_id (INT), amount INT',
    outputFormat: 'Print customer name and order count separated by | for each customer, ordered by customer id ascending.',
    constraints: '1 <= rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE customers (id INT, name TEXT);
INSERT INTO customers VALUES (1, 'Alice');
INSERT INTO customers VALUES (2, 'Bob');
INSERT INTO customers VALUES (3, 'Charlie');
CREATE TABLE orders (id INT, customer_id INT, amount INT);
INSERT INTO orders VALUES (101, 1, 200);
INSERT INTO orders VALUES (102, 1, 150);
INSERT INTO orders VALUES (103, 3, 400);`,
        output: `Alice|2
Bob|0
Charlie|1`,
        explanation: 'LEFT JOIN preserves Bob with 0 count because COUNT(orders.id) counts matching order rows.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE customers (id INT, name TEXT);
INSERT INTO customers VALUES (1, 'Alice');
INSERT INTO customers VALUES (2, 'Bob');
INSERT INTO customers VALUES (3, 'Charlie');
CREATE TABLE orders (id INT, customer_id INT, amount INT);
INSERT INTO orders VALUES (101, 1, 200);
INSERT INTO orders VALUES (102, 1, 150);
INSERT INTO orders VALUES (103, 3, 400);`,
        expectedOutput: `Alice|2
Bob|0
Charlie|1`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE customers (id INT, name TEXT);
INSERT INTO customers VALUES (10, 'David');
INSERT INTO customers VALUES (20, 'Emma');
CREATE TABLE orders (id INT, customer_id INT, amount INT);
INSERT INTO orders VALUES (1, 10, 50);
INSERT INTO orders VALUES (2, 10, 75);
INSERT INTO orders VALUES (3, 10, 100);`,
        expectedOutput: `David|3
Emma|0`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE customers (id INT, name TEXT);
INSERT INTO customers VALUES (100, 'Zack');
CREATE TABLE orders (id INT, customer_id INT, amount INT);`,
        expectedOutput: `Zack|0`,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Multi-Table Join with Filtering',
    description: 'Write an SQL query to retrieve product "name", category "name", and "price" for all products where price >= 100. Join the "products" table with "categories" on category_id = id. Order the results by price descending, then by product name ascending.',
    type: 'CODING',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'Two pre-populated tables:\n1. categories: id (INT), name (TEXT)\n2. products: id (INT), name (TEXT), category_id (INT), price (INT)',
    outputFormat: 'Print product name, category name, and price separated by | for each matching product, ordered by price DESC, then product name ASC.',
    constraints: '1 <= rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE categories (id INT, name TEXT);
INSERT INTO categories VALUES (1, 'Electronics');
INSERT INTO categories VALUES (2, 'Furniture');
CREATE TABLE products (id INT, name TEXT, category_id INT, price INT);
INSERT INTO products VALUES (10, 'Laptop', 1, 1200);
INSERT INTO products VALUES (11, 'Mouse', 1, 25);
INSERT INTO products VALUES (12, 'Desk', 2, 300);
INSERT INTO products VALUES (13, 'Headphones', 1, 100);`,
        output: `Laptop|Electronics|1200
Desk|Furniture|300
Headphones|Electronics|100`,
        explanation: 'Only products with price >= 100 are included, sorted by price descending.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE categories (id INT, name TEXT);
INSERT INTO categories VALUES (1, 'Electronics');
INSERT INTO categories VALUES (2, 'Furniture');
CREATE TABLE products (id INT, name TEXT, category_id INT, price INT);
INSERT INTO products VALUES (10, 'Laptop', 1, 1200);
INSERT INTO products VALUES (11, 'Mouse', 1, 25);
INSERT INTO products VALUES (12, 'Desk', 2, 300);
INSERT INTO products VALUES (13, 'Headphones', 1, 100);`,
        expectedOutput: `Laptop|Electronics|1200
Desk|Furniture|300
Headphones|Electronics|100`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE categories (id INT, name TEXT);
INSERT INTO categories VALUES (1, 'Appliances');
CREATE TABLE products (id INT, name TEXT, category_id INT, price INT);
INSERT INTO products VALUES (1, 'Toaster', 1, 40);
INSERT INTO products VALUES (2, 'Microwave', 1, 150);
INSERT INTO products VALUES (3, 'Blender', 1, 150);`,
        expectedOutput: `Blender|Appliances|150
Microwave|Appliances|150`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE categories (id INT, name TEXT);
INSERT INTO categories VALUES (1, 'Books');
CREATE TABLE products (id INT, name TEXT, category_id INT, price INT);
INSERT INTO products VALUES (1, 'Notebook', 1, 10);`,
        expectedOutput: ``,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Filter Aggregates with HAVING',
    description: 'Write an SQL query to retrieve the "salesperson" and their total sales amount (SUM(amount)) from the "sales" table. Only include salespersons whose total sales amount is greater than or equal to 1000 (HAVING SUM(amount) >= 1000). Order results by total sales amount descending.',
    type: 'CODING',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'Pre-populated "sales" table with columns: id (INT), salesperson (TEXT), amount (INT).',
    outputFormat: 'Print salesperson and total sales separated by | for each qualifying person, ordered by total sales DESC.',
    constraints: '1 <= rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE sales (id INT, salesperson TEXT, amount INT);
INSERT INTO sales VALUES (1, 'Sarah', 600);
INSERT INTO sales VALUES (2, 'Alex', 400);
INSERT INTO sales VALUES (3, 'Sarah', 800);
INSERT INTO sales VALUES (4, 'Alex', 500);
INSERT INTO sales VALUES (5, 'John', 300);`,
        output: `Sarah|1400`,
        explanation: 'Sarah total = 1400 (>= 1000), Alex total = 900 (< 1000), John total = 300 (< 1000).',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE sales (id INT, salesperson TEXT, amount INT);
INSERT INTO sales VALUES (1, 'Sarah', 600);
INSERT INTO sales VALUES (2, 'Alex', 400);
INSERT INTO sales VALUES (3, 'Sarah', 800);
INSERT INTO sales VALUES (4, 'Alex', 500);
INSERT INTO sales VALUES (5, 'John', 300);`,
        expectedOutput: `Sarah|1400`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE sales (id INT, salesperson TEXT, amount INT);
INSERT INTO sales VALUES (1, 'Emma', 1200);
INSERT INTO sales VALUES (2, 'Liam', 700);
INSERT INTO sales VALUES (3, 'Liam', 800);
INSERT INTO sales VALUES (4, 'Noah', 200);`,
        expectedOutput: `Liam|1500
Emma|1200`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE sales (id INT, salesperson TEXT, amount INT);
INSERT INTO sales VALUES (1, 'Dave', 100);
INSERT INTO sales VALUES (2, 'Dave', 200);`,
        expectedOutput: ``,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Employees Earning Above Average',
    description: 'Write an SQL query to select the "name" and "salary" of all employees from the "employees" table who earn strictly more than the overall average company salary (salary > (SELECT AVG(salary) FROM employees)). Order by salary descending.',
    type: 'CODING',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'Pre-populated "employees" table with columns: id (INT), name (TEXT), department (TEXT), salary (INT).',
    outputFormat: 'Print name and salary separated by | for each employee earning above average, ordered by salary DESC.',
    constraints: '1 <= rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 70000);
INSERT INTO employees VALUES (2, 'Bob', 'Marketing', 40000);
INSERT INTO employees VALUES (3, 'Charlie', 'Engineering', 90000);
INSERT INTO employees VALUES (4, 'Diana', 'HR', 40000);`,
        output: `Charlie|90000
Alice|70000`,
        explanation: 'Company average salary is (70000 + 40000 + 90000 + 40000) / 4 = 60000. Charlie and Alice earn > 60000.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 70000);
INSERT INTO employees VALUES (2, 'Bob', 'Marketing', 40000);
INSERT INTO employees VALUES (3, 'Charlie', 'Engineering', 90000);
INSERT INTO employees VALUES (4, 'Diana', 'HR', 40000);`,
        expectedOutput: `Charlie|90000
Alice|70000`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Mark', 'Sales', 50000);
INSERT INTO employees VALUES (2, 'Lucy', 'Sales', 50000);
INSERT INTO employees VALUES (3, 'Tom', 'Sales', 80000);`,
        expectedOutput: `Tom|80000`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Eve', 'Design', 60000);
INSERT INTO employees VALUES (2, 'Frank', 'Design', 60000);`,
        expectedOutput: ``,
        isHidden: true,
        marks: 5,
      },
    ],
  },
  {
    title: 'Department Highest Salary',
    description: 'Write an SQL query to retrieve the "department" and the maximum salary (MAX(salary)) in each department from the "employees" table. Group by department and order by department ascending.',
    type: 'CODING',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Pre-populated "employees" table with columns: id (INT), name (TEXT), department (TEXT), salary (INT).',
    outputFormat: 'Print department and maximum salary separated by | for each department, ordered by department ASC.',
    constraints: '1 <= rows <= 1000',
    allowedLanguages: ['sql'],
    starterCode: {
      sql: `-- Write your SQL query here\n`,
    },
    examples: [
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 80000);
INSERT INTO employees VALUES (2, 'Bob', 'Marketing', 55000);
INSERT INTO employees VALUES (3, 'Charlie', 'Engineering', 95000);
INSERT INTO employees VALUES (4, 'Diana', 'Marketing', 60000);
INSERT INTO employees VALUES (5, 'Evan', 'HR', 50000);`,
        output: `Engineering|95000
HR|50000
Marketing|60000`,
        explanation: 'Max salary in Engineering is 95000, HR is 50000, Marketing is 60000.',
      },
    ],
    testCases: [
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 80000);
INSERT INTO employees VALUES (2, 'Bob', 'Marketing', 55000);
INSERT INTO employees VALUES (3, 'Charlie', 'Engineering', 95000);
INSERT INTO employees VALUES (4, 'Diana', 'Marketing', 60000);
INSERT INTO employees VALUES (5, 'Evan', 'HR', 50000);`,
        expectedOutput: `Engineering|95000
HR|50000
Marketing|60000`,
        isHidden: false,
        marks: 0,
      },
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Zach', 'Finance', 72000);
INSERT INTO employees VALUES (2, 'Yara', 'Finance', 85000);
INSERT INTO employees VALUES (3, 'Xavier', 'Legal', 91000);`,
        expectedOutput: `Finance|85000
Legal|91000`,
        isHidden: true,
        marks: 5,
      },
      {
        input: `CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (10, 'Solo', 'Admin', 45000);`,
        expectedOutput: `Admin|45000`,
        isHidden: true,
        marks: 5,
      },
    ],
  },
];

export async function ensurePracticeQuestionsExist(adminId) {
  let createdCount = 0;
  let existingCount = 0;

  for (const qDef of PRACTICE_QUESTIONS) {
    const existing = await Question.findOne({ title: qDef.title });
    let questionId;

    const targetAllowed = qDef.allowedLanguages || (qDef.type === 'CODING' ? CODING_LANGUAGES : []);
    const targetStarterCode = qDef.starterCode || DEFAULT_STARTER_CODE;

    if (!existing) {
      const qData = {
        title: qDef.title,
        description: qDef.description,
        type: qDef.type,
        difficulty: qDef.difficulty === 'INTERMEDIATE' ? 'MEDIUM' : qDef.difficulty,
        marks: qDef.marks,
        inputFormat: qDef.inputFormat || '',
        outputFormat: qDef.outputFormat || '',
        constraints: qDef.constraints || '',
        examples: qDef.examples || [],
        allowedLanguages: targetAllowed,
        starterCode: targetStarterCode,
        timeLimit: 2,
        memoryLimit: 256,
        comparisonMode: 'TRIMMED',
        createdBy: adminId,
      };

      if (qDef.type === 'MCQ') {
        qData.options = qDef.options || [];
        qData.correctAnswer = qDef.correctAnswer ?? 0;
      }

      const newQ = await Question.create(qData);
      questionId = newQ._id;
      createdCount++;
      console.log(`[Practice Seeder] Created question: "${qDef.title}"`);
    } else {
      questionId = existing._id;
      existingCount++;

      // Synchronize allowedLanguages and starterCode on existing questions
      // so C, C++, and multi-language support is immediately available
      let changed = false;
      const currentAllowed = existing.allowedLanguages || [];
      const hasAllTarget = targetAllowed.every((l) => currentAllowed.includes(l));
      if (!hasAllTarget || currentAllowed.length !== targetAllowed.length) {
        existing.allowedLanguages = targetAllowed;
        changed = true;
      }

      if (!existing.starterCode) {
        existing.starterCode = new Map();
        changed = true;
      }

      for (const lang of targetAllowed) {
        const code = targetStarterCode[lang] || DEFAULT_STARTER_CODE[lang] || '';
        if (code && (!existing.starterCode.get || !existing.starterCode.get(lang))) {
          if (typeof existing.starterCode.set === 'function') {
            existing.starterCode.set(lang, code);
          } else {
            existing.starterCode[lang] = code;
          }
          changed = true;
        }
      }

      if (changed) {
        await existing.save();
        console.log(`[Practice Seeder] Updated languages for "${existing.title}" to [${targetAllowed.join(', ')}]`);
      }
    }

    // Verify / add test cases if coding problem
    if (qDef.type === 'CODING' && qDef.testCases?.length > 0) {
      const tcCount = await TestCase.countDocuments({ questionId });
      if (tcCount === 0) {
        for (let i = 0; i < qDef.testCases.length; i++) {
          const tc = qDef.testCases[i];
          await TestCase.create({
            questionId,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: Boolean(tc.isHidden),
            marks: tc.marks,
            order: i,
          });
        }
        console.log(`[Practice Seeder] Added ${qDef.testCases.length} test cases for "${qDef.title}"`);
      }
    }
  }

  console.log(`[Practice Seeder] Questions status: ${createdCount} created, ${existingCount} already existed.`);
}

async function main() {
  await connectDB();

  const admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    console.error('No admin user found in database. Create an admin first.');
    process.exit(1);
  }

  await ensurePracticeQuestionsExist(admin._id);
  console.log('Done ensuring practice questions exist!');
  process.exit(0);
}

// Run directly if called as main module
if (process.argv[1]?.endsWith('seedPracticeQuestions.js')) {
  main().catch((err) => {
    console.error('Error running seedPracticeQuestions:', err);
    process.exit(1);
  });
}
