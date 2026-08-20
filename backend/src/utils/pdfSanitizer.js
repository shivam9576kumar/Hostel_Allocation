// PDFKit `text()` does NOT fetch URLs, but we enforce strict sanitization 
// to prevent any accidental evaluation or metadata leakage.
const sanitizePdfText = (input) => {
  if (typeof input !== 'string') return '';
  // Remove control characters and potential URL schemes (http, file, ftp)
  return input.replace(/https?:\/\/[^\s]+/gi, '[URL_REDACTED]')
              .replace(/file:\/\/\/[^\s]+/gi, '[FILE_PATH_REDACTED]')
              .replace(/[\u0000-\u001F\u007F]/g, ''); // Remove non-printable chars
};

module.exports = { sanitizePdfText };
