import rateLimit from 'express-rate-limit';

const isRateLimitDisabled = process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test';

export const generalLimiter = isRateLimitDisabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.GENERAL_RATE_LIMIT_MAX || '25000', 10), // 25,000 requests per 15 mins
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      },
    });

export const authLimiter = isRateLimitDisabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '1000', 10), // 1,000 attempts per 15 minutes
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many login/registration attempts. Please wait 15 minutes.',
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
      },
    });
