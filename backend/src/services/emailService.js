const { escapeHtml } = require('../utils/html');
const { renderDoseReminder } = require('../emails/doseReminder');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const PASSWORD_RESET_SUBJECT = 'Reset Your Password';
const REQUEST_TIMEOUT_MS = 10000;

const buildPasswordResetHtml = ({ fullName, resetUrl }) => {
  const safeName = escapeHtml(fullName || 'there');
  const safeUrl = escapeHtml(resetUrl);

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#dc2626;">MedTrack Access</p>
                <h1 style="margin:0;font-size:24px;line-height:1.3;color:#0f172a;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;">
                <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#475569;">Hi ${safeName},</p>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#475569;">
                  We received a request to reset the password for your MedTrack account. Click the button below to choose a new password.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;" align="center">
                <a href="${safeUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;">Reset Password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  This link expires in <strong style="color:#334155;">30 minutes</strong> and can only be used once.
                </p>
                <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  If you did not request a password reset, you can safely ignore this email. Your password will not change.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${safeUrl}" style="color:#dc2626;word-break:break-all;">${safeUrl}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">MedTrack &middot; Medication adherence, simplified.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const buildPasswordResetText = ({ fullName, resetUrl }) => `Hi ${fullName || 'there'},

We received a request to reset the password for your MedTrack account.

Reset your password here:
${resetUrl}

This link expires in 30 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email. Your password will not change.

MedTrack`;

/**
 * Send one transactional email through the Brevo API.
 *
 * The transport concerns (timeout, HTTP status, provider error body) live here
 * so every caller gets consistent logging and error messages. Callers own the
 * template only.
 *
 * @param {{ to: string, toName?: string, subject: string, html: string, text?: string, tags?: string[] }} email
 * @returns {Promise<object>} Brevo response body on success
 */
const sendEmail = async ({ to, toName, subject, html, text, tags }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'MedTrack';

  if (!apiKey || !senderEmail) {
    throw new Error('Brevo email service is not configured.');
  }
  if (!to) {
    throw new Error('sendEmail: a recipient address is required.');
  }

  let response;

  try {
    response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to, name: toName || undefined }],
        subject,
        htmlContent: html,
        ...(text ? { textContent: text } : {}),
        ...(Array.isArray(tags) && tags.length ? { tags } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError'
      ? `request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
      : err.message;
    console.error(`[Brevo] Network error while sending email: ${reason}`);
    throw new Error(`Could not reach Brevo: ${reason}`);
  }

  // Parse the response body once so both success and failure paths can use it.
  const rawBody = await response.text().catch(() => '');
  let data = {};
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    // Log only the provider's status/message/code - never the recipient or body.
    const providerCode = data.code ? ` (${data.code})` : '';
    const providerMessage = data.message || (rawBody ? 'unparseable response body' : 'empty response body');
    console.error(
      `[Brevo] Email send failed: HTTP ${response.status} ${response.statusText}${providerCode} - ${providerMessage}`
    );
    throw new Error(
      `Brevo request failed with status ${response.status}${providerCode}: ${providerMessage}`
    );
  }

  console.log(
    `[Brevo] Email accepted${data.messageId ? ` (messageId: ${data.messageId})` : ''}.`
  );
  return data;
};

/**
 * Send a password-reset email. Never logs the token, reset URL, or API key.
 */
const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  return sendEmail({
    to,
    toName: fullName,
    subject: PASSWORD_RESET_SUBJECT,
    html: buildPasswordResetHtml({ fullName, resetUrl }),
    text: buildPasswordResetText({ fullName, resetUrl }),
  });
};

/**
 * Send the dose reminder. The caller is responsible for deciding whether the
 * dose is eligible (status, toggles, grace window, dedupe).
 */
const sendDoseReminderEmail = async ({
  to,
  toName,
  fullName,
  medicineName,
  dosage,
  form,
  scheduledTime,
  scheduledAt,
  timezone,
  dashboardUrl,
}) => {
  const { subject, html, text } = renderDoseReminder({
    fullName,
    medicineName,
    dosage,
    form,
    scheduledTime,
    scheduledAt,
    timezone,
    dashboardUrl,
  });

  return sendEmail({
    to,
    toName: toName || fullName,
    subject,
    html,
    text,
    tags: ['dose-reminder'],
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendDoseReminderEmail,
};
