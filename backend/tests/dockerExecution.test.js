import { DockerExecutionService } from '../src/execution/DockerExecutionService.js';
import { SUPPORTED_LANGUAGES } from '../src/utils/starterCode.js';
import { config } from '../src/config/index.js';

describe('Java Docker Execution Engine', () => {
  const service = new DockerExecutionService();

  test('Supports Java, Python, and JavaScript', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['java', 'python', 'javascript']);
  });

  test('detects the main class name from source', () => {
    expect(service.detectClassName('public class Main { }')).toBe('Main');
    expect(service.detectClassName('import java.util.*;\npublic final class Solution {}')).toBe('Solution');
    expect(service.detectClassName('class Foo {}')).toBe('Foo');
    expect(service.detectClassName('// no class')).toBe('Main');
  });

  test('rejects submissions exceeding MAX_SOURCE_CODE_SIZE_BYTES', async () => {
    const oversizedCode = 'a'.repeat(config.execution.maxSourceCodeBytes + 100);
    const result = await service.evaluateSubmission({
      language: 'java',
      sourceCode: oversizedCode,
      testCases: [{ input: '', expectedOutput: '', marks: 5 }],
    });

    expect(result.overallStatus).toBe('COMPILE_ERROR');
    expect(result.error).toContain('exceeds maximum allowed size');
    expect(result.testResults).toHaveLength(1);
  });

  test('rejects unsupported languages such as cpp or ruby', async () => {
    const result = await service.evaluateSubmission({
      language: 'cpp',
      sourceCode: '#include <iostream>',
      testCases: [],
    });

    expect(result.overallStatus).toBe('SYSTEM_ERROR');
    expect(result.error).toContain('Unsupported language');
  });
});
