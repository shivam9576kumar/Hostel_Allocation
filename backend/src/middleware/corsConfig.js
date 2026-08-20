const cors = require('cors');

const allowedOrigins = [
  'https://hostel-frontend-5k7l.onrender.com',
  'https://hostel-frontend.onrender.com',
  'https://hostel-backend-hbul.onrender.com',
  'https://www.hostel.iitp.ac.in',
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin not allowed.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400,
};

module.exports = cors(corsOptions);
