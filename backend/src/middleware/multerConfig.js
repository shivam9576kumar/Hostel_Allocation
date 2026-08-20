const multer = require('multer');
const xlsx = require('xlsx');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload CSV or XLSX.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.CSV_MAX_FILE_SIZE || '5242880', 10), // 5MB
    files: 1
  },
  fileFilter
});

const parseExcel = (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const workbook = xlsx.read(req.file.buffer, {
      type: 'buffer',
      cellDates: false,
      raw: true
    });
    req.workbook = workbook;
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse uploaded file.' });
  }
};

module.exports = { upload, parseExcel };
