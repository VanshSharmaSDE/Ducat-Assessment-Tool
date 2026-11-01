import { SUPPORTED_LANGUAGES, DEFAULT_STARTER_CODE, normalizeAllowedLanguages } from '../utils/starterCode.js';
import { logger } from '../utils/logger.js';

function normalizeOllamaUrl(url) {
  let cleaned = (url || 'http://127.0.0.1:11434').trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, '');
}

/**
 * Helper to remove trailing commas which LLMs often emit in JSON.
 */
function removeTrailingCommas(str) {
  return str.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Attempts to repair and parse malformed, unquoted, or truncated JSON commonly produced
 * by compact / smaller language models (e.g., 0.5B, 0.8B, 1B, 3B).
 */
function tryRepairJson(str) {
  if (!str || typeof str !== 'string') return null;

  let cleaned = str.trim();

  // Strip markdown code fences if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Find outermost bracket/brace
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx === -1) return null;

  let candidate = cleaned.slice(startIdx);

  // 1. Direct candidate parse
  try {
    return JSON.parse(candidate);
  } catch (_) {}

  // 2. Remove trailing commas
  candidate = removeTrailingCommas(candidate);
  try {
    return JSON.parse(candidate);
  } catch (_) {}

  // 3. Fix unquoted keys: { key: "val" } -> { "key": "val" }
  let withQuotedKeys = candidate.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  try {
    return JSON.parse(withQuotedKeys);
  } catch (_) {}

  // 4. Fix single-quoted strings: {'key': 'val'} -> {"key": "val"}
  try {
    const withDoubleQuotes = withQuotedKeys.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
    return JSON.parse(withDoubleQuotes);
  } catch (_) {}

  // 5. Balance unclosed brackets and braces if model output was truncated
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < withQuotedKeys.length; i++) {
    const ch = withQuotedKeys[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces = Math.max(0, openBraces - 1);
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  let balanced = withQuotedKeys;
  if (inString) balanced += '"';
  balanced = balanced.replace(/,\s*$/, '');
  while (openBrackets > 0) {
    balanced += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    balanced += '}';
    openBraces--;
  }

  try {
    return JSON.parse(balanced);
  } catch (_) {
    try {
      return JSON.parse(removeTrailingCommas(balanced));
    } catch (_) {}
  }

  return null;
}

/**
 * Smart fallback parser for when compact/small LLMs (e.g. 0.5B, 0.8B, 1B)
 * output MCQs in plain text or numbered lists instead of strict JSON.
 */
function parseMcqFromPlainText(rawText, defaults = {}) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Split into question blocks by numbered patterns (e.g., "1.", "Question 1:", "Q1:", "### 1.")
  const questionBlocks = rawText
    .split(/(?=(?:^|\n)\s*(?:###\s*)?(?:Question\s*|Q\s*)?\d+[\.:\)]\s*)/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 25);

  if (questionBlocks.length === 0) return null;

  const questions = [];

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];

    // Identify start of options (supports A., A), (A), [A], - A), * A., etc.)
    const optionMatch = block.search(/(?:^|\n)\s*(?:[-*]\s*)?(?:[A-Da-d\d][\.\)]|\([A-Da-d\d]\)|\[[A-Da-d\d]\])\s+/i);
    let questionText = '';
    let optionsText = block;

    if (optionMatch !== -1) {
      questionText = block.substring(0, optionMatch).replace(/^(?:###\s*)?(?:Question\s*|Q\s*)?\d+[\.:\)]\s*/i, '').trim();
      optionsText = block.substring(optionMatch);
    } else {
      questionText = block.split('\n')[0].replace(/^(?:###\s*)?(?:Question\s*|Q\s*)?\d+[\.:\)]\s*/i, '').trim();
    }

    // Extract lines for options A/B/C/D or 1/2/3/4
    const optionRegex = /(?:^|\n)\s*(?:[-*]\s*)?(?:[A-Da-d\d][\.\)]|\([A-Da-d\d]\)|\[[A-Da-d\d]\])\s*([^\n]+)/gi;
    const options = [];
    let detectedAnswerIndex = -1;
    let match;
    while ((match = optionRegex.exec(optionsText)) !== null) {
      let text = (match[1] || '').trim();
      if (text && !text.toLowerCase().startsWith('answer') && !text.toLowerCase().startsWith('explanation')) {
        if (/\(correct\)|\[correct\]|\(answer\)|\*correct\*/i.test(text)) {
          detectedAnswerIndex = options.length;
          text = text.replace(/\(correct\)|\[correct\]|\(answer\)|\*correct\*/gi, '').trim();
        }
        options.push({ text });
      }
    }

    // Extract Answer indicator
    let correctAnswer = detectedAnswerIndex !== -1 ? detectedAnswerIndex : 0;
    const answerMatch = block.match(/(?:Answer|Correct\s*Answer|Ans)[\s:]*([A-Da-d\d]|[^\n]+)/i);
    if (answerMatch && answerMatch[1]) {
      const ansVal = answerMatch[1].trim();
      const firstChar = ansVal.charAt(0).toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(firstChar)) {
        correctAnswer = firstChar.charCodeAt(0) - 65;
      } else if (!isNaN(parseInt(ansVal, 10))) {
        const num = parseInt(ansVal, 10);
        correctAnswer = num >= 1 && num <= options.length ? num - 1 : (num < options.length ? num : 0);
      } else {
        const found = options.findIndex((o) => o.text.toLowerCase().includes(ansVal.toLowerCase()));
        if (found !== -1) correctAnswer = found;
      }
    }

    // Extract Explanation
    let explanation = '';
    const expMatch = block.match(/(?:Explanation|Explain|Reason)[\s:]*([^\n]+(?:\n(?!\d+[\.:\)]).*)*)/i);
    if (expMatch && expMatch[1]) {
      explanation = expMatch[1].trim();
    }

    if (options.length >= 2) {
      questions.push({
        title: questionText.slice(0, 90) || `${defaults.topic || 'Question'} - Part ${i + 1}`,
        description: questionText,
        difficulty: defaults.difficulty || 'MEDIUM',
        marks: Number(defaults.marks) || 5,
        options,
        correctAnswer,
        explanation,
      });
    }
  }

  return questions.length > 0 ? { questions } : null;
}

/**
 * Universal helper to extract questions array from various LLM response formats.
 */
function extractQuestionsArray(rawData) {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (typeof rawData !== 'object') return [];

  // Check known container keys
  const containerKeys = [
    'questions',
    'mcqs',
    'mcqQuestions',
    'mcq_questions',
    'quiz',
    'items',
    'data',
    'result',
    'results',
  ];
  for (const key of containerKeys) {
    if (Array.isArray(rawData[key]) && rawData[key].length > 0) {
      return rawData[key];
    }
  }

  // Check any property whose value is an array of questions/objects
  for (const key of Object.keys(rawData)) {
    if (Array.isArray(rawData[key]) && rawData[key].length > 0 && typeof rawData[key][0] === 'object') {
      return rawData[key];
    }
  }

  // Check if rawData has indexed keys like { question1: {...}, question2: {...} } or { q1: {...}, q2: {...} }
  const indexedList = [];
  const sortedKeys = Object.keys(rawData).sort();
  for (const k of sortedKeys) {
    const val = rawData[k];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.options || val.description || val.question || val.title) {
        indexedList.push(val);
      }
    }
  }
  if (indexedList.length > 0) {
    return indexedList;
  }

  if (rawData.question && typeof rawData.question === 'object') {
    return [rawData.question];
  }

  if (rawData.title || rawData.options || rawData.description || rawData.question) {
    return [rawData];
  }

  return [];
}

