# Kryten-Playlist Installation & Startup Guide

This guide provides step-by-step instructions for installing, updating, and running both the API backend and web frontend components of the Kryten-Playlist system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Starting the Services](#starting-the-services)
- [Updating the System](#updating-the-system)
- [Troubleshooting](#troubleshooting)
- [Development Mode](#development-mode)

## Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: For cloning the repository
- **Poetry**: For Python dependency management

### Installing Poetry (Python Package Manager)

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to PATH (Linux/macOS)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
poetry --version
```

### Installing Node.js and npm

#### Windows
Download and install from [nodejs.org](https://nodejs.org/)

#### Linux/macOS
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/kryten-playlist.git
cd kryten-playlist
```

### 2. Backend (API) Setup

```bash
# Install Python dependencies
poetry install

# Create virtual environment
poetry shell
```

### 3. Frontend (Web App) Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Return to root directory
cd ..
```

## Configuration

### 1. Backend Configuration

Copy the example configuration file:

```bash
cp config.example.json config.json
```

Edit `config.json` with your settings:

```json
{
  "nats": {
    "servers": ["nats://localhost:4222"],
    "user": "your_nats_user",
    "password": "your_nats_password"
  },
  "channels": [
    {
      "name": "your_channel_name",
      "url": "https://your-channel-url.com"
    }
  ],
  "database": {
    "path": "data/catalog.db"
  },
  "auth": {
    "jwt_secret": "your_jwt_secret_key"
  }
}
```

### 2. Frontend Configuration

The frontend configuration is handled through environment variables and build settings. Default configuration should work for most cases.

## Starting the Services

### Method 1: Using Start Scripts (Recommended)

#### Windows (PowerShell)
```powershell
# Start both services
.\start-playlist.ps1

# Or start them separately:
# Start backend
Start-Process powershell -ArgumentList "poetry run kryten-playlist --config config.json"

# Start frontend (in a new terminal)
cd frontend
Start-Process powershell -ArgumentList "npm run dev"
```

#### Linux/macOS
```bash
# Start both services
./start-playlist.sh

# Or start them separately:
# Start backend
poetry run kryten-playlist --config config.json &

# Start frontend
cd frontend && npm run dev &
```

### Method 2: Manual Start

#### Backend (API Service)
```bash
# Activate Poetry environment
poetry shell

# Start the backend service
poetry run kryten-playlist --config config.json
```

The backend will start on the configured port (default: check your config.json).

#### Frontend (Web Application)
```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev

# For production build
npm run build
npm run preview
```

The frontend will be available at:
- Development: http://localhost:3002 (or next available port)
- Production: http://localhost:4173 (or configured port)

### Method 3: Using Screen/Tmux (For Persistent Sessions)

#### Using Screen
```bash
# Create backend session
screen -S kryten-backend
poetry run kryten-playlist --config config.json

# Detach: Ctrl+A, D

# Create frontend session
screen -S kryten-frontend
cd frontend && npm run dev
```

#### Using Tmux
```bash
# Create new session
tmux new-session -d -s kryten-playlist

# Split window
tmux split-window -v

# Start backend in top pane
tmux send-keys -t 0 "poetry run kryten-playlist --config config.json" C-m

# Start frontend in bottom pane
tmux send-keys -t 1 "cd frontend && npm run dev" C-m

# Attach to session
tmux attach-session -t kryten-playlist
```

## Updating the System

### 1. Update Backend

```bash
# Pull latest changes
git pull origin main

# Update Python dependencies
poetry update

# Restart backend service
# (Stop current process and restart using methods above)
```

### 2. Update Frontend

```bash
# Pull latest changes
git pull origin main

# Update Node.js dependencies
cd frontend
npm update

# Rebuild if necessary
npm run build

# Restart frontend service
# (Stop current process and restart using methods above)
```

### 3. Full System Update

```bash
# Stop all services
# (Use Ctrl+C in each terminal or kill processes)

# Update repository
git pull origin main

# Update backend
cd ..
poetry update

# Update frontend
cd frontend
npm update

# Restart services using your preferred method
```

## Development Mode

### Backend Development
```bash
# Install development dependencies
poetry install --with dev

# Run with debug logging
poetry run kryten-playlist --config config.json --debug

# Run tests
poetry run pytest

# Run with auto-reload (if supported)
poetry run kryten-playlist --config config.json --reload
```

### Frontend Development
```bash
cd frontend

# Start with hot reload
npm run dev

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Build for production
npm run build
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                # Linux/macOS

# Kill the process
taskkill /PID <PID> /F       # Windows
kill -9 <PID>                # Linux/macOS
```

#### 2. Poetry Not Found
```bash
# Add Poetry to PATH permanently
export PATH="$HOME/.local/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc
```

#### 3. Node Modules Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 4. Database Issues
```bash
# Reset database (backup first!)
rm data/catalog.db
# Restart service to recreate
```

#### 5. NATS Connection Issues
- Ensure NATS server is running
- Check configuration in config.json
- Verify network connectivity

### Log Files

Backend logs are typically output to console. Frontend logs can be viewed in:
- Browser Developer Console (F12)
- Terminal where npm run dev is running

### Getting Help

1. Check the logs for error messages
2. Verify all services are running
3. Ensure configuration is correct
4. Check network connectivity
5. Review this documentation

## Service URLs

After successful startup:

- **Frontend (Web UI)**: http://localhost:3002
- **Backend API**: Check your config.json for the configured port
- **API Documentation**: Usually available at http://localhost:PORT/docs (if enabled)

## Security Notes

- Change default passwords and secrets
- Use HTTPS in production
- Configure proper firewall rules
- Keep dependencies updated
- Use environment variables for sensitive data in production

## Performance Tips

- Use production builds for frontend (`npm run build`)
- Configure proper caching headers
- Use a reverse proxy (nginx/Apache) for production
- Monitor resource usage
- Consider using process managers (PM2, systemd) for production

---

For additional support, please refer to the project documentation or contact the development team.