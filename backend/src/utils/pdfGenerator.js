const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateAllocationPDF({
  hostelName,
  blockName,
  floorNumber,
  roomNumber,
  student1,
  student2,
  student3,
  roommates = [],
  allocationDate,
  isSwap = false,
  version = 1
}) {
  const pdfsDir = path.join(__dirname, '../../pdfs');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  // Compile full list of roommates
  const allRoommates = [...roommates];
  if (student2 && !allRoommates.some(r => r.roll_number === student2.roll_number)) {
    allRoommates.push(student2);
  }
  if (student3 && !allRoommates.some(r => r.roll_number === student3.roll_number)) {
    allRoommates.push(student3);
  }

  const rollA = student1.roll_number.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `allocation_${rollA}_v${version}.pdf`;
  const filePath = path.join(pdfsDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Decorative Header Banner
    doc.rect(0, 0, doc.page.width, 105).fill('#1e3a8a');
    doc.fillColor('#ffffff')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('INDIAN INSTITUTE OF TECHNOLOGY', 40, 25, { align: 'center' });
    doc.fontSize(14)
       .font('Helvetica')
       .text('Official Hostel Allocation Certificate', 40, 58, { align: 'center' });

    let boxTop = 120;

    // Optional Watermark Banner for Room Swaps
    if (isSwap) {
      doc.rect(40, 115, doc.page.width - 80, 28).fill('#fef3c7').strokeColor('#d97706').stroke();
      doc.fillColor('#92400e')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('** UPDATED ALLOCATION DUE TO ROOM SWAP **', 40, 123, { align: 'center' });
      boxTop = 152;
    }

    // Certificate Box Container
    const boxHeight = isSwap ? 555 : 590;
    doc.rect(40, boxTop, doc.page.width - 80, boxHeight)
       .lineWidth(1.5)
       .strokeColor('#cbd5e1')
       .stroke();

    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold');
    doc.text(`ALLOCATION DETAILS (v${version})`, 55, boxTop + 12);

    doc.moveTo(55, boxTop + 30).lineTo(doc.page.width - 55, boxTop + 30).strokeColor('#e2e8f0').stroke();

    // Key-Value Grid Helper
    function addRow(label, value, y, labelWidth = 130) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text(label, 55, y);
      doc.fontSize(10).font('Helvetica').fillColor('#0f172a').text(value || 'N/A', 55 + labelWidth, y);
    }

    let currentY = boxTop + 40;
    addRow('Hostel Name:', hostelName, currentY); currentY += 18;
    addRow('Block Name:', blockName, currentY); currentY += 18;
    addRow('Floor Number:', `Floor ${floorNumber}`, currentY); currentY += 18;
    addRow('Room Number:', `Room ${roomNumber}`, currentY); currentY += 18;
    addRow('Allocation Date:', new Date(allocationDate).toLocaleString(), currentY); currentY += 24;

    doc.moveTo(55, currentY).lineTo(doc.page.width - 55, currentY).strokeColor('#e2e8f0').stroke();
    currentY += 14;

    // Student 1 (Primary Allottee)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text('PRIMARY ALLOTTEE (THIS CERTIFICATE)', 55, currentY);
    currentY += 18;
    addRow('Full Name:', student1.full_name, currentY); currentY += 16;
    addRow('Roll Number:', student1.roll_number, currentY); currentY += 16;
    addRow('Email Address:', student1.email, currentY); currentY += 16;
    addRow('Programme & Year:', `${student1.programme} - Year ${student1.year}`, currentY); currentY += 22;

    doc.moveTo(55, currentY).lineTo(doc.page.width - 55, currentY).strokeColor('#e2e8f0').stroke();
    currentY += 14;

    // Roommates Section
    if (allRoommates.length === 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text('ROOMMATE(S)', 55, currentY);
      currentY += 18;
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#94a3b8').text('No roommates currently assigned / Single occupancy', 55, currentY);
      currentY += 22;
    } else {
      allRoommates.forEach((roommate, idx) => {
        const title = allRoommates.length === 1 
          ? 'ROOMMATE' 
          : `ROOMMATE ${idx + 1}`;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text(title, 55, currentY);
        currentY += 18;
        addRow('Full Name:', roommate.full_name, currentY); currentY += 16;
        addRow('Roll Number:', roommate.roll_number, currentY); currentY += 16;
        addRow('Email Address:', roommate.email, currentY); currentY += 16;
        addRow('Programme & Year:', `${roommate.programme} - Year ${roommate.year}`, currentY); currentY += 20;

        if (idx < allRoommates.length - 1) {
          doc.moveTo(55, currentY - 6).lineTo(doc.page.width - 55, currentY - 6).strokeColor('#f1f5f9').stroke();
        }
      });
    }

    // Official Verification Footer
    const footerTop = 720;
    doc.rect(40, footerTop, doc.page.width - 80, 60).fill('#f8fafc');
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica')
       .text(`This is an official computer-generated allocation certificate (Version ${version}).`, 40, footerTop + 14, { align: 'center' })
       .text('Certificate ID: HAS-' + Math.random().toString(36).substring(2, 10).toUpperCase(), 40, footerTop + 32, { align: 'center' });

    doc.end();

    writeStream.on('finish', () => {
      resolve({ filePath, fileName });
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  generateAllocationPDF
};
