#!/bin/bash
# Path to the health status file
health_status_file="/doctor_log.txt"

# Simple HTTP server loop
while true; do
    if [ -f "$health_status_file" ]; then
        health_status_content=$(<"$health_status_file")
        content_length=${#health_status_content}
        echo -e "HTTP/1.1 200 OK\nContent-Length: $content_length\nConnection: close\n\n$health_status_content" | nc -l -p 8082 -N
    fi
    sleep 1
done
