# Scalability Architecture for Four Worlds Battleground

## Overview
Hybrid model: **Offline-first gameplay** + **Cloud services** for leaderboards, accounts, social features.

### Target Scale
- **Thousands of concurrent players**
- **Regional servers** (North America, Europe, Asia)
- **Eventual consistency** for leaderboards
- **Session-based authentication**

---

## System Architecture

```
┌─ Mobile/Web Client (PWA)
│  ├─ Local state (in-memory)
│  ├─ localStorage backups
│  ├─ IndexedDB cache
│  └─ Service Worker (offline)
│
├─ API Gateway (Load Balanced)
│  ├─ OAuth 2.0 / JWT auth
│  ├─ Rate limiting (per-user, per-IP)
│  ├─ Request validation
│  └─ Logging/monitoring
│
├─ Microservices
│  ├─ Auth Service (JWT issuer, session mgmt)
│  ├─ Leaderboard Service (async writes, Redis cache)
│  ├─ Profile Service (user accounts, progression)
│  ├─ Chat/Social Service (DMs, team channels)
│  └─ Analytics Service (event tracking)
│
├─ Data Layer
│  ├─ PostgreSQL (primary: users, profiles, progression)
│  ├─ Redis (cache: leaderboards, sessions, rate limits)
│  ├─ MongoDB (optional: chat logs, event history)
│  └─ S3 / Cloud Storage (save backups)
│
└─ Infrastructure
   ├─ Kubernetes (container orchestration)
   ├─ CDN (static assets, PWA)
   ├─ Monitoring (Prometheus, DataDog)
   └─ CI/CD (GitHub Actions, Docker)
```

---

## Phase 2 Deliverables

### 1. **Backend Structure** (Node.js + Express)
```
backend/
├── src/
│   ├── server.mjs              # Express app + middleware
│   ├── config/
│   │   ├── database.mjs        # PostgreSQL connection pool
│   │   ├── redis.mjs           # Redis client
│   │   └── env.mjs             # Environment variables
│   ├── middleware/
│   │   ├── auth.mjs            # JWT verification
│   │   ├── rateLimiter.mjs     # Rate limiting
│   │   └── errorHandler.mjs    # Global error handling
│   ├── routes/
│   │   ├── auth.mjs            # Login, signup, refresh tokens
│   │   ├── profile.mjs         # User profile, progression
│   │   ├── leaderboard.mjs     # Global rankings, seasonal
│   │   ├── saves.mjs           # Save/load game state
│   │   ├── chat.mjs            # Team/forum messages
│   │   └── admin.mjs           # Moderation, analytics
│   ├── services/
│   │   ├── authService.mjs     # JWT, password hashing
│   │   ├── leaderboardService.mjs  # Score calculation
│   │   ├── profileService.mjs      # User progression
│   │   ├── saveService.mjs         # State persistence
│   │   └── chatService.mjs         # Message relay
│   ├── models/
│   │   ├── User.mjs            # Schema: id, email, username
│   │   ├── Profile.mjs         # Schema: codename, power, mode
│   │   ├── Progression.mjs     # Schema: worlds, score, stats
│   │   ├── LeaderboardEntry.mjs # Schema: rank, score, date
│   │   └── ChatMessage.mjs     # Schema: sender, room, text
│   └── utils/
│       ├── logger.mjs          # Structured logging
│       ├── validators.mjs      # Input validation
│       └── crypto.mjs          # Seeded hashing for reproducibility
├── tests/
│   ├── auth.test.mjs
│   ├── leaderboard.test.mjs
│   └── profile.test.mjs
└── package.json
```

### 2. **Database Schema** (PostgreSQL)
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  codename VARCHAR(32) NOT NULL,
  power_id VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  instinct VARCHAR(32),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, codename)
);

-- Progression table
CREATE TABLE progression (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  world_id VARCHAR(32),
  worlds_conquered INT DEFAULT 0,
  damage_done INT DEFAULT 0,
  monsters_defeated INT DEFAULT 0,
  deaths INT DEFAULT 0,
  leaderboard_score INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard table (denormalized for fast queries)
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY,
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  username VARCHAR(64),
  score INT NOT NULL,
  worlds_conquered INT,
  rank_global INT,
  rank_region VARCHAR(32),
  season INT DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_score_season (score DESC, season),
  INDEX idx_region_score (rank_region, score DESC)
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  room VARCHAR(64) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_room_time (room, created_at DESC)
);

