#!/bin/bash

echo "🔍 Checking MongoDB status..."

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "🚀 Starting MongoDB..."
    sudo systemctl start mongodb
    sleep 5  # Give MongoDB time to start
fi

# Verify MongoDB is running
if sudo systemctl is-active --quiet mongodb; then
    echo "✅ MongoDB is running"
else
    echo "❌ Failed to start MongoDB"
    echo "Try running: sudo systemctl start mongodb"
    exit 1
fi

echo "🚀 Starting Node.js application..."
npm start
