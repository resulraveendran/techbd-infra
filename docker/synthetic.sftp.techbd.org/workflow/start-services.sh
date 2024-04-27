#!/bin/bash

# Kill any existing cron processes to avoid conflicts
pkill cron

# Remove any stale lock file that might be preventing cron from starting
rm -f /var/run/crond.pid

# start the crontab script
/bin/bash /create-crontab.sh

chmod 0644 /etc/cron.d/1115-hub
crontab /etc/cron.d/1115-hub

# Start the health check endpoint in the background
/bin/bash /health-check.sh &

# Start cron in the foreground
cron -f
