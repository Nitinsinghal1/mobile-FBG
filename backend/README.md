# Four Worlds Battleground - Backend API

REST API for cloud-hosted leaderboards, user accounts, and game saves.

## Quick Start (Docker Compose)

```bash
cd backend
cp .env.example .env
docker-compose up
```

The API will be available at `http://localhost:5000`.

## Manual Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

### Database Migration

```bash
npm run migrate
```

### Start Development Server

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Profile
- `GET /api/profile/me` - Get user profile
- `GET /api/profile/progression` - Get progression history
- `POST /api/profile/progression` - Update progression

### Leaderboard
- `GET /api/leaderboard/global` - Global rankings
- `GET /api/leaderboard/regional/:region` - Regional rankings
- `GET /api/leaderboard/me` - Player's rank

### Game Saves
- `GET /api/saves` - List user's saves
- `POST /api/saves/save` - Save game state
- `GET /api/saves/load/:codename` - Load game state
- `DELETE /api/saves/:codename` - Delete save

### Chat
- `GET /api/chat/:room` - Get messages from room
- `POST /api/chat/:room` - Post message
- `DELETE /api/chat/:room/:messageId` - Delete message

## Project Structure

```
backend/
├── src/
│   ├── server.mjs              # Main Express app
│   ├── config/                 # Configuration (DB, Redis, env)
│   ├── middleware/             # Auth, error handling, logging
│   ├── routes/                 # API endpoints
│   ├── services/               # Business logic
│   ├── models/                 # Database schemas
│   └── utils/                  # Helpers (validation, crypto, logger)
├── tests/                      # Test suite
├── docker-compose.yml          # Local dev environment
├── Dockerfile                  # Container image
└── package.json
```

## Performance Notes

- **Caching**: Redis caches leaderboard queries (1 hour TTL)
- **Rate Limiting**: 5 login attempts per 15 minutes
- **Connection Pooling**: Max 20 concurrent database connections
- **Response Compression**: Gzip enabled
- **CORS**: Whitelist trusted domains only

## Deployment

### Docker Push

```bash
docker build -t fourbattleground/api:latest .
docker push fourbattleground/api:latest
```

### Kubernetes

See `k8s/` directory for Helm charts.

### Environment Variables (Production)

```bash
export NODE_ENV=production
export JWT_SECRET="generate-strong-random-key"
export JWT_REFRESH_SECRET="generate-another-strong-key"
export DB_PASSWORD="use-strong-password"
export REDIS_PASSWORD="use-strong-password"
export CORS_ORIGINS="https://fourbattleground.com"
```

## Monitoring

- **Health Check**: `GET /health`
- **Logs**: Structured JSON logs to stdout
- **Metrics**: Prometheus endpoint at `GET /metrics` (optional)

## Support

For issues or questions, open an issue on GitHub or contact the team.
