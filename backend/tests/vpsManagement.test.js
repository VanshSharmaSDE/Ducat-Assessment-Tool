import { VpsService, sanitizeLogOutput } from '../src/services/vpsService.js';
import {
  containerIdParamSchema,
  applicationIdParamSchema,
  logsQuerySchema,
} from '../src/validators/vpsValidator.js';

describe('VPS Management Service & Security Tests', () => {
  test('VpsService.getOverview returns valid real system telemetry', async () => {
    const overview = await VpsService.getOverview();
    expect(overview).toBeDefined();
    expect(overview.server).toBeDefined();
    expect(overview.server.status).toBe('ONLINE');
    expect(typeof overview.server.hostname).toBe('string');
    expect(typeof overview.server.platform).toBe('string');
    expect(overview.server.uptimeSeconds).toBeGreaterThanOrEqual(0);

    expect(overview.resources).toBeDefined();
    expect(overview.resources.cpu.cores).toBeGreaterThanOrEqual(1);
    expect(overview.resources.cpu.utilizationPercent).toBeGreaterThanOrEqual(0);
    expect(overview.resources.cpu.utilizationPercent).toBeLessThanOrEqual(100);

    expect(overview.resources.memory.totalBytes).toBeGreaterThan(0);
    expect(overview.resources.memory.usagePercent).toBeGreaterThanOrEqual(0);
    expect(overview.resources.memory.usagePercent).toBeLessThanOrEqual(100);

    expect(Array.isArray(overview.resources.disks)).toBe(true);
    expect(overview.applicationHealth).toBeDefined();
    expect(typeof overview.applicationHealth.docker.daemonRunning).toBe('boolean');
  });

  test('formatUptime correctly formats time intervals', () => {
    expect(VpsService.formatUptime(45)).toBe('0m');
    expect(VpsService.formatUptime(125)).toBe('2m');
    expect(VpsService.formatUptime(3665)).toBe('1h 1m');
    expect(VpsService.formatUptime(90061)).toBe('1d 1h 1m');
  });

  test('sanitizeLogOutput redacts secrets, tokens, and credentials', () => {
    const rawLog = 'Connecting with password="super_secret_123" and JWT_SECRET: "my_key_999"';
    const sanitized = sanitizeLogOutput(rawLog);
    expect(sanitized).not.toContain('super_secret_123');
    expect(sanitized).not.toContain('my_key_999');
    expect(sanitized).toContain('[REDACTED]');

    const tokenLog = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc';
    const sanitizedToken = sanitizeLogOutput(tokenLog);
    expect(sanitizedToken).toContain('Bearer [REDACTED_TOKEN]');
    expect(sanitizedToken).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc');

    const uriLog = 'Connected to mongodb://root:secretPass123@vps.internal:27017/prod';
    const sanitizedUri = sanitizeLogOutput(uriLog);
    expect(sanitizedUri).not.toContain('secretPass123');
    expect(sanitizedUri).toContain('mongodb://root:***@vps.internal:27017/prod');
  });

  test('Input validation blocks shell injection in container and application identifiers', () => {
    // Valid identifiers
    expect(containerIdParamSchema.safeParse({ id: 'c123abc' }).success).toBe(true);
    expect(containerIdParamSchema.safeParse({ id: 'codeassess-python-1' }).success).toBe(true);
    expect(applicationIdParamSchema.safeParse({ id: 'backend-api' }).success).toBe(true);

    // Shell injection attempts must fail
    expect(containerIdParamSchema.safeParse({ id: 'container; rm -rf /' }).success).toBe(false);
    expect(containerIdParamSchema.safeParse({ id: 'test && cat /etc/passwd' }).success).toBe(false);
    expect(containerIdParamSchema.safeParse({ id: '`whoami`' }).success).toBe(false);
    expect(containerIdParamSchema.safeParse({ id: 'app$(id)' }).success).toBe(false);
    expect(containerIdParamSchema.safeParse({ id: 'app|bash' }).success).toBe(false);
  });

  test('Log query validation bounds line limit within safety limits', () => {
    const parsed = logsQuerySchema.parse({ lines: '250', source: 'docker', severity: 'error' });
    expect(parsed.lines).toBe(250);
    expect(parsed.source).toBe('docker');
    expect(parsed.severity).toBe('error');

    // Reject out-of-bound line values
    expect(logsQuerySchema.safeParse({ lines: '5' }).success).toBe(false); // below min 10
    expect(logsQuerySchema.safeParse({ lines: '5000' }).success).toBe(false); // above max 1000
    expect(logsQuerySchema.safeParse({ source: 'invalid_source' }).success).toBe(false);
  });

  test('VpsService.getMonitoredServices returns structured diagnostics', async () => {
    const services = await VpsService.getMonitoredServices();
    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThanOrEqual(4);
    const serviceIds = services.map((s) => s.id);
    expect(serviceIds).toContain('mongodb');
    expect(serviceIds).toContain('nginx');
    expect(serviceIds).toContain('docker');
    expect(serviceIds).toContain('vps-agent');

    for (const s of services) {
      expect(['active', 'inactive', 'failed', 'unknown']).toContain(s.status);
      expect(typeof s.displayName).toBe('string');
    }
  });

  test('VpsService.listApplications returns supervised or PM2 processes', async () => {
    const result = await VpsService.listApplications();
    expect(result).toBeDefined();
    expect(Array.isArray(result.applications)).toBe(true);
    expect(result.applications.length).toBeGreaterThan(0);
    const app = result.applications[0];
    expect(app.name).toBeDefined();
    expect(app.status).toBeDefined();
    expect(app.pid).toBeGreaterThan(0);
  });
});
