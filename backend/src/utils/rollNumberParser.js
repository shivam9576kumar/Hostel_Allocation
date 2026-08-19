/**
 * Parse a roll number into its components
 * Supports both standard (e.g., "2401CS06", "2211MC09") and 4-digit year formats (e.g., "2023EE10234", "2025ME20012").
 * @param {string} rollNumber - e.g., "2401CS06" or "2023EE10234"
 * @returns {object} { admissionYear, programCode, department, serialNumber }
 */
function parseRollNumber(rollNumber) {
  if (!rollNumber || typeof rollNumber !== 'string') {
    throw new Error(`Invalid roll number format: ${rollNumber}`);
  }

  const cleanRoll = rollNumber.trim().toUpperCase();

  // Pattern 1: 4-digit year format (e.g., 2023EE10234, 2025ME20012)
  // YYYY (4 digits) + DC (2 letters) + REST (digits)
  const match4Digit = cleanRoll.match(/^(20\d{2})([A-Z]{2})(\d+)$/);
  if (match4Digit) {
    const [, yyyy, dc, rest] = match4Digit;
    const admissionYear = parseInt(yyyy, 10);
    const department = dc;
    let programCode = 1; // Default to B.Tech code 1
    const firstDigit = rest.charAt(0);
    if (firstDigit === '1') programCode = 1;
    else if (firstDigit === '2') programCode = 11;
    else if (firstDigit === '3') programCode = 21;
    else if (firstDigit === '4') programCode = 12;

    const serialNumber = parseInt(rest, 10);
    return { admissionYear, programCode, department, serialNumber };
  }

  // Pattern 2: Standard 2-digit year format (e.g., 2401CS06, 2211MC09)
  // YY (2 digits) + PC (1 or 2 digits) + DC (2 letters) + SSS (digits)
  const match2Digit = cleanRoll.match(/^(\d{2})(\d{1,2})([A-Z]{2})(\d+)$/);
  if (match2Digit) {
    const [, yy, pc, dc, sss] = match2Digit;
    const admissionYear = 2000 + parseInt(yy, 10);
    const programCode = parseInt(pc, 10);
    const department = dc;
    const serialNumber = parseInt(sss, 10);
    return { admissionYear, programCode, department, serialNumber };
  }

  throw new Error(`Invalid roll number format: ${rollNumber}`);
}

/**
 * Generate email from name and roll number
 * @param {string} fullName - e.g., "Shivam Kumar"
 * @param {string} rollNumber - e.g., "2401CS06"
 * @returns {string} - e.g., "shivam_kumar_2401cs06@iitp.ac.in"
 */
function generateEmail(fullName, rollNumber) {
  if (!fullName) return `${rollNumber.toLowerCase()}@iitp.ac.in`;
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0].toLowerCase();
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
  const nameStr = lastName ? `${firstName}_${lastName}` : firstName;
  return `${nameStr}_${rollNumber.toLowerCase()}@iitp.ac.in`;
}

module.exports = {
  parseRollNumber,
  generateEmail,
};
