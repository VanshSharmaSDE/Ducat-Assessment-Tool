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
