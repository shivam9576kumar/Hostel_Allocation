const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateAllocationPDF({ hostelName, blockName, floorNumber, roomNumber, student1, student2, allocationDate, isSwap = false, version = 1 }) {
  const pdfsDir = path.join(__dirname, '../../pdfs');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  const rollA = student1.roll_number.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `allocation_${rollA}_v${version}.pdf`;
  const filePath = path.join(pdfsDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Decorative Header Banner
    doc.rect(0, 0, doc.page.width, 120).fill('#1e3a8a');
    doc.fillColor('#ffffff')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('INDIAN INSTITUTE OF TECHNOLOGY', 50, 35, { align: 'center' });
    doc.fontSize(16)
       .font('Helvetica')
       .text('Official Hostel Allocation Certificate', 50, 70, { align: 'center' });

    doc.moveDown(4);

    let boxTop = 140;

    // Optional Watermark Banner for Room Swaps
    if (isSwap) {
      doc.rect(40, 135, doc.page.width - 80, 35).fill('#fef3c7').strokeColor('#d97706').stroke();
      doc.fillColor('#92400e')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('** UPDATED ALLOCATION DUE TO ROOM SWAP **', 50, 147, { align: 'center' });
      boxTop = 185;
    }

    // Certificate Box Container
    doc.rect(40, boxTop, doc.page.width - 80, isSwap ? 525 : 560)
       .lineWidth(2)
       .strokeColor('#cbd5e1')
       .stroke();

    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold');
    doc.text(`ALLOCATION DETAILS (v${version})`, 60, boxTop + 20);

    doc.moveTo(60, boxTop + 40).lineTo(doc.page.width - 60, boxTop + 40).strokeColor('#e2e8f0').stroke();

    // Key-Value Grid Helper
    function addRow(label, value, y) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text(label, 60, y);
      doc.fontSize(11).font('Helvetica').fillColor('#0f172a').text(value, 200, y);
    }

    let currentY = boxTop + 55;
    addRow('Hostel Name:', hostelName, currentY); currentY += 25;
    addRow('Block Name:', blockName, currentY); currentY += 25;
    addRow('Floor Number:', `Floor ${floorNumber}`, currentY); currentY += 25;
    addRow('Room Number:', roomNumber, currentY); currentY += 25;
    addRow('Allocation Date:', new Date(allocationDate).toLocaleString(), currentY); currentY += 35;

    doc.moveTo(60, currentY).lineTo(doc.page.width - 60, currentY).strokeColor('#e2e8f0').stroke();
    currentY += 20;

    // Student 1 Details
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e3a8a').text('PRIMARY ALLOTTEE (STUDENT 1)', 60, currentY);
    currentY += 25;
    addRow('Full Name:', student1.full_name, currentY); currentY += 22;
    addRow('Roll Number:', student1.roll_number, currentY); currentY += 22;
    addRow('Email Address:', student1.email, currentY); currentY += 22;
    addRow('Programme & Year:', `${student1.programme} - Year ${student1.year}`, currentY); currentY += 30;

    doc.moveTo(60, currentY).lineTo(doc.page.width - 60, currentY).strokeColor('#e2e8f0').stroke();
    currentY += 20;

    // Student 2 Details
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e3a8a').text('ROOMMATE (STUDENT 2)', 60, currentY);
    currentY += 25;
    if (student2) {
      addRow('Full Name:', student2.full_name, currentY); currentY += 22;
      addRow('Roll Number:', student2.roll_number, currentY); currentY += 22;
      addRow('Email Address:', student2.email, currentY); currentY += 22;
      addRow('Programme & Year:', `${student2.programme} - Year ${student2.year}`, currentY); currentY += 30;
    } else {
      doc.fontSize(11).font('Helvetica-Oblique').fillColor('#94a3b8').text('Pending Pairing / Unassigned', 60, currentY);
      currentY += 30;
    }

    // Official Verification Footer
    doc.rect(40, 720, doc.page.width - 80, 70).fill('#f8fafc');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
       .text(`This is an official computer-generated allocation certificate (Version ${version}).`, 50, 735, { align: 'center' })
       .text('Certificate ID: HAS-' + Math.random().toString(36).substring(2, 10).toUpperCase(), 50, 755, { align: 'center' });

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
