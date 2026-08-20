const sanitizeField = (value) => {
  if (typeof value !== 'string') return value;
  // Defang Excel/CSV injection characters: =, +, -, @, |, %
  if (['=', '+', '-', '@', '|', '%'].includes(value.charAt(0))) {
    return `'${value}`; // Prepend apostrophe to neutralize formula
  }
  return value;
};

const sanitizeRow = (row) => {
  const sanitized = {};
  for (const [key, val] of Object.entries(row)) {
    sanitized[key] = sanitizeField(val);
  }
  return sanitized;
};

module.exports = { sanitizeRow, sanitizeField };
