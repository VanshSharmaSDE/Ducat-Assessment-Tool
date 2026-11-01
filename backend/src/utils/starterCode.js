// Supported languages: Java, Python, JavaScript, C, C++, and SQL
export const SUPPORTED_LANGUAGES = ['java', 'python', 'javascript', 'c', 'cpp', 'sql'];
export const CODING_LANGUAGES = ['java', 'python', 'javascript', 'c', 'cpp'];

export const DEFAULT_STARTER_CODE = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your code here
        
    }
}
`,

  python: `# Write your Python code here
`,

  javascript: `// Write your JavaScript code here
`,

  c: `#include <stdio.h>

int main() {
    // Write your C code here
    
    return 0;
}
`,

  cpp: `#include <iostream>

using namespace std;

int main() {
    // Write your C++ code here
    
    return 0;
}
`,

  sql: `-- Write your SQL query here
`,
};

/**
 * Checks if candidate's submitted code is empty, only comments, or untouched starter skeleton.
 */
export function isUnattemptedCode(sourceCode, language, questionStarterCode = null) {
  if (!sourceCode || typeof sourceCode !== 'string') return true;
  const trimmed = sourceCode.trim();
  if (trimmed.length === 0) return true;

  const lang = (language || '').toLowerCase();
  const defaultTemplate = DEFAULT_STARTER_CODE[lang] || '';
  if (defaultTemplate && trimmed === defaultTemplate.trim()) {
    return true;
  }

  // Check custom question starter code if provided
  if (questionStarterCode) {
    let custom = null;
    if (questionStarterCode instanceof Map) {
      custom = questionStarterCode.get(lang);
    } else if (typeof questionStarterCode === 'object') {
      custom = questionStarterCode[lang];
    }
    if (custom && typeof custom === 'string' && trimmed === custom.trim()) {
      return true;
    }
  }

  // Check if stripped of comments it is empty
  const withoutComments = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .replace(/#.*/g, '')
    .replace(/--.*/g, '')
    .trim();

  if (withoutComments.length === 0) return true;

  const skeletonPatterns = [
    /^import\s+java\.util\.\*;\s*public\s+class\s+Main\s*\{\s*public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*args\s*\)\s*\{\s*\}\s*\}$/,
    /^#include\s+<stdio\.h>\s*int\s+main\s*\(\s*\)\s*\{\s*return\s+0;\s*\}$/,
    /^#include\s+<iostream>\s*using\s+namespace\s+std;\s*int\s+main\s*\(\s*\)\s*\{\s*return\s+0;\s*\}$/,
  ];

  const minified = withoutComments.replace(/\s+/g, ' ');
  for (const pat of skeletonPatterns) {
    if (pat.test(minified)) return true;
  }

  return false;
}

/**
 * Normalizes and validates an array or string of languages against SUPPORTED_LANGUAGES.
 * Automatically resolves common aliases (e.g. 'c program' -> 'c', 'py' -> 'python', 'c++' -> 'cpp')
 * and filters out non-language strings like 'fullstack' or 'mern'.
 * If the resulting set is empty, it uses contextTopic to infer languages (e.g. "c program" -> ['c', 'cpp'])
 * or falls back safely to CODING_LANGUAGES.
 */
export function normalizeAllowedLanguages(rawLanguages, contextTopic = '') {
  const validSet = new Set(SUPPORTED_LANGUAGES);
  const result = new Set();

  const list = Array.isArray(rawLanguages)
    ? rawLanguages
    : typeof rawLanguages === 'string'
    ? rawLanguages.split(/[,\s]+/)
    : [];

  const mapAlias = (val) => {
    if (!val || typeof val !== 'string') return null;
    const s = val.trim().toLowerCase();
    if (validSet.has(s)) return s;
    if (s === 'c++' || s === 'cplusplus' || s === 'c plus plus') return 'cpp';
    if (s === 'py' || s === 'python3' || s === 'python 3') return 'python';
    if (s === 'js' || s === 'node' || s === 'nodejs' || s === 'typescript' || s === 'ts') return 'javascript';
    if (s === 'c program' || s === 'c programming' || s === 'c language' || s === 'ansi c') return 'c';
    if (s === 'core java' || s === 'jdk') return 'java';
    if (s === 'mysql' || s === 'postgres' || s === 'postgresql' || s === 'sqlite') return 'sql';
    return null;
  };

  for (const item of list) {
    const mapped = mapAlias(item);
    if (mapped) {
      result.add(mapped);
    }
  }

  // If no valid language was matched, check context topic
  if (result.size === 0 && contextTopic) {
    const lowerTopic = String(contextTopic).toLowerCase();
    if (/\b(c\s+program|c\s+programming|c\s+language|\bc\b(?!\+\+|#))\b/i.test(lowerTopic)) {
      result.add('c');
      result.add('cpp');
    } else if (/\b(c\+\+|cpp)\b/i.test(lowerTopic)) {
      result.add('cpp');
      result.add('c');
    } else if (/\b(python|py)\b/i.test(lowerTopic)) {
      result.add('python');
    } else if (/\b(java)\b/i.test(lowerTopic)) {
      result.add('java');
    } else if (/\b(javascript|js|node)\b/i.test(lowerTopic)) {
      result.add('javascript');
    } else if (/\b(sql|database|query)\b/i.test(lowerTopic)) {
      result.add('sql');
    }
  }

  // Fallback to standard coding languages if empty
  if (result.size === 0) {
    return ['c', 'cpp', 'java', 'python', 'javascript'];
  }

  return Array.from(result);
}

