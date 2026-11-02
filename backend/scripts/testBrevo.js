#!/usr/bin/env node
/**
 * Manual Brevo diagnostic.
 *
 * Usage:
 *   npm run test:email                 # sends to BREVO_SENDER_EMAIL
 *   npm run test:email -- you@mail.com # sends to a specific address
 *
 * Prints the exact HTTP status and JSON body from Brevo so auth/IP/sender
 * problems are visible instead of being swallowed by the API route.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || 'MedTrack';
const to = process.argv[2] || senderEmail;

if (!apiKey || !senderEmail) {
  console.error('Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in backend/.env');
  process.exit(1);
}

if (!to) {
  console.error('No recipient. Pass one: npm run test:email -- you@mail.com');
  process.exit(1);
}

(async () => {
  console.log(`Sender:    ${senderEmail}`);
  console.log(`Recipient: ${to}`);
  console.log('Calling Brevo...');

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject: 'MedTrack Brevo test',
      htmlContent: '<p>Brevo delivery test from the MedTrack backend.</p>',
      textContent: 'Brevo delivery test from the MedTrack backend.',
    }),
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  console.log(`HTTP ${response.status} ${response.statusText}`);
  console.log(JSON.stringify(body, null, 2));

  process.exit(response.ok ? 0 : 1);
})().catch((err) => {
  console.error('Request failed:', err.message);
  if (err.cause) console.error('Cause:', err.cause.message || err.cause);
  process.exit(1);
});
