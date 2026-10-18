import nodemailer from 'nodemailer';

/**
 * Configure Nodemailer SMTP Transporter
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
  const port = Number(process.env.SMTP_PORT) || 2525;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';

  // If no SMTP credentials provided, return null to handle graceful fallback
  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    // Prevent long timeout freezes on broken SMTP connections
    connectionTimeout: 8000,
    greetingTimeout: 8000,
  });
}

/**
 * Send an executive support ticket email to the developer
 */
export async function sendDeveloperSupportEmail({
  ticketId,
  adminName,
  adminEmail,
  adminPhone,
  subject,
  category,
  priority,
  description,
  developerEmail,
  systemDiagnostics,
}) {
  const transporter = createTransporter();
  const recipient = developerEmail || process.env.DEVELOPER_EMAIL || 'support@skillcodex.com';
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@skillcodex.com';

  if (!transporter) {
    console.warn(`[MailService] SMTP credentials not configured in backend/.env. Mail for ${ticketId} stored for manual dispatch.`);
    return {
      success: false,
      reason: 'SMTP_NOT_CONFIGURED',
      error: 'SMTP credentials (SMTP_USER / SMTP_PASSWORD) are not configured in backend .env. Ticket was safely recorded in database.',
    };
  }

  const priorityColor =
    priority === 'CRITICAL'
      ? '#dc2626'
      : priority === 'HIGH'
      ? '#ea580c'
      : priority === 'MEDIUM'
      ? '#4f6bf7'
      : '#16a34a';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fe; margin: 0; padding: 24px; color: #1e293b; }
        .card { background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 650px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 24px; color: #ffffff; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #ffffff; }
        .content { padding: 28px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; padding: 16px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 13px; }
        .desc-box { background-color: #f1f5f9; padding: 16px; border-radius: 12px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-family: inherit; margin-top: 12px; border-left: 4px solid #4f6bf7; }
        .diag-box { background-color: #0f172a; color: #38bdf8; padding: 14px; border-radius: 10px; font-size: 11px; font-family: monospace; overflow-x: auto; margin-top: 10px; }
        .footer { padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px; letter-spacing: -0.5px;">SkillCodex Admin Developer Ticket</h2>
            <span class="badge" style="background-color: ${priorityColor};">${priority}</span>
          </div>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8;">Ref: <strong>${ticketId}</strong> &bull; Category: ${category}</p>
        </div>
        <div class="content">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">${subject}</h3>

          <div class="info-grid">
            <div><strong>Submitted By:</strong> ${adminName}</div>
            <div><strong>Admin Email:</strong> ${adminEmail || 'N/A'}</div>
            <div><strong>Phone / Contact:</strong> ${adminPhone || 'N/A'}</div>
            <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
          </div>

          <label style="font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase;">Issue Description & Logs:</label>
          <div class="desc-box">${description}</div>

          ${
            systemDiagnostics && Object.keys(systemDiagnostics).length > 0
              ? `
              <div style="margin-top: 20px;">
                <label style="font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase;">System Diagnostics Attached:</label>
                <pre class="diag-box">${JSON.stringify(systemDiagnostics, null, 2)}</pre>
              </div>
              `
              : ''
          }
        </div>
        <div class="footer">
          This is an automated notification from SkillCodex Assessment Platform developer support pipeline.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"SkillCodex Platform" <${fromEmail}>`,
      to: recipient,
      subject: `[${priority}] [${ticketId}] ${subject}`,
      text: `Admin ${adminName} (${adminEmail}) submitted support ticket ${ticketId} [${priority} - ${category}]:\n\n${description}\n\nSystem Diagnostics:\n${JSON.stringify(systemDiagnostics, null, 2)}`,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(`[MailService] Error sending email for ${ticketId}:`, err);
    return {
      success: false,
      reason: 'SEND_FAILED',
      error: err.message,
    };
  }
}
