module.exports = {
  apps: [
    {
      name: 'marketplace-api',
      script: './dist/server/index.js',
      instances: 'max', // Scale to all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Restart on crash or excessive memory usage
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ]
};
