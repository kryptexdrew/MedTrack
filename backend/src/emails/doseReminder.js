const { escapeHtml } = require('../utils/html');
const { isValidTimeZone } = require('../utils/timeZone');

const DEFAULT_APP_URL = 'http://localhost:5173';

/**
 * "8:00 AM on Saturday, October 31".
 *
 * `scheduledTime` is already the user's wall-clock value as stored on the dose,
 * so it is preferred over reformatting the UTC instant. The date comes from the
 * UTC instant rendered in the user's own timezone, which keeps DST correct.
 */
const formatScheduledLabel = ({ scheduledAt, scheduledTime, timezone }) => {
  const hasZone = isValidTimeZone(timezone);
  const timeLabel = scheduledTime
    ? String(scheduledTime)
    : scheduledAt
      ? new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          ...(hasZone ? { timeZone: timezone } : {}),
        }).format(new Date(scheduledAt))
      : '';

  if (!scheduledAt) return timeLabel;

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(hasZone ? { timeZone: timezone } : {}),
  }).format(new Date(scheduledAt));

  return timeLabel ? `${timeLabel} on ${dateLabel}` : dateLabel;
};

/**
 * Renders the scheduled-dose reminder.
 *
 * Table-based layout with inline styles because Outlook ignores most modern
 * CSS. The header is a solid brand red rather than a gradient for the same
 * reason. All interpolated values are HTML-escaped.
 *
 * @returns {{ subject: string, html: string, text: string }}
 */
const renderDoseReminder = ({
  fullName,
  medicineName,
  dosage,
  form,
  scheduledTime,
  scheduledAt,
  timezone,
  dashboardUrl,
}) => {
  const appUrl = String(dashboardUrl || DEFAULT_APP_URL).replace(/\/+$/, '') || DEFAULT_APP_URL;

  const safeName = escapeHtml(fullName || 'there');
  const safeMedicine = escapeHtml(medicineName || 'your medication');
  const safeDosage = escapeHtml(dosage || '');
  const safeForm = escapeHtml(form || '');
  const safeUrl = escapeHtml(appUrl);
  const scheduledLabel = escapeHtml(
    formatScheduledLabel({ scheduledAt, scheduledTime, timezone })
  );

  const subject = `MedTrack reminder: ${String(medicineName || 'your medication').replace(/[\r\n]+/g, ' ')}${dosage ? ` ${String(dosage).replace(/[\r\n]+/g, ' ')}` : ''
    }`.slice(0, 180);

  const dosageLine = [safeDosage, safeForm].filter(Boolean).join(' &middot; ');

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Time for ${safeMedicine} ${safeDosage}.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">

            <tr>
              <td style="background-color:#b91c1c;padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background-color:#991b1b;color:#ffffff;font-size:17px;font-weight:700;">+</span>
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:20px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;line-height:1.1;">MedTrack</div>
                      <div style="margin-top:4px;font-size:10px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:#fecaca;">Medication reminder</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 32px 0;">
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#dc2626;">Dose scheduled</p>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#0f172a;">It&rsquo;s time to take your medication.</h1>
                <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#475569;">Hi ${safeName}, this is your scheduled reminder from MedTrack.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#64748b;">Medication</p>
                      <p style="margin:5px 0 0;font-size:20px;line-height:1.3;font-weight:700;color:#0f172a;">${safeMedicine}</p>
                      ${dosageLine ? `<p style="margin:3px 0 0;font-size:14px;line-height:1.5;color:#475569;">${dosageLine}</p>` : ''}
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
                      <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#64748b;">Scheduled time</p>
                      <p style="margin:5px 0 0;font-size:16px;line-height:1.4;font-weight:600;color:#0f172a;">${scheduledLabel || 'Now'}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:28px 32px 8px;">
                <a href="${safeUrl}" style="display:inline-block;background-color:#b91c1c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 30px;border-radius:12px;">Open Dashboard</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 0;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">Already taken it? Mark it as taken in the app so we stop reminding you.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 30px;">
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  You are receiving this because email reminders are on for ${safeMedicine}.
                </p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Manage your reminders any time in <a href="${safeUrl}" style="color:#b91c1c;text-decoration:none;font-weight:600;">MedTrack</a>.
                </p>
                <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#cbd5e1;">
                  &copy; 2026 MedTrack Healthcare Systems, Inc. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${fullName || 'there'},

It's time to take your medication.

Medication: ${medicineName || 'your medication'}
${dosage ? `Dosage: ${dosage}${form ? ` (${form})` : ''}\n` : ''}Scheduled: ${formatScheduledLabel({ scheduledAt, scheduledTime, timezone }) || 'Now'}

Open MedTrack to mark it as taken: ${appUrl}

Already taken it? Mark it in the app so we stop reminding you.

You are receiving this because email reminders are on for ${medicineName || 'this medication'}.

(c) 2026 MedTrack Healthcare Systems, Inc. All rights reserved.`;

  return { subject, html, text };
};

module.exports = { renderDoseReminder, formatScheduledLabel };
