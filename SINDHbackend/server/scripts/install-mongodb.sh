#!/bin/bash

echo "🔄 Installing MongoDB..."

# Import MongoDB public GPG key
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg \
   --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package list
echo "🔄 Updating package list..."
sudo apt-get update

# Install MongoDB
echo "📦 Installing MongoDB packages..."
sudo apt-get install -y mongodb-org

# Start MongoDB
echo "🚀 Starting MongoDB service..."
sudo systemctl start mongod

# Enable MongoDB to start on boot
echo "✨ Enabling MongoDB service..."
sudo systemctl enable mongod

# Check MongoDB status
echo "🔍 Checking MongoDB status..."
sudo systemctl status mongod

echo "✅ MongoDB installation complete!"
echo "To verify installation, run: mongod --version"
