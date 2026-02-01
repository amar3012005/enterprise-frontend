#!/bin/bash

echo "🔍 Checking MongoDB installation..."

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB not found. Installing MongoDB..."
    sudo apt update
    sudo apt install -y mongodb
fi

echo "🚀 Starting MongoDB service..."
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Wait for MongoDB to start
echo "⏳ Waiting for MongoDB to start..."
sleep 5

# Check if MongoDB is running
if pgrep mongod > /dev/null; then
    echo "✅ MongoDB is running"
    echo "🚀 Starting Node.js application..."
    npm start
else
    echo "❌ Failed to start MongoDB"
    echo "Please run these commands manually:"
    echo "1. sudo systemctl start mongodb"
    echo "2. sudo systemctl status mongodb"
    exit 1
fi
