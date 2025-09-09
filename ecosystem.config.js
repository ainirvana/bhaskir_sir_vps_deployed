module.exports = {
  apps: [
    {
      name: 'educational-platform',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/educational-platform',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/educational-platform/error.log',
      out_file: '/var/log/educational-platform/out.log',
      log_file: '/var/log/educational-platform/combined.log',
      time: true
    },
    {
      name: 'scraper-service',
      script: '/var/www/educational-platform/venv/bin/python',
      args: '/var/www/educational-platform/production_scrapers/scraper_service.py',
      cwd: '/var/www/educational-platform',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        PYTHONPATH: '/var/www/educational-platform'
      },
      error_file: '/var/log/educational-platform/scraper-error.log',
      out_file: '/var/log/educational-platform/scraper-out.log',
      log_file: '/var/log/educational-platform/scraper-combined.log',
      time: true
    }
  ]
};
