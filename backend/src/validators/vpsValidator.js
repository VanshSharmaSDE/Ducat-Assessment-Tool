import { z } from 'zod';

export const containerIdParamSchema = z.object({
  id: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_\-\.]+$/, {
    message: 'Container ID must contain only alphanumeric characters, dashes, underscores, or dots',
  }),
});

export const applicationIdParamSchema = z.object({
  id: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_\-\.]+$/, {
    message: 'Application ID/Name must contain only alphanumeric characters, dashes, underscores, or dots',
  }),
});

export const logsQuerySchema = z.object({
  lines: z.coerce.number().int().min(10).max(1000).default(100),
  source: z.enum(['all', 'docker', 'pm2', 'system']).default('all'),
  severity: z.enum(['all', 'info', 'warn', 'error']).default('all'),
  search: z.string().trim().max(100).optional(),
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().max(50).optional(),
  status: z.enum(['ALL', 'SUCCESS', 'FAILED']).default('ALL'),
});
