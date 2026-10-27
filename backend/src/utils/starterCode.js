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

