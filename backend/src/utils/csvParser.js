const xlsx = require('xlsx');
const { Student, ProgramCode } = require('../models');
const { parseRollNumber, generateEmail } = require('./rollNumberParser');

async function parseAndInsertStudents(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  let insertedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // Accounting for 1-based index + header row

    // Normalize keys (handle case-sensitivity & whitespace)
    const normalized = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      normalized[cleanKey] = String(row[key]).trim();
    });

    const rollNumber = normalized['rollnumber'] || normalized['rollno'] || normalized['roll_number'];
    const fullName = normalized['fullname'] || normalized['name'] || normalized['full_name'];
    const email = normalized['email'] || normalized['studentemail'];
    const gender = normalized['gender'];
    const programme = normalized['programme'] || normalized['program'];
    const yearStr = normalized['year'];

    if (!rollNumber || !fullName || !gender || !programme || !yearStr) {
      errors.push(`Row ${rowNum}: Missing required fields (RollNumber, FullName, Gender, Programme, Year).`);
      skippedCount++;
      continue;
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      errors.push(`Row ${rowNum}: Year must be a valid integer.`);
      skippedCount++;
      continue;
    }

    try {
      let parsed = null;
      try {
        parsed = parseRollNumber(rollNumber);
      } catch (e) {
        // Fallback if custom format
      }

      const admissionYear = parsed ? parsed.admissionYear : null;
      const programCode = parsed ? parsed.programCode : null;
      const department = parsed ? parsed.department : null;

      let hostelStayEndYear = null;
      if (admissionYear && programCode) {
        const pcRecord = await ProgramCode.findOne({ where: { code: programCode } });
        if (pcRecord) {
          hostelStayEndYear = admissionYear + pcRecord.hostel_stay;
        }
      }

      const finalEmail = email || generateEmail(fullName, rollNumber);

      // Check if student already exists by email or roll_number
      const existing = await Student.findOne({
        where: {
          [Student.sequelize.Sequelize.Op.or]: [
            { roll_number: rollNumber },
            { email: finalEmail }
          ]
        }
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await Student.create({
        roll_number: rollNumber,
        full_name: fullName,
        email: finalEmail,
        gender: gender,
        programme: programme,
        year: year,
        department: department,
        admission_year: admissionYear,
        program_code: programCode,
        hostel_stay_end_year: hostelStayEndYear,
        status: 'active',
        booking_status: 'Pending',
        booked_room_id: null
      });

      insertedCount++;
    } catch (err) {
      errors.push(`Row ${rowNum} (${rollNumber}): ${err.message}`);
      skippedCount++;
    }
  }

  return {
    totalRows: rawRows.length,
    insertedCount,
    skippedCount,
    errors
  };
}

module.exports = {
  parseAndInsertStudents
};
