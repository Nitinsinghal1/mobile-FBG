# Deployment & Launch Guide

Complete guide to deploying Four Worlds Battleground for 1000+ concurrent users.

## Environment Setup

### 1. DNS & CDN

```
Domain: fourbattleground.com
├─ A record: points to API Gateway
├─ CNAME: cdn.fourbattleground.com → CloudFlare/Akamai
└─ Let's Encrypt SSL certificate
```

### 2. Infrastructure (AWS / Google Cloud / Azure)

```
┌─ Load Balancer (Application Load Balancer)
│  ├─ HTTP → HTTPS redirect
│  ├─ SSL/TLS termination
│  └─ Rate limiting (100 req/sec per IP)
│
├─ API Cluster (Kubernetes)
│  ├─ 3-5 API pods (auto-scale 1-10)
│  ├─ Node.js Express instances
│  └─ Memory: 512MB, CPU: 0.5 cores per pod
│
├─ Database (PostgreSQL)
│  ├─ Master-Replica setup
│  ├─ 2 vCPU, 4 GB RAM
│  ├─ 50 GB storage (grows ~1MB per 1000 players)
│  └─ Automated backups (daily)
│
├─ Cache (Redis)
│  ├─ 2 GB RAM
│  ├─ Single instance with persistence
│  └─ RDB snapshots every 1 hour
│
├─ Static Assets (CDN)
│  ├─ S3 / Cloud Storage bucket
│  ├─ CloudFlare / CloudFront distribution
│  └─ Cache TTL: 1 year for versioned assets
│
└─ Monitoring
   ├─ Prometheus + Grafana
   ├─ DataDog or New Relic APM
   └─ ELK stack for centralized logging
```

### Cost Estimation (1K concurrent users)

| Component | Cost/Month |
|-----------|-----------|
| Load Balancer | $50 |
| Kubernetes (3 nodes) | $300 |
| PostgreSQL (managed) | $200 |
| Redis (managed) | $80 |
| CDN | $100 |
| Monitoring | $100 |
| Storage (S3) | $50 |
| **Total** | **~$880/month** |

## Deployment Steps

### Phase 1: Infrastructure Setup (Day 1-2)

```bash
# Create cluster
terraform apply  # See terraform/ directory

# Create databases
psql -h db.fourbattleground.com -U postgres
psql< backend/src/scripts/init.sql

# Setup Redis
redis-cli -h cache.fourbattleground.com PING

# Upload static assets
aws s3 sync . s3://fourbattleground-assets --cache-control "max-age=31536000"
```

### Phase 2: Backend Deployment (Day 3-4)

```bash
# Build Docker image
docker build -t fourbattleground/api:1.0.0 backend/
docker push fourbattleground/api:1.0.0 gcr.io/fourbattleground/api:1.0.0

# Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml  # (contains DB/Redis passwords)
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Verify
kubectl get pods -n fourbattleground
kubectl logs -n fourbattleground deployment/api
```

### Phase 3: Frontend Deployment (Day 5)

```bash
# Build PWA static files
npm run check  # Syntax validation

# Deploy to CDN
gsutil -m rsync -r . gs://fourbattleground-assets

# Verify PWA
curl -I https://fourbattleground.com/manifest.webmanifest
```

### Phase 4: Load Testing (Day 6-7)

```bash
# Install load testing tool
npm install -g artillery

# Create load test config (load-test.yml)
artillery run load-test.yml

# Monitor in real-time
kubectl top pods -n fourbattleground
kubectl top nodes
```

## Pre-Launch Checklist

### Security
- [ ] SSL certificate valid and auto-renewal configured
- [ ] Database encrypted at rest
- [ ] API rate limiting enabled (5 req/sec per IP)
- [ ] CORS whitelist configured
- [ ] HTTPS only (no HTTP fallback)
- [ ] JWT secrets rotated and stored in secrets manager
- [ ] Database backups encrypted

### Performance
- [ ] CDN assets cached with long TTL
- [ ] Gzip compression enabled
- [ ] Redis leaderboard cache working
- [ ] Database connection pooling configured
- [ ] API response time < 200ms p95
- [ ] Static assets < 2MB total

### Reliability
- [ ] Health check endpoint responding
- [ ] Graceful shutdown implemented
- [ ] Database replicas synced
- [ ] Backup restore tested
- [ ] Monitoring dashboards created
- [ ] Alert thresholds set

### Compliance
- [ ] Privacy policy published
- [ ] Terms of Service published
- [ ] GDPR compliance (data export, deletion)
- [ ] Age restrictions (13+)

## Monitoring & Observability

### Key Metrics to Track

```
API Performance:
├─ Request rate (req/sec)
├─ Error rate (% 5xx)
├─ Latency (p50, p95, p99)
└─ Upstream time

Database:
├─ Query time (avg, max)
├─ Connection count
├─ Slow query log
└─ Replication lag

User Experience:
├─ DAU (daily active users)
├─ Session duration
├─ Churn rate
└─ Crash rate

Business:
├─ New signups
├─ Leaderboard participation
├─ Chat messages/day
└─ Save frequency
```