-- Sessions table (for token invalidation)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_expires (user_id, expires_at)
);
```

### 3. **API Endpoints**

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auth/signup` | POST | None | Register new account |
| `/auth/login` | POST | None | Login, get JWT |
| `/auth/refresh` | POST | JWT | Refresh access token |
| `/auth/logout` | POST | JWT | Invalidate session |
| `/profile` | GET | JWT | Get user profile |
| `/profile/progression` | GET | JWT | Get world progress |
| `/profile/save` | POST | JWT | Upload save state |
| `/profile/load` | GET | JWT | Download save state |
| `/leaderboard/global` | GET | None | Global top-100 |
| `/leaderboard/regional` | GET | None | Regional top-100 |
| `/leaderboard/me` | GET | JWT | Player's rank |
| `/chat/team` | GET/POST | JWT | Team messages |
| `/chat/forum` | GET/POST | JWT | Global forum |

### 4. **Authentication Flow**

```
Client                              Backend
  │
  ├─ POST /auth/signup
  │   { email, username, password } ──→ Hash password, create user
  │                                      ← JWT + refresh token
  │
  ├─ POST /auth/login
  │   { email, password }           ──→ Verify, create session
  │                                      ← JWT + refresh token
  │
  ├─ POST /profile/save
  │   { authorization: JWT,
  │     gameState }                 ──→ Verify JWT, save to DB
  │                                      ← { ok: true }
  │
  └─ POST /auth/refresh
      { refreshToken }              ──→ Validate, issue new JWT
                                         ← New JWT (15min TTL)
```

### 5. **Caching Strategy** (Redis)

```
Key Pattern                    TTL        Purpose
────────────────────────────────────────────────
leaderboard:global:1          1 hour     Top-100 global
leaderboard:region:us:1       30 min     Region-specific
session:{userId}:{tokenId}    15 min     Active sessions
user:{userId}:profile         5 min      Profile cache
rate_limit:{userId}:{endpoint} 1 min     Rate limit counters
chat:room:{roomId}            24 hours   Recent messages
```

### 6. **Rate Limiting Policy**

```
Endpoint                  Limit           Window
────────────────────────────────────────────────
POST /auth/login          5 attempts      15 minutes
POST /profile/save        60 requests     1 hour
GET /leaderboard/*        100 requests    1 hour
POST /chat/*              200 messages    1 day
```

---

## Migration Path

### Week 1: Infrastructure Setup
- [ ] Set up PostgreSQL + Redis instances
- [ ] Create Docker images
- [ ] Deploy API gateway (load balancer)
- [ ] Set up monitoring/logging

### Week 2: Core Services
- [ ] Auth service (signup, login, JWT)
- [ ] Profile service (create, get, update)
- [ ] Save/load endpoints (cloud backup)

### Week 3: Social Features
- [ ] Leaderboard service (scoring, ranking)
- [ ] Chat service (async messaging)
- [ ] Regional rankings

### Week 4: Launch & Scale
- [ ] Load testing (1K concurrent users)
- [ ] Gradual rollout (canary deployment)
- [ ] Monitoring & alerting setup

---

## Backward Compatibility

Current offline-first gameplay continues unchanged:
1. Game runs fully offline with localStorage
2. Optional server sync (one-way save backup)
3. Leaderboards populated server-side
4. No changes to Phaser/combat systems

---

## Security Considerations

- **Passwords**: bcrypt with salt rounds = 12
- **JWT**: HS256 signature, 15-minute expiry
- **Refresh tokens**: Stored in DB, single-use
- **Rate limiting**: Per-user + per-IP
- **Input validation**: Strict schema validation
- **CORS**: Whitelist trusted domains only
- **HTTPS**: TLS 1.3+ required
- **Save validation**: Checksum verification (prevent hacking)

---

## Monitoring & Observability

**Metrics to track:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Active user sessions
- Leaderboard update latency
- Database query performance

**Dashboards:**
- Real-time request volume
- Error distribution
- User signup/login trends
- Leaderboard freshness

---

## Cost Estimation (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| PostgreSQL (managed) | $200 | 2-4 vCPU, HA |
| Redis (managed) | $80 | 2GB cache |
| Kubernetes cluster | $300 | 3 nodes, auto-scale |
| CDN / Static assets | $50 | CloudFlare or AWS CloudFront |
| Monitoring / Logging | $100 | DataDog or New Relic |
| **Total** | **~$730** | For 1K-5K CCU |

---

## Next Steps

1. ✅ Finalize database schema
2. ✅ Create Docker Compose for local dev
3. ✅ Implement auth service
4. ✅ Implement profile/save service
5. ✅ Set up leaderboard service
6. ✅ Load test with simulated players
7. ✅ Deploy to staging environment
