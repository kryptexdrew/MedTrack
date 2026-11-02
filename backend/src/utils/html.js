/**
 * Minimal HTML escaping for values interpolated into email templates.
 * Kept dependency-free so both the text and HTML builders can share it.
 */
const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

module.exports = { escapeHtml };
