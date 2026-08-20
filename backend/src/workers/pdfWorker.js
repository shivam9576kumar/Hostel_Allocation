// backend/src/workers/pdfWorker.js

const pdfQueue = require('../queues/pdfQueue');
const failedPdfQueue = require('../queues/failedPdfQueue');
const { Student, Room, Floor, Block, Hostel, PDFHistory } = require('../models');
const { generateAllocationPDF } = require('../utils/pdfGenerator');

console.log('🚀 PDF Worker is running and listening for jobs (DLQ Enabled)...');

pdfQueue.process('generate', 5, async (job) => {
  console.log(`📄 Processing job ${job.id} for room ${job.data.roomId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3})...`);

  try {
    const { roomId, occupantRolls, allocationDate } = job.data;

    // 1. Fetch room and associated hierarchy
    const room = await Room.findByPk(roomId, {
      include: [
        {
          model: Floor,
          include: [
            {
              model: Block,
              include: [Hostel],
            },
          ],
        },
      ],
    });

    if (!room) {
      throw new Error(`Room ID ${roomId} not found in database.`);
    }

    const floor = room.Floor;
    const block = floor.Block;
    const hostel = block.Hostel;

    // 2. Fetch all occupants
    const occupants = await Student.findAll({
      where: { roll_number: occupantRolls },
      order: [['created_at', 'ASC']],
    });

    if (!occupants || occupants.length === 0) {
      throw new Error(`No occupants found for room ID ${roomId} with rolls: ${occupantRolls.join(', ')}`);
    }

    // 3. Calculate PDF Version (increment latest version for these students)
    const existingHistories = await PDFHistory.findAll({
      where: { student_roll: occupantRolls },
      order: [['version', 'DESC']],
    });

    const maxVersion = existingHistories.length > 0 ? existingHistories[0].version : 0;
    const newVersion = maxVersion + 1;

    // 4. Assign primary student & roommates
    const student1 = occupants[0] || null;
    const student2 = occupants[1] || null;
    const student3 = occupants[2] || null;

    // 5. Generate the PDF Certificate
    const { filePath } = await generateAllocationPDF({
      hostelName: hostel.name,
      blockName: block.name,
      floorNumber: floor.floor_number,
      roomNumber: room.room_number,
      student1,
      student2,
      student3,
      allocationDate: allocationDate || new Date(),
      isSwap: false,
      version: newVersion,
    });

    // 6. Deactivate old PDFHistory entries and save new active version
    await PDFHistory.update(
      { is_current: false },
      { where: { student_roll: occupantRolls } }
    );

    const pdfHistoryEntries = occupants.map((student) => ({
      student_roll: student.roll_number,
      room_id: room.room_id,
      pdf_path: filePath,
      version: newVersion,
      is_swap: false,
      is_current: true,
    }));

    await PDFHistory.bulkCreate(pdfHistoryEntries);

    console.log(`✅ Job ${job.id} completed. Version ${newVersion} PDF saved at ${filePath}`);
    return { success: true, filePath, version: newVersion };
  } catch (error) {
    console.error(`❌ Job ${job.id} failed (Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3}):`, error.message);

    const maxAttempts = job.opts.attempts || 3;
    if (job.attemptsMade + 1 >= maxAttempts) {
      console.log(`📦 Moving job ${job.id} for room ${job.data?.roomId} to Dead Letter Queue (DLQ)...`);
      try {
        await failedPdfQueue.add('failed-generate', {
          originalJobId: job.id,
          data: job.data,
          failedReason: error.message,
          failedAt: new Date(),
        }, {
          attempts: 1,
          removeOnComplete: true,
        });
      } catch (dlqErr) {
        console.error('[DLQ Error]: Failed to push to Dead Letter Queue:', dlqErr.message);
      }
    }

    throw error;
  }
});

pdfQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed successfully (Result: ${result?.filePath || 'done'}).`);
});

pdfQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job ? job.id : 'unknown'} failed after ${job ? job.attemptsMade : 0} attempts:`, err.message);
});

pdfQueue.on('error', (err) => {
  console.error('❌ Worker connection error:', err.message);
});

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  console.log(`🛑 Received ${signal}. Closing PDF worker gracefully...`);
  try {
    await pdfQueue.close();
    console.log('✅ PDF worker closed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing PDF worker:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = pdfQueue;
