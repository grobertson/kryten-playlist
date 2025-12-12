"# Kryten Playlist

Kryten playlist management service - handles video queue and playlist operations for CyTube.

## Features

- Real-time playlist management
- Video queue operations
- Event-driven architecture using NATS
- Playlist synchronization

## Installation

### Prerequisites

- Python 3.10 or higher
- Poetry
- NATS server running
- kryten-py library

### Setup

1. Install dependencies:
```bash
poetry install
```

2. Copy the example configuration:
```bash
cp config.example.json config.json
```

3. Edit `config.json` with your settings:
```json
{
  "nats_url": "nats://localhost:4222",
  "nats_subject_prefix": "kryten",
  "service_name": "playlist"
}
```

## Usage

### Running the Service

Using Poetry:
```bash
poetry run kryten-playlist --config config.json
```

Using the startup script (PowerShell):
```powershell
.\start-playlist.ps1
```

Using the startup script (Bash):
```bash
./start-playlist.sh
```

### Command Line Options

- `--config PATH`: Path to configuration file (default: `/etc/kryten/playlist/config.json`)
- `--log-level LEVEL`: Set logging level (DEBUG, INFO, WARNING, ERROR)

## Event Handling

The service currently listens for:

- **queue**: Video queue events
- **delete**: Video deletion events
- **moveVideo**: Video position changes
- **setTemp**: Temporary video status changes

## Development

### Running Tests

```bash
poetry run pytest
```

### Linting

```bash
poetry run ruff check .
```

### Formatting

```bash
poetry run black .
```

## License

MIT License - see LICENSE file for details
" 
