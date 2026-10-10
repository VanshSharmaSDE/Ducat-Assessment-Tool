import dotenv from 'dotenv';


dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/coding_assessment',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_access_token_key_change_in_production_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_token_key_change_in_production_2026',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Docker sandbox used ONLY for compiling/running submitted code (Java, Python, JS)
  execution: {
    // One dedicated image per language
    images: {
      java: process.env.JAVA_IMAGE || 'codeassess-java',
      python: process.env.PYTHON_IMAGE || 'codeassess-python',
      javascript: process.env.JS_IMAGE || 'codeassess-js',
    },
    // Warm containers started at boot, per language (scale the busy language up)
    containersPerLanguage: {
      java: parseInt(process.env.JAVA_CONTAINERS || '1', 10),
      python: parseInt(process.env.PYTHON_CONTAINERS || '1', 10),
      javascript: parseInt(process.env.JS_CONTAINERS || '1', 10),
    },
    // Submissions evaluated in parallel inside ONE container
    jobsPerContainer: parseInt(process.env.JOBS_PER_CONTAINER || '4', 10),
    containerMemory: process.env.CONTAINER_MEMORY || '1g',
    containerCpus: process.env.CONTAINER_CPUS || '2.0',
    compileTimeoutSec: parseInt(process.env.COMPILE_TIMEOUT_SEC || '20', 10),
    maxMemory: process.env.DOCKER_MAX_MEMORY || '256m',
    maxCpus: process.env.DOCKER_MAX_CPUS || '1.0',
    pidsLimit: parseInt(process.env.DOCKER_PIDS_LIMIT || '512', 10),
    maxSourceCodeBytes: parseInt(process.env.MAX_SOURCE_CODE_SIZE_BYTES || '65536', 10), // 64 KB
    maxOutputSizeBytes: parseInt(process.env.MAX_OUTPUT_SIZE_BYTES || '1048576', 10), // 1 MB
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.FROM_EMAIL || 'no-reply@assessment.com',
  },
};
