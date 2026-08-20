module.exports = {
  apps: [
    {
      name: 'hostel-backend',
      script: 'backend/src/app.js',
      instances: 'max',           // Uses ALL CPU cores
      exec_mode: 'cluster',       // Load balancing
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/hostel/backend-error.log',
      out_file: '/var/log/hostel/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'pdf-worker',
      script: 'backend/src/workers/pdfWorker.js',
      instances: 2,               // 2 dedicated workers
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/hostel/pdf-worker-error.log',
      out_file: '/var/log/hostel/pdf-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
