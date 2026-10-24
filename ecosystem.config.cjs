module.exports = {
  apps: [
    {
      name: 'marketplace-api',
      script: './dist/server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      wait_ready: true,
      listen_timeout: 10000,
    }
  ]
};