### Alerting Rules

```
CRITICAL:
  - API error rate > 5%
  - API latency p99 > 1000ms
  - Database connections > 90%
  - Cache hit rate < 50%

WARNING:
  - API error rate > 1%
  - API latency p95 > 500ms
  - Database CPU > 80%
  - Memory usage > 80%
```

## Post-Launch Operations

### Day 1-7: Close Monitoring

```bash
# Monitor every 30 minutes
kubectl logs -n fourbattleground -f deployment/api

# Check metrics dashboard
open https://grafana.fourbattleground.com

# Review user feedback channels
# - GitHub Issues
# - Discord/Community
# - In-game feedback form
```

### Week 1-2: Stability Phase

```bash
# Gradual rollout: canary deployment (10% → 50% → 100%)
kubectl set image deployment/api \
  api=gcr.io/fourbattleground/api:1.0.1 \
  --record

# Watch for issues
kubectl rollout status deployment/api

# If problems: rollback
kubectl rollout undo deployment/api
```

### Ongoing: Maintenance Schedule

```
Daily:
  - Review error logs
  - Monitor user count
  - Check database replication lag

Weekly:
  - Analyze performance metrics
  - Review security logs
  - Plan upcoming features

Monthly:
  - Security audit
  - Cost review
  - Scale assessment (need more nodes?)
  - Database vacuum & analyze
```

## Scaling Strategy

### As Users Grow

**1K → 5K users**
- Add 1-2 more API pods
- Increase Redis to 4GB
- No database changes yet

**5K → 10K users**
- Add dedicated read replicas for leaderboard queries
- Partition chat messages by date
- Implement message archiving

**10K → 50K users**
- Add dedicated leaderboard service
- Multi-region deployment (US, EU, Asia)
- Session store in Redis (instead of database)

**50K+ users**
- Full microservices architecture
- Message queue (RabbitMQ) for async tasks
- Event streaming (Kafka) for analytics
- CQRS pattern for leaderboard

## Disaster Recovery

### Backup Strategy

```
Real-time:
  - Database: Continuous replication to standby
  - Redis: RDB snapshot every 1 hour

Daily:
  - Full database backup to S3
  - User data export for compliance

On-demand:
  - Point-in-time restore from backups
  - Cross-region backup replication
```

### Recovery Time Objectives (RTO)

| Service | RTO | RPO |
|---------|-----|-----|
| API | 5 min | N/A (stateless) |
| Database | 15 min | 1 hour |
| Redis | 30 min | 1 hour |
| CDN | N/A | N/A (cached) |

### Failover Procedures

```bash
# Database failover (manual)
kubectl exec -n fourbattleground postgres-standby -- \
  pg_ctl promote -D /var/lib/postgresql/data

# API manual scale-up
kubectl scale deployment/api --replicas=10 -n fourbattleground

# Force CDN cache clear
gcloud compute url-maps invalidate-cdn-cache api-cache \
  --path "/*"
```

## Update & Patch Management

### Zero-Downtime Deployments

```bash
# Rolling update (new pods → kill old pods)
kubectl set image deployment/api \
  api=gcr.io/fourbattleground/api:1.0.1 \
  --record

# Canary deployment (10% traffic to new version)
kubectl patch service api -p '{"spec":{"selector":{"version":"1.0.1"}}}'

# Blue-green deployment
kubectl create deployment api-green --image=gcr.io/fourbattleground/api:1.0.1
kubectl set service api selector=version=green  # Switch traffic
kubectl delete deployment api-blue
```

### Database Migrations

```bash
# Zero-downtime schema changes
# 1. Add new column with default
ALTER TABLE users ADD COLUMN new_field VARCHAR(255) DEFAULT '';

# 2. Backfill data (in background)
UPDATE users SET new_field = 'value' WHERE new_field = '';

# 3. Remove old column in future release
ALTER TABLE users DROP COLUMN old_field;
```

## Support & Communication

### Communication Channels

- **Status Page**: https://status.fourbattleground.com
- **Discord Community**: https://discord.gg/fourbattleground
- **Email Support**: support@fourbattleground.com
- **GitHub Issues**: https://github.com/fourbattleground/game/issues

### Incident Response

```
1. Detect issue (monitoring alert or user report)
2. Severity assessment (critical/high/medium/low)
3. Incident commander assigned
4. Root cause analysis
5. Fix deployed & verified
6. Postmortem within 24 hours
7. Communicate updates to users
```

## Summary

With this deployment guide, you can:

✅ Launch for 1000+ concurrent users
✅ Scale to 50K+ players
✅ Maintain 99.9% uptime
✅ Handle player growth
✅ Respond to emergencies
✅ Comply with data regulations

**Estimated Time:**
- Setup: 2 weeks
- Launch: 1 week
- Stable operations: Ongoing

**Contact for support:** devops@fourbattleground.com