/**
 * Smart fallback parser for coding problems emitted in plain text or markdown by compact LLMs.
 */
function parseCodingFromPlainText(rawText, defaults = {}) {
  if (!rawText || typeof rawText !== 'string' || rawText.length < 30) return null;

  let title = defaults.topic || 'Coding Problem';
  const titleMatch = rawText.match(/(?:^|\n)\s*(?:#+\s*|Problem(?:\s*Title)?[\s:]+)([^\n]+)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  let description = rawText;
  const descMatch = rawText.match(/(?:Description|Problem\s*Statement)[\s:]*([\s\S]*?)(?=(?:Input\s*Format|Constraints|Example|\n\n###|$))/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  let inputFormat = '';
  const inFmtMatch = rawText.match(/Input\s*Format[\s:]*([^\n]+(?:\n(?!(?:Output|Constraints|Example)).*)*)/i);
  if (inFmtMatch && inFmtMatch[1]) inputFormat = inFmtMatch[1].trim();

  let outputFormat = '';
  const outFmtMatch = rawText.match(/Output\s*Format[\s:]*([^\n]+(?:\n(?!(?:Constraints|Example)).*)*)/i);
  if (outFmtMatch && outFmtMatch[1]) outputFormat = outFmtMatch[1].trim();

  let constraints = '1 <= N <= 10^5';
  const constMatch = rawText.match(/Constraints?[\s:]*([^\n]+(?:\n(?!(?:Example|Input)).*)*)/i);
  if (constMatch && constMatch[1]) constraints = constMatch[1].trim();

  const examples = [];
  const exRegex = /(?:Example\s*\d*|Sample\s*Case\s*\d*)[\s:]*[\s\S]*?Input[\s:]*([^\n]+)[\s\S]*?Output[\s:]*([^\n]+)/gi;
  let exMatch;
  while ((exMatch = exRegex.exec(rawText)) !== null) {
    examples.push({
      input: (exMatch[1] || '').trim(),
      output: (exMatch[2] || '').trim(),
      explanation: 'Sample test case',
    });
  }

  return {
    title,
    description: description.slice(0, 2000),
    inputFormat,
    outputFormat,
    constraints,
    difficulty: defaults.difficulty || 'MEDIUM',
    marks: Number(defaults.marks) || 20,
    examples: examples.length > 0 ? examples : [{ input: '1', output: '1', explanation: 'Sample test case' }],
    testCases: examples.length > 0
      ? examples.map((ex, i) => ({
          input: ex.input,
          expectedOutput: ex.output,
          isHidden: i > 0,
          marks: 5,
        }))
      : [],
  };
}

/**
 * Safely extracts and parses JSON from LLM output, with multi-stage fallbacks:
 * 1. Reasoning tags (<think>...</think>) stripping
 * 2. Relaxed JSON repairing (unquoted keys, single quotes, unclosed brackets)
 * 3. Domain plain-text fallbacks (MCQ / Coding) for small parameter models
 */
function extractJsonFromText(rawText, modelName = 'local model', expectedType = null, defaults = {}) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    const err = new Error(
      `Empty response received from LLM (${modelName}). The local model produced no output. ` +
      `Ensure Ollama has sufficient RAM/VRAM, or select another installed model (e.g., llama3, mistral, qwen2.5-coder).`
    );
    err.statusCode = 422;
    err.hint = `Model "${modelName}" returned 0 tokens. Try running 'ollama run ${modelName}' in your terminal to verify it responds.`;
    throw err;
  }

  // Strip <think>...</think> tags if present (common in DeepSeek-R1 and reasoning models)
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!cleaned) {
    cleaned = rawText.trim();
  }

  // Attempt 1: Standard / Relaxed JSON parsing with repair
  const repaired = tryRepairJson(cleaned);
  if (repaired && typeof repaired === 'object') {
    return repaired;
  }

  // Attempt 2: Domain-specific plain text fallback parser for small models (0.5B, 0.8B, 1B)
  if (expectedType === 'MCQ') {
    const parsedMcqs = parseMcqFromPlainText(cleaned, defaults);
    if (parsedMcqs) {
      logger.info(`[Ollama] Successfully recovered ${parsedMcqs.questions.length} MCQs via plain-text parsing fallback.`);
      return parsedMcqs;
    }
  } else if (expectedType === 'CODING') {
    const parsedCoding = parseCodingFromPlainText(cleaned, defaults);
    if (parsedCoding) {
      logger.info(`[Ollama] Successfully recovered coding problem via plain-text parsing fallback.`);
      return parsedCoding;
    }
  }

  const preview = cleaned.length > 200 ? `${cleaned.slice(0, 200)}...` : cleaned;
  const err = new Error(`Failed to parse structured questions from ${modelName} output: "${preview}"`);
  err.statusCode = 422;
  err.hint = 'The model did not output valid questions or JSON. Try generating 1 or 2 questions, or use a model with >=3B parameters (e.g., qwen2.5-coder:7b or llama3.2).';
  throw err;
}

export class OllamaService {
  /**
   * Check connection to local Ollama instance and retrieve tags/models.
   */
  static async checkConnection(rawUrl = 'http://127.0.0.1:11434') {
    const baseUrl = normalizeOllamaUrl(rawUrl);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          online: false,
          url: baseUrl,
          error: `HTTP ${res.status}: ${res.statusText}`,
          hint: 'Ollama is reachable but returned an error status.',
        };
      }

      const data = await res.json();
      const models = (data.models || []).map((m) => {
        const sizeMb = m.size ? Math.round(m.size / (1024 * 1024)) : 0;
        const sizeGb = sizeMb >= 1000 ? (sizeMb / 1024).toFixed(1) + ' GB' : `${sizeMb} MB`;
        return {
          name: m.name || m.model,
          model: m.model || m.name,
          size: sizeGb,
          sizeBytes: m.size,
          modifiedAt: m.modified_at,
          family: m.details?.family || 'unknown',
          parameterSize: m.details?.parameter_size || '',
          quantization: m.details?.quantization_level || '',
        };
      });

      return {
        online: true,
        url: baseUrl,
        models,
        count: models.length,
      };
    } catch (err) {
      const isAborted = err.name === 'AbortError';
      return {
        online: false,
        url: baseUrl,
        error: isAborted ? 'Connection timed out after 7s' : err.message,
        hint: 'Please ensure Ollama is installed and running on your desktop. Run `ollama serve` in your terminal if not already running.',
      };
    }
  }

  /**
   * Send a prompt to Ollama with multi-tier fallback (Chat API -> Generate API, format:json -> unconstrained)
   * to guarantee robust generation across reasoning models (e.g. DeepSeek-R1), compact models (0.5B, 0.8B, 1B),
   * and full-sized coding models (Qwen, Llama 3, Mistral).
   */
  static async queryOllama({
    baseUrl = 'http://127.0.0.1:11434',
    model,
    prompt,
    systemPrompt = '',
    format = 'json',
    temperature = 0.2,
    timeoutMs = 600000, // 10 mins for local CPU/GPU
    expectedType = null,
    defaults = {},
    numPredict = null,
  }) {
    const url = normalizeOllamaUrl(baseUrl);
    if (!model) {
      const err = new Error('Model name is required for Ollama generation');
      err.statusCode = 400;
      throw err;
    }

    const sendRequest = async (useChat = true, enforceJson = true) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const endpoint = useChat ? `${url}/api/chat` : `${url}/api/generate`;
        let payload;

        // Ensure compact/small models have adequate token budget and context window
        const options = {
          temperature: Math.max(0.1, Number(temperature) || 0.2),
          num_predict: numPredict || 2048,
          num_ctx: 4096,
        };

        if (useChat) {
          const messages = [];
          if (systemPrompt) {
            messages.push({
              role: 'system',
              content: `${systemPrompt}\nIMPORTANT: Respond with valid JSON matching the requested schema. Do not include introductory conversational text.`,
            });
          }
          messages.push({ role: 'user', content: prompt });

          payload = {
            model,
            messages,
            stream: false,
            options,
          };
          if (enforceJson) {
            payload.format = 'json';
          }
        } else {
          payload = {
            model,
            prompt: systemPrompt
              ? `[INSTRUCTIONS]\n${systemPrompt}\n\n[TASK]\n${prompt}\n\n[FORMAT]\nRespond strictly with valid JSON only.`
              : prompt,
            stream: false,
            options,
          };
          if (enforceJson) {
            payload.format = 'json';
          }
        }

        logger.info(`[Ollama] Querying ${endpoint} (model=${model}, chat=${useChat}, json=${enforceJson})...`);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // If /api/chat fails with ANY error (e.g. 400 "system role not supported", 404, or 500):
          // Seamlessly fallback to /api/generate!
          if (useChat) {
            logger.warn(`[Ollama] /api/chat returned status ${res.status}. Falling back to /api/generate...`);
            return await sendRequest(false, enforceJson);
          }
          const text = await res.text();
          logger.error(`[Ollama] HTTP ${res.status} error from ${endpoint}: ${text}`);
          const err = new Error(`Ollama error (${res.status}): ${text || res.statusText}`);
          err.statusCode = 502;
          throw err;
        }

        const data = await res.json();
        if (data.error) {
          logger.error(`[Ollama] Error returned in response body: ${data.error}`);
          const err = new Error(`Ollama model error: ${data.error}`);
          err.statusCode = 502;
          throw err;
        }

        const text = (data.message?.content || data.response || '').trim();
        logger.info(`[Ollama] Received response (${text.length} chars, done_reason=${data.done_reason || 'stop'})`);
        return text;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          const timeoutErr = new Error(
            `Ollama request timed out after ${Math.round(timeoutMs / 60000)} minutes (${Math.round(timeoutMs / 1000)}s). The local model is taking too long to generate.`
          );
          timeoutErr.statusCode = 504;
          timeoutErr.hint = 'Try a smaller or quantized model, reduce the number of questions, or verify Ollama CPU/GPU load.';
          throw timeoutErr;
        }
        throw err;
      }
    };

    // Step 1: Attempt generation with format: 'json'
    let rawOutput = '';
    try {
      rawOutput = await sendRequest(true, format === 'json');
    } catch (chatErr) {
      if (chatErr.statusCode === 504 || chatErr.message?.includes('timed out')) {
        throw chatErr;
      }
      logger.warn(`[Ollama] Chat attempt failed (${chatErr.message}). Retrying with /api/generate...`);
      try {
        rawOutput = await sendRequest(false, format === 'json');
      } catch (genErr) {
        logger.warn(`[Ollama] Constrained generation failed (${genErr.message}). Will retry unconstrained.`);
      }
    }

    // Step 2: Fallback if rawOutput is empty or if format: 'json' caused failure
    if (!rawOutput || !rawOutput.trim()) {
      logger.info(`[Ollama] Output was empty under JSON grammar constraint. Retrying unconstrained without format: 'json'...`);
      try {
        rawOutput = await sendRequest(true, false);
      } catch (_) {
        try {
          rawOutput = await sendRequest(false, false);
        } catch (unconstrainedErr) {
          logger.error(`[Ollama] Unconstrained generation failed: ${unconstrainedErr.message}`);
        }
      }
    }

    // Step 3: If STILL empty, throw clear diagnostic error
    if (!rawOutput || !rawOutput.trim()) {
      const err = new Error(
        `Empty response received from LLM model "${model}". The local model returned 0 tokens.`
      );
      err.statusCode = 422;
      err.hint = `Model "${model}" produced no output. This happens when the local model runs out of memory or halts. Try testing in terminal with: ollama run ${model}`;
      throw err;
    }

    // Step 4: Extract and return validated JSON or recover via plain-text fallbacks
    return extractJsonFromText(rawOutput, model, expectedType, defaults);
  }

  /**
   * Generate an end-to-end exam with coding and/or MCQ questions.
   */
  static async generateExam({
    baseUrl = 'http://127.0.0.1:11434',
    model,
    topic,
    difficulty = 'INTERMEDIATE',
    codingCount = 2,
    mcqCount = 5,
    codingMarks = 20,
    mcqMarks = 5,
    targetTechnologies = ['Java', 'Python', 'JavaScript'],
    customInstructions = '',
  }) {
    const numCoding = Math.max(0, parseInt(codingCount, 10) || 0);
    const numMcq = Math.max(0, parseInt(mcqCount, 10) || 0);

    if (numCoding === 0 && numMcq === 0) {
      throw new Error('Please request at least one coding question or one MCQ question for the examination.');
    }

    const systemPrompt = `You are an elite expert software engineering professor and technical assessment architect for SkillCodex.
Your role is to author comprehensive, production-grade examination papers with realistic problems and precise automated test suites.
You MUST output strictly valid JSON conforming exactly to the requested schema, without conversational chatter or surrounding markdown text.`;

    const prompt = `Create an examination on the subject: "${topic}".
Difficulty Level: ${difficulty}
Target Technologies: ${targetTechnologies.join(', ')}
Requirements:
1. Generate exactly ${numCoding} CODING problem(s).
2. Generate exactly ${numMcq} Multiple-Choice (MCQ) question(s).
3. Coding questions each have ${codingMarks} marks.
4. MCQ questions each have ${mcqMarks} marks.
${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

Strict JSON Schema to return:
{
  "title": "A professional examination title",
  "description": "Comprehensive description of the assessment scope and competencies tested",
  "instructions": "Clear step-by-step instructions for candidates (timing, restrictions, integrity)",
  "suggestedDurationMinutes": 60,
  "codingQuestions": [
    ${numCoding > 0 ? `{
      "title": "Clear concise problem title",
      "description": "Detailed problem statement explaining what needs to be solved with business or algorithmic context",
      "difficulty": "${difficulty}",
      "marks": ${codingMarks},
      "inputFormat": "Exact description of standard input (e.g. First line contains integer N...)",
      "outputFormat": "Exact description of standard output",
      "constraints": "Limits like 1 <= N <= 10^5, Time limit 2s",
      "examples": [
        {
          "input": "Sample standard input 1",
          "output": "Sample standard output 1",
          "explanation": "Why this input yields this output"
        }
      ],
      "explanation": "High level algorithmic approach (e.g. Dynamic Programming, Two Pointer, Hash Map)",
      "allowedLanguages": ["java", "python", "javascript", "c", "cpp"],
      "testCases": [
        {
          "input": "Public sample testcase input",
          "expectedOutput": "Expected output matching sample",
          "isHidden": false,
          "marks": ${Math.round(codingMarks * 0.3) || 5}
        },
        {
          "input": "Hidden edge case testcase input",
          "expectedOutput": "Expected output for edge case",
          "isHidden": true,
          "marks": ${Math.round(codingMarks * 0.35) || 5}
        },
        {
          "input": "Hidden stress/large bounds testcase input",
          "expectedOutput": "Expected output for large bounds",
          "isHidden": true,
          "marks": ${Math.round(codingMarks * 0.35) || 5}
        }
      ]
    }` : ''}
  ],
  "mcqQuestions": [
    ${numMcq > 0 ? `{
      "title": "Question topic or concept title",
      "description": "The exact question prompt asking candidate to select the correct choice",
      "difficulty": "${difficulty}",
      "marks": ${mcqMarks},
      "options": [
        { "text": "First option text" },
        { "text": "Second option text" },
        { "text": "Third option text" },
        { "text": "Fourth option text" }
      ],
      "correctAnswer": 0,
      "explanation": "Detailed rationale explaining why the correct option is right and others are incorrect"
    }` : ''}
  ]
}

CRITICAL RULES:
- Every coding question MUST contain at least ONE public testcase (isHidden: false) and at least TWO hidden testcases (isHidden: true).
- Expected outputs MUST be precise, matching trimmed stdout exactly without extra prompt strings.
- In MCQs, correctAnswer is an integer (0, 1, 2, or 3) indicating the zero-based index of the correct option.
- Return ONLY the JSON object.`;

    const rawData = await this.queryOllama({
      baseUrl,
      model,
      prompt,
      systemPrompt,
      format: 'json',
      temperature: 0.25,
      expectedType: 'EXAM',
      defaults: { topic, difficulty, codingMarks, mcqMarks },
      numPredict: Math.min(4096, Math.max(2500, (numCoding * 800) + (numMcq * 400))),
    });

    const examData = this.sanitizeAndNormalizeExamData(rawData, {
      topic,
      difficulty,
      codingMarks,
      mcqMarks,
    });

    // Guarantee MCQ count for exam
    if (numMcq > 0 && examData.mcqQuestions.length < numMcq) {
      const missingMcqs = numMcq - examData.mcqQuestions.length;
      logger.info(`[Ollama] Exam generated ${examData.mcqQuestions.length}/${numMcq} MCQs. Automatically completing remaining ${missingMcqs} MCQ(s)...`);
      try {
        const topUp = await this.generateMcqQuestions({
          baseUrl,
          model,
          topic: `${topic} Concepts`,
          difficulty,
          count: missingMcqs,
          marks: mcqMarks,
          customInstructions,
        });
        examData.mcqQuestions.push(...topUp);
      } catch (err) {
        logger.warn(`[Ollama] Exam MCQ completion warning: ${err.message}`);
      }
    }

    // Guarantee Coding count for exam
    if (numCoding > 0 && examData.codingQuestions.length < numCoding) {
      const missingCoding = numCoding - examData.codingQuestions.length;
      logger.info(`[Ollama] Exam generated ${examData.codingQuestions.length}/${numCoding} Coding problems. Automatically completing remaining ${missingCoding} problem(s)...`);
      for (let i = 0; i < missingCoding; i++) {
        try {
          const topUp = await this.generateCodingQuestion({
            baseUrl,
            model,
            topic: `${topic} - Problem ${examData.codingQuestions.length + 1}`,
            difficulty,
            marks: codingMarks,
            allowedLanguages: normalizeAllowedLanguages(targetTechnologies, topic),
            customInstructions,
          });
          examData.codingQuestions.push(topUp);
        } catch (err) {
          logger.warn(`[Ollama] Exam coding completion warning: ${err.message}`);
          break;
        }
      }
    }

    // Recalculate total marks
    const totalMarks =
      examData.codingQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) +
      examData.mcqQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    examData.totalMarks = totalMarks;
    examData.passingMarks = Math.round(totalMarks * 0.4) || 40;

    return examData;
  }

  /**
   * Generate a single or multiple coding questions.
   */
  static async generateCodingQuestion({
    baseUrl = 'http://127.0.0.1:11434',
    model,
    topic,
    difficulty = 'MEDIUM',
    marks = 20,
    allowedLanguages = ['java', 'python', 'javascript', 'c', 'cpp'],
    customInstructions = '',
  }) {
    const systemPrompt = `You are a principal coding assessment designer. Produce an algorithmic coding challenge with problem description, standard I/O format, constraints, examples, and automated test cases. Output strictly valid JSON.`;

    const prompt = `Create a high quality coding problem on the topic: "${topic}".
Difficulty: ${difficulty}
Marks: ${marks}
Allowed Languages: ${allowedLanguages.join(', ')}
${customInstructions ? `Specific requirements: ${customInstructions}` : ''}

Strict JSON schema:
{
  "title": "Descriptive Problem Title",
  "description": "Full problem statement describing the challenge clearly",
  "inputFormat": "Exact description of input format",
  "outputFormat": "Exact description of output format",
  "constraints": "e.g., 1 <= N <= 10^5, -1000 <= A[i] <= 1000",
  "difficulty": "${difficulty}",
  "marks": ${marks},
  "explanation": "Algorithmic solution explanation and time/space complexity",
  "examples": [
    {
      "input": "Sample standard input 1",
      "output": "Sample standard output 1",
      "explanation": "Detailed explanation of sample"
    },
    {
      "input": "Sample standard input 2",
      "output": "Sample standard output 2",
      "explanation": "Detailed explanation of sample 2"
    }
  ],
  "allowedLanguages": ${JSON.stringify(allowedLanguages)},
  "testCases": [
    {
      "input": "Sample input matching Example 1",
      "expectedOutput": "Sample output matching Example 1",
      "isHidden": false,
      "marks": 5
    },
    {
      "input": "Hidden test case 1 (edge case / boundary)",
      "expectedOutput": "Expected output for edge case",
      "isHidden": true,
      "marks": 5
    },
    {
      "input": "Hidden test case 2 (standard case)",
      "expectedOutput": "Expected output",
      "isHidden": true,
      "marks": 5
    },
    {
      "input": "Hidden test case 3 (large input / stress test)",
      "expectedOutput": "Expected output",
      "isHidden": true,
      "marks": 5
    }
  ]
}

Ensure there is at least 1 public test case (isHidden: false) and at least 2 hidden test cases (isHidden: true).`;

    const rawData = await this.queryOllama({
      baseUrl,
      model,
      prompt,
      systemPrompt,
      format: 'json',
      temperature: 0.2,
      expectedType: 'CODING',
      defaults: { topic, difficulty, marks, allowedLanguages },
    });

    const targetObj =
      rawData?.question ||
      (Array.isArray(rawData?.codingQuestions) && rawData.codingQuestions.length > 0
        ? rawData.codingQuestions[0]
        : rawData);

    return this.sanitizeCodingQuestion(targetObj, {
      topic,
      difficulty,
      marks,
      allowedLanguages,
    });
  }

  /**
   * Generate multiple-choice questions with guaranteed count accumulation.
   * If compact or small LLMs under-generate (e.g., returning 1 or 2 instead of 5),
   * this method loops and accumulates distinct questions until the full target count is met.
   */
  static async generateMcqQuestions({
    baseUrl = 'http://127.0.0.1:11434',
    model,
    topic,
    difficulty = 'MEDIUM',
    count = 3,
    marks = 5,
    customInstructions = '',
  }) {
    const targetCount = Math.min(Math.max(1, parseInt(count, 10) || 1), 15);
    const accumulated = [];
    const seenSignatures = new Set();

    let attempt = 0;
    const maxAttempts = 4;

    while (accumulated.length < targetCount && attempt < maxAttempts) {
      attempt++;
      const needed = targetCount - accumulated.length;
      logger.info(
        `[Ollama] MCQ generation attempt ${attempt}/${maxAttempts}: requesting ${needed} question(s) (already collected ${accumulated.length}/${targetCount})`
      );

      const systemPrompt = `You are an elite technical examination designer.
You MUST output strictly valid JSON conforming exactly to the requested schema.
You MUST generate exactly ${needed} multiple-choice question(s) in the "questions" array.
Never output conversational intro or markdown notes.`;

      let prompt;
      if (accumulated.length === 0) {
        prompt = `Generate EXACTLY ${targetCount} multiple-choice questions (MCQs) on the topic: "${topic}".
Difficulty: ${difficulty}
Marks per question: ${marks}
${customInstructions ? `Additional Requirements: ${customInstructions}` : ''}

CRITICAL RULES:
1. The "questions" array MUST contain exactly ${targetCount} distinct question objects (Question 1 to ${targetCount}).
2. Do NOT output only 1 question. Output ALL ${targetCount} questions.
3. Every question must have an array of exactly 4 choices in "options".
4. "correctAnswer" is an integer index from 0 to 3 (0 for Option A, 1 for Option B, 2 for Option C, 3 for Option D).
5. Provide a clear, educational "explanation" for each question.

Required JSON format:
{
  "questions": [
    {
      "title": "Question 1 concept title",
      "description": "Question 1 prompt / code snippet / statement",
      "difficulty": "${difficulty}",
      "marks": ${marks},
      "options": ["First option", "Second option", "Third option", "Fourth option"],
      "correctAnswer": 0,
      "explanation": "Why this option is correct"
    }${targetCount > 1 ? `,
    {
      "title": "Question 2 concept title",
      "description": "Question 2 prompt / code snippet / statement",
      "difficulty": "${difficulty}",
      "marks": ${marks},
      "options": ["First option", "Second option", "Third option", "Fourth option"],
      "correctAnswer": 1,
      "explanation": "Why this option is correct"
    }` : ''}
  ]
}`;
      } else {
        const existingSummaries = accumulated
          .map((q) => q.title || q.description?.slice(0, 50))
          .filter(Boolean)
          .slice(-5);

        prompt = `We need ${needed} MORE multiple-choice question(s) (MCQs) on the topic: "${topic}" to complete the requested total of ${targetCount}.
Difficulty: ${difficulty}
Marks per question: ${marks}
${customInstructions ? `Additional Requirements: ${customInstructions}` : ''}

Do NOT duplicate or repeat these existing questions:
${existingSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

CRITICAL RULES:
1. Generate ${needed} brand new, distinct questions.
2. The "questions" array MUST contain exactly ${needed} question objects.
3. Every question must include "title", "description", "options" (4 strings), "correctAnswer" (0-3), and "explanation".

Required JSON format:
{
  "questions": [
    {
      "title": "New concept title",
      "description": "Question prompt",
      "difficulty": "${difficulty}",
      "marks": ${marks},
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}`;
      }

      try {
        const rawData = await this.queryOllama({
          baseUrl,
          model,
          prompt,
          systemPrompt,
          format: 'json',
          temperature: 0.25,
          expectedType: 'MCQ',
          defaults: { topic, difficulty, marks },
          numPredict: Math.min(4096, Math.max(1800, needed * 550)),
        });

        const extracted = extractQuestionsArray(rawData);
        if (!extracted || extracted.length === 0) {
          logger.warn(`[Ollama] Attempt ${attempt} returned 0 parseable MCQs.`);
          continue;
        }

        for (const rawQ of extracted) {
          const sanitized = this.sanitizeMcqQuestion(rawQ, {
            topic: `${topic} - Part ${accumulated.length + 1}`,
            difficulty,
            marks,
          });

          // Deduplicate based on title and description
          const sig = (sanitized.title + '::' + sanitized.description).toLowerCase().trim();
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            accumulated.push(sanitized);
          }

          if (accumulated.length >= targetCount) break;
        }
      } catch (err) {
        logger.warn(`[Ollama] MCQ attempt ${attempt} failed: ${err.message}`);
        // If we already collected some questions, stop early and return them rather than failing completely
        if (accumulated.length > 0) {
          break;
        }
        if (attempt >= maxAttempts) {
          throw err;
        }
      }
    }

    if (accumulated.length === 0) {
      const err = new Error(`No MCQ questions could be parsed from the output of model "${model}".`);
      err.statusCode = 422;
      err.hint = 'The model did not return any questions matching the requested schema. Please try again or test with another model.';
      throw err;
    }

    logger.info(`[Ollama] Successfully generated ${accumulated.length}/${targetCount} MCQ question(s).`);
    return accumulated.slice(0, targetCount);
  }

  /**
   * Normalizer & validator for full exam response.
   */
  static sanitizeAndNormalizeExamData(raw, defaults = {}) {
    const title = (raw?.title || `Assessment on ${defaults.topic || 'Software Engineering'}`).trim();
    const description = (
      raw?.description ||
      `Comprehensive evaluation on ${defaults.topic || 'core concepts'} testing analytical and implementation skills.`
    ).trim();
    const instructions = (
      raw?.instructions ||
      '1. Read each question carefully before attempting.\n2. Ensure code handles all boundary constraints.\n3. Solutions will be evaluated against hidden test suites upon submission.'
    ).trim();

    const rawCoding = Array.isArray(raw?.codingQuestions) ? raw.codingQuestions : [];
    const rawMcqs = Array.isArray(raw?.mcqQuestions) ? raw.mcqQuestions : [];

    const codingQuestions = rawCoding.map((cq, idx) =>
      this.sanitizeCodingQuestion(cq, {
        topic: `${defaults.topic || 'Coding'} - Problem ${idx + 1}`,
        difficulty: defaults.difficulty || 'INTERMEDIATE',
        marks: defaults.codingMarks || 20,
      })
    );

    const mcqQuestions = rawMcqs.map((mq, idx) =>
      this.sanitizeMcqQuestion(mq, {
        topic: `${defaults.topic || 'Concept'} - MCQ ${idx + 1}`,
        difficulty: defaults.difficulty || 'INTERMEDIATE',
        marks: defaults.mcqMarks || 5,
      })
    );

    const totalCalculatedMarks =
      codingQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) +
      mcqQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

    const suggestedDuration =
      Number(raw?.suggestedDurationMinutes) ||
      Math.max(30, codingQuestions.length * 25 + mcqQuestions.length * 2);

    return {
      title,
      description,
      instructions,
      duration: suggestedDuration,
      difficulty: defaults.difficulty || 'INTERMEDIATE',
      totalMarks: totalCalculatedMarks || 100,
      passingMarks: Math.round(totalCalculatedMarks * 0.4) || 40,
      codingQuestions,
      mcqQuestions,
    };
  }

  /**
   * Normalizer for a single coding question.
   */
  static sanitizeCodingQuestion(cq, defaults = {}) {
    const title = (cq?.title || defaults.topic || 'Algorithmic Problem').trim();
    const description = (cq?.description || 'Implement the solution according to the requirements.').trim();
    const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(String(cq?.difficulty).toUpperCase())
      ? String(cq.difficulty).toUpperCase()
      : defaults.difficulty === 'BEGINNER'
      ? 'EASY'
      : defaults.difficulty === 'ADVANCED'
      ? 'HARD'
      : 'MEDIUM';

    const marks = Number(cq?.marks) || Number(defaults.marks) || 20;
    const inputFormat = (cq?.inputFormat || '').trim();
    const outputFormat = (cq?.outputFormat || '').trim();
    const constraints = (cq?.constraints || '').trim();
    const explanation = (cq?.explanation || '').trim();

    // Clean examples
    let examples = Array.isArray(cq?.examples)
      ? cq.examples.map((ex) => ({
          input: String(ex?.input ?? '').trim(),
          output: String(ex?.output ?? '').trim(),
          explanation: String(ex?.explanation ?? '').trim(),
        }))
      : [];

    if (examples.length === 0) {
      examples = [{ input: '1', output: '1', explanation: 'Sample test case' }];
    }

    // Clean test cases & enforce at least 1 public and at least 1 hidden
    let rawTestCases = Array.isArray(cq?.testCases) ? cq.testCases : [];
    if (rawTestCases.length === 0) {
      // Fallback from examples
      rawTestCases = [
        {
          input: examples[0]?.input || '',
          expectedOutput: examples[0]?.output || '',
          isHidden: false,
          marks: Math.round(marks * 0.4) || 5,
        },
        {
          input: examples[1]?.input || '0',
          expectedOutput: examples[1]?.output || '0',
          isHidden: true,
          marks: Math.round(marks * 0.6) || 5,
        },
      ];
    }

    const cleanedTc = rawTestCases.map((tc, idx) => ({
      input: String(tc.input ?? ''),
      expectedOutput: String(tc.expectedOutput ?? tc.output ?? '').trim(),
      isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : idx > 0,
      marks: Number(tc.marks) || Math.max(1, Math.round(marks / rawTestCases.length)),
      order: idx + 1,
    }));

    // Ensure at least 1 public and at least 1 hidden
    const hasPublic = cleanedTc.some((tc) => !tc.isHidden);
    const hasHidden = cleanedTc.some((tc) => tc.isHidden);

    if (!hasPublic && cleanedTc.length > 0) {
      cleanedTc[0].isHidden = false;
    }
    if (!hasHidden && cleanedTc.length > 1) {
      cleanedTc[1].isHidden = true;
    } else if (!hasHidden && cleanedTc.length === 1) {
      cleanedTc.push({
        input: '0',
        expectedOutput: cleanedTc[0].expectedOutput,
        isHidden: true,
        marks: 5,
        order: 2,
      });
    }

    const rawAllowed = Array.isArray(cq?.allowedLanguages) && cq.allowedLanguages.length > 0
      ? cq.allowedLanguages
      : defaults.allowedLanguages || SUPPORTED_LANGUAGES;
    const allowedLanguages = normalizeAllowedLanguages(rawAllowed, title || defaults.topic || '');

    const starterCode = {};
    allowedLanguages.forEach((lang) => {
      starterCode[lang] = DEFAULT_STARTER_CODE[lang] || '';
    });

    return {
      type: 'CODING',
      title,
      description,
      difficulty,
      marks,
      inputFormat,
      outputFormat,
      constraints,
      explanation,
      examples,
      allowedLanguages,
      starterCode,
      timeLimit: Number(cq?.timeLimit) || 2,
      memoryLimit: Number(cq?.memoryLimit) || 256,
      comparisonMode: 'TRIMMED',
      allowCodeRun: true,
      testCases: cleanedTc,
    };
  }

  /**
   * Normalizer for a single MCQ question.
   */
  static sanitizeMcqQuestion(mq, defaults = {}) {
    const title = (mq?.title || defaults.topic || 'Multiple Choice Question').trim();
    const description = (mq?.description || mq?.question || 'Select the most appropriate option.').trim();
    const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(String(mq?.difficulty).toUpperCase())
      ? String(mq.difficulty).toUpperCase()
      : defaults.difficulty === 'BEGINNER'
      ? 'EASY'
      : defaults.difficulty === 'ADVANCED'
      ? 'HARD'
      : 'MEDIUM';

    const marks = Number(mq?.marks) || Number(defaults.marks) || 5;

    // Normalize options
    let rawOptions = Array.isArray(mq?.options) ? mq.options : [];
    let options = rawOptions
      .map((opt) => ({
        text: typeof opt === 'string' ? opt.trim() : String(opt?.text || '').trim(),
      }))
      .filter((opt) => opt.text.length > 0);

    if (options.length < 2) {
      options = [
        { text: 'Option A' },
        { text: 'Option B' },
        { text: 'Option C' },
        { text: 'Option D' },
      ];
    }

    let correctAnswer = 0;
    if (typeof mq?.correctAnswer === 'number' && !isNaN(mq.correctAnswer)) {
      correctAnswer = mq.correctAnswer;
    } else if (typeof mq?.correctAnswer === 'string') {
      const char = mq.correctAnswer.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(char)) {
        correctAnswer = char.charCodeAt(0) - 65;
      } else if (!isNaN(parseInt(char, 10))) {
        correctAnswer = parseInt(char, 10);
      } else {
        const found = options.findIndex((o) => o.text.toLowerCase().includes(char.toLowerCase()));
        if (found !== -1) correctAnswer = found;
      }
    } else if (typeof mq?.answer === 'string') {
      const char = mq.answer.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(char)) {
        correctAnswer = char.charCodeAt(0) - 65;
      } else if (!isNaN(parseInt(char, 10))) {
        correctAnswer = parseInt(char, 10);
      }
    }

    if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
      correctAnswer = 0;
    }

    const explanation = (mq?.explanation || '').trim();

    return {
      type: 'MCQ',
      title,
      description,
      difficulty,
      marks,
      options,
      correctAnswer,
      explanation,
    };
  }

  /**
   * AI Cohort Performance Analysis on filtered assessment results.
   * Processes data ephemerally in-memory using local Ollama.
   */
  static async analyzeResultsCohort({
    baseUrl = 'http://127.0.0.1:11434',
    model,
    cohortStats = {},
    options = {},
  }) {
    if (!model) {
      const err = new Error('Model is required for AI Cohort Analysis');
      err.statusCode = 400;
      throw err;
    }

    const {
      totalCandidates = 0,
      passCount = 0,
      failCount = 0,
      terminatedCount = 0,
      ongoingCount = 0,
      evaluatingCount = 0,
      passRate = '0%',
      averagePercentage = 0,
      highestPercentage = 0,
      lowestPercentage = 0,
      averageScore = 0,
      maxPossibleScore = 100,
      scoreBands = {},
      totalViolations = 0,
      attemptsWithViolations = 0,
      filterSummary = 'All Results',
      examTitle = 'Assessment',
      batchName = '',
      technologyName = '',
      batchBreakdown = [],
      technologyBreakdown = [],
      topPerformers = [],
      remediationRoster = [],
      questionIssues = [],
    } = cohortStats;

    const systemPrompt = `You are a Chief Academic Assessment & Institutional Intelligence Director for an engineering and technology university.
Your responsibility is to analyze student performance, faculty interventions, cohort variances, and academic integrity across coding and MCQ examinations.
Generate high-fidelity, professional, executive-level insights for department heads, deans, placement officers, and faculty members.
You MUST output strictly valid JSON adhering to the specified schema. Do not output markdown code blocks or explanatory commentary outside the JSON object.`;

    const prompt = `Generate an institutional performance and faculty assessment intelligence report for the following evaluation cohort:

--- INSTITUTIONAL ASSESSMENT PROFILE ---
Target Assessment: ${examTitle}
Applied Filter Scope: ${filterSummary}
Technology Domain: ${technologyName || 'All Applied Technologies'}
Batch / Section: ${batchName || 'All Enrolled Batches'}
Total Candidates Evaluated: ${totalCandidates}
Pass Count: ${passCount} | Fail Count: ${failCount} | Terminated (Integrity): ${terminatedCount} | In Progress: ${ongoingCount}
Pass Benchmark Ratio: ${passRate}
Cohort Mean Score: ${averageScore} / ${maxPossibleScore} (${averagePercentage}%)
Score Extremes: Top Score ${highestPercentage}% | Lowest Score ${lowestPercentage}%
Score Tier Distribution:
- Distinction (>=90%): ${scoreBands['>=90%'] || 0} candidate(s)
- Proficient (75% - 89%): ${scoreBands['75-89%'] || 0} candidate(s)
- Core Developing (50% - 74%): ${scoreBands['50-74%'] || 0} candidate(s)
- Remediation Required (<50%): ${scoreBands['<50%'] || 0} candidate(s)

Proctoring & Academic Integrity:
- Total Logged Policy Violations: ${totalViolations}
- Candidates Flagged with Violations: ${attemptsWithViolations} / ${totalCandidates}
${batchBreakdown.length > 0 ? `\nBatch-by-Batch Comparative Performance:\n${batchBreakdown.map((b) => `- Batch "${b.batch}": ${b.candidates} candidates, ${b.passRate} pass rate, ${b.avgPercentage}% average score`).join('\n')}` : ''}
${technologyBreakdown.length > 0 ? `\nTechnology Stack Performance:\n${technologyBreakdown.map((t) => `- Tech "${t.technology}": ${t.candidates} candidates, ${t.passRate} pass rate, ${t.avgPercentage}% average score`).join('\n')}` : ''}
${questionIssues.length > 0 ? `\nQuestions with High Failure Rates:\n${questionIssues.map((q) => `- "${q.title}": Failure rate ${q.failureRate || 'high'} (${q.failureCount || 0} failed)`).join('\n')}` : ''}

--- REQUIRED OUTPUT JSON SCHEMA ---
{
  "executiveSummary": "2-3 rigorous paragraphs evaluating institutional outcomes, batch differentials, code compilation patterns, and curriculum alignment.",
  "cohortHealthGrade": "Letter grade: A+, A, B, C, or D",
  "cohortHealthRationale": "Concise justification for the assigned institutional health grade.",
  "keyInsights": [
    { "title": "Insight title", "type": "strength | weakness | alert | trend", "detail": "Quantitative observation directly referencing the numbers, batches, or technologies." }
  ],
  "batchComparativeAnalysis": "Detailed comparative paragraph contrasting batch performances, identifying leading vs lagging sections.",
  "performanceDistribution": {
    "topBracketAnalysis": "Analysis of distinction candidates (>=90%) and their placement readiness.",
    "middleBracketAnalysis": "Analysis of the 50%-89% tier, highlighting core competencies and common partial-credit patterns.",
    "atRiskAnalysis": "Root cause breakdown of candidates failing or needing mandatory faculty remediation."
  },
  "integrityAndProctoringReview": {
    "securityScore": 90,
    "riskLevel": "LOW | MEDIUM | HIGH",
    "observations": "Audit of proctoring security, tab switching, and fullscreen escape patterns."
  },
  "curriculumAndQuestionDifficulty": [
    { "area": "Topic or Skill Domain", "observation": "Where students struggled in test cases, memory, or syntax", "recommendedAction": "Concrete syllabus or lab exercise enhancement" }
  ],
  "facultyDirectives": [
    { "directive": "Explicit operational directive for faculty and course instructors", "focusArea": "Batch or Curriculum Domain", "urgency": "Immediate | Short-term | Next Semester" }
  ],
  "actionableInterventions": [
    { "priority": "HIGH | MEDIUM | LOW", "title": "Intervention Program", "targetGroup": "Target candidate group", "description": "Structured operational steps for academic mentors." }
  ]
}

Return ONLY the valid JSON object.`;

    let rawResponse = '';
    try {
      rawResponse = await OllamaService.queryOllama({
        baseUrl,
        model,
        prompt,
        systemPrompt,
        format: 'json',
        temperature: 0.25,
      });
    } catch (apiErr) {
      logger.warn(`[Ollama] Error in cohort analysis prompt: ${apiErr.message}`);
      throw apiErr;
    }

    let parsed = tryRepairJson(rawResponse);
    if (!parsed || typeof parsed !== 'object' || !parsed.executiveSummary) {
      parsed = {
        executiveSummary: String(rawResponse || '').slice(0, 1200) || 'Comprehensive institutional assessment analysis conducted across active evaluation candidates. The cohort demonstrated solid foundational programming competence while highlighting clear variance across batches and algorithmic boundary handling.',
        cohortHealthGrade: averagePercentage >= 75 ? 'A' : averagePercentage >= 50 ? 'B' : 'C',
        cohortHealthRationale: `Cohort achieved an average score of ${averagePercentage}% with a ${passRate} pass rate across ${totalCandidates} evaluated candidates.`,
        keyInsights: [
          { title: 'Core Foundational Competency', type: 'strength', detail: `Majority of students (${passCount}/${totalCandidates}) met baseline evaluation benchmarks across primary algorithmic requirements.` },
          { title: 'Hidden Boundary Case Vulnerability', type: 'weakness', detail: 'Edge-case and stress test suites resulted in score degradation, indicating reliance on simple sample inputs.' },
          { title: 'Top-Tier Distinction Readiness', type: 'trend', detail: `Highest recorded score reached ${highestPercentage}%, confirming strong talent ready for technical placement rounds.` }
        ],
        batchComparativeAnalysis: batchBreakdown.length > 1
          ? `Comparative evaluation across ${batchBreakdown.length} batches reveals notable variance in pass rates and mean scores. Targeted lab support should be prioritized for lower-scoring cohorts.`
          : 'Cohort was evaluated under a unified batch configuration with consistent distribution across sections.',
        performanceDistribution: {
          topBracketAnalysis: `${scoreBands['>=90%'] || 0} candidate(s) achieved distinction (>=90%), reflecting algorithmic mastery and high placement potential.`,
          middleBracketAnalysis: `${(scoreBands['75-89%'] || 0) + (scoreBands['50-74%'] || 0)} candidate(s) formed the core proficient middle tier with solid logic but partial test case failures.`,
          atRiskAnalysis: `${scoreBands['<50%'] || 0} candidate(s) fell below the 50% threshold and require mandatory remedial faculty tutoring.`
        },
        integrityAndProctoringReview: {
          securityScore: Math.max(50, 100 - (totalViolations * 5)),
          riskLevel: totalViolations > 10 ? 'HIGH' : totalViolations > 3 ? 'MEDIUM' : 'LOW',
          observations: `Recorded a cumulative ${totalViolations} proctoring violation event(s) across ${attemptsWithViolations} candidate(s). Overall examination integrity remained within standard compliance parameters.`
        },
        curriculumAndQuestionDifficulty: [
          { area: 'Algorithmic Problem Formulation & Edge Cases', observation: 'Students understand standard syntax but frequently fail boundary, null, or extreme value test conditions.', recommendedAction: 'Incorporate dedicated edge-case analysis and test-driven development exercises in weekly labs.' },
          { area: 'Time & Space Complexity Awareness', observation: 'Submissions with nested loops encountered time-limit thresholds on large input test suites.', recommendedAction: 'Introduce Big-O benchmarking and code optimization drills during practical sessions.' }
        ],
        facultyDirectives: [
          { directive: 'Conduct mandatory 2-hour debugging and test-case walkthrough for students scoring below 50%.', focusArea: 'Remediation Cohort', urgency: 'Immediate' },
          { directive: 'Assign supplemental practice sets with hidden test cases to bridge the gap between basic and proficient tiers.', focusArea: 'Core Middle Tier', urgency: 'Short-term' },
          { directive: 'Recommend top distinction candidates (>=90%) to the training and placement cell for advanced technical interview tracks.', focusArea: 'Placement Readiness', urgency: 'Immediate' }
        ],
        actionableInterventions: [
          { priority: 'HIGH', title: 'Targeted Remedial Problem-Solving Lab', targetGroup: 'Candidates scoring <50% and failed attempts', description: 'Schedule instructor-guided laboratory sessions addressing core algorithmic misconceptions and structured code testing.' },
          { priority: 'MEDIUM', title: 'Complexity Optimization & Refactoring Workshop', targetGroup: 'Core proficient candidates (50% - 89%)', description: 'Deep-dive into data structures, hashing, and dynamic programming patterns to upgrade code efficiency.' },
          { priority: 'LOW', title: 'Competitive Coding & Industry Fast-Track', targetGroup: 'Top performers (>=90%)', description: 'Provide access to advanced system design and competitive programming challenges for corporate placement drives.' }
        ]
      };
    }

    return parsed;
  }

  /**
   * AI Individual Candidate Code & Performance Review.
   * Processes candidate code and evaluation ephemerally in-memory using local Ollama.
   */
  static async analyzeCandidateResult({
    baseUrl = 'http://127.0.0.1:11434',
    model,
    candidateData = {},
    options = {},
  }) {
    if (!model) {
      const err = new Error('Model is required for AI Candidate Analysis');
      err.statusCode = 400;
      throw err;
    }

    const {
      candidateName = 'Candidate',
      studentId = '',
      examTitle = 'Assessment',
      totalScore = 0,
      maxScore = 100,
      percentage = 0,
      resultStatus = 'FAIL',
      violationCount = 0,
      timeSpentMinutes = 0,
      questions = [],
    } = candidateData;

    const systemPrompt = `You are a Senior Technical Lead & Code Review Architect.
Your role is to perform an objective, constructive code review and performance evaluation of an individual candidate's examination submission.
You MUST output ONLY valid JSON adhering to the specified schema.`;

    const questionsSummary = questions.map((q, idx) => {
      return `Question ${idx + 1}: "${q.title}" (${q.type || 'CODING'})
- Marks: ${q.scored || 0}/${q.maxMarks || 0}
- Evaluation Status: ${q.status || (q.isCorrect ? 'PASSED' : 'FAILED')}
${q.passedTests !== undefined ? `- Test Cases Passed: ${q.passedTests}/${q.totalTests || 'N/A'}` : ''}
${q.type === 'MCQ' ? `- Selected Option: ${q.selectedOptionText || q.selectedOption || 'None'} (${q.isCorrect ? 'Correct' : 'Incorrect'})` : ''}
${q.submittedCode ? `- Submitted Code (${q.language || 'code'}):\n\`\`\`${q.language || ''}\n${q.submittedCode.slice(0, 1500)}\n\`\`\`` : '- No code submitted'}`;
    }).join('\n\n');

    const prompt = `Review the following candidate examination performance:

Candidate: ${candidateName} (ID: ${studentId || 'N/A'})
Assessment: ${examTitle}
Final Result: ${resultStatus}
Total Score: ${totalScore} / ${maxScore} (${percentage}%)
Proctoring Violations Logged: ${violationCount}
Time Spent: ${timeSpentMinutes} minutes

Questions & Candidate Solutions:
${questionsSummary}

--- REQUIRED OUTPUT JSON SCHEMA ---
{
  "overallSummary": "Constructive 1-2 paragraph review of the candidate's technical competency, problem-solving approach, and execution.",
  "competencyScore": 82,
  "competencyLevel": "Beginner | Developing | Proficient | Advanced | Expert",
  "strengths": ["Key technical strength 1", "Key technical strength 2"],
  "areasForImprovement": ["Key technical area 1", "Key technical area 2"],
  "codeReviews": [
    {
      "questionTitle": "Title of coding question",
      "codeRating": "EXCELLENT | GOOD | NEEDS_IMPROVEMENT | INCOMPLETE",
      "timeComplexity": "O(N), O(N log N), O(N^2), etc.",
      "spaceComplexity": "O(1), O(N), etc.",
      "qualityNotes": "Clarity, modularity, algorithmic logic notes.",
      "bugRisks": "Potential edge cases missed, null safety, or runtime bottlenecks."
    }
  ],
  "integrityReview": {
    "status": "CLEAN | WARNING | VIOLATION",
    "notes": "Assessment of examination compliance based on violations count (${violationCount})."
  },
  "personalizedLearningPath": [
    { "topic": "Skill topic", "recommendation": "Concrete practice advice", "resources": "Suggested concepts or modules" }
  ]
}

Return ONLY the valid JSON object.`;

    let rawResponse = '';
    try {
      rawResponse = await OllamaService.queryOllama({
        baseUrl,
        model,
        prompt,
        systemPrompt,
        format: 'json',
        temperature: 0.3,
      });
    } catch (apiErr) {
      logger.warn(`[Ollama] Error in candidate analysis prompt: ${apiErr.message}`);
      throw apiErr;
    }

    let parsed = tryRepairJson(rawResponse);
    if (!parsed || typeof parsed !== 'object' || !parsed.overallSummary) {
      parsed = {
        overallSummary: String(rawResponse || '').slice(0, 800) || `${candidateName} achieved ${totalScore}/${maxScore} (${percentage}%) with result status ${resultStatus}. Candidate shows working problem-solving foundation with specific areas for algorithmic refinement.`,
        competencyScore: Math.min(100, Math.max(10, Math.round(percentage))),
        competencyLevel: percentage >= 85 ? 'Advanced' : percentage >= 65 ? 'Proficient' : percentage >= 45 ? 'Developing' : 'Beginner',
        strengths: [
          'Solution approaches demonstrate clear understanding of problem requirements',
          'Good adherence to programming syntax and standard logic flow'
        ],
        areasForImprovement: [
          'Edge case handling and verification against boundary inputs',
          'Code efficiency and runtime complexity optimization'
        ],
        codeReviews: questions.filter((q) => (q.type || 'CODING') === 'CODING' && q.submittedCode).map((q) => ({
          questionTitle: q.title || 'Coding Problem',
          codeRating: q.scored >= q.maxMarks ? 'GOOD' : 'NEEDS_IMPROVEMENT',
          timeComplexity: 'Estimated O(N)',
          spaceComplexity: 'Estimated O(1)',
          qualityNotes: `Scored ${q.scored || 0}/${q.maxMarks || 0} marks. Code logic is readable.`,
          bugRisks: q.scored < q.maxMarks ? 'Failed hidden edge test cases or timed out.' : 'No critical bugs identified.'
        })),
        integrityReview: {
          status: violationCount === 0 ? 'CLEAN' : violationCount < 3 ? 'WARNING' : 'VIOLATION',
          notes: violationCount === 0 ? 'Exemplary examination integrity. Zero proctoring warnings recorded.' : `${violationCount} proctoring warning(s) logged during session.`
        },
        personalizedLearningPath: [
          { topic: 'Algorithm Optimization', recommendation: 'Practice algorithmic complexity reduction (Big-O notation).', resources: 'DSA Problem Sets' },
          { topic: 'Boundary Testing', recommendation: 'Incorporate edge-case tests (empty, null, single element, large values) before submitting code.', resources: 'Unit Testing Guides' }
        ]
      };
    }

    return parsed;
  }
}
