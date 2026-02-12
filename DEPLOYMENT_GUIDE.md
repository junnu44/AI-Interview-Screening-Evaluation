# 🚀 Deployment Guide - AI Interview System v2.0

This guide covers deploying the AI Interview System to production.

## 📋 Pre-Deployment Checklist

### Security

- [ ] Change default admin credentials
- [ ] Generate strong JWT secret key
- [ ] Configure CORS for specific origins only
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Review and update all environment variables

### Infrastructure

- [ ] Set up production database (PostgreSQL recommended)
- [ ] Configure Redis for session management
- [ ] Set up backup strategy
- [ ] Configure monitoring and logging
- [ ] Set up CDN for static assets
- [ ] Configure load balancer (if needed)

### Testing

- [ ] Test all API endpoints
- [ ] Test admin authentication
- [ ] Test camera proctoring
- [ ] Test adaptive difficulty
- [ ] Test report generation
- [ ] Load testing

---

## 🔧 Environment Configuration

### Production .env File

```env
# API Configuration
XAI_API_KEY=your_production_xai_api_key
XAI_MODEL=grok-2-latest

# Admin Credentials (CHANGE THESE!)
ADMIN_USER=your_admin_username
ADMIN_PASS=your_strong_password_here

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=your_very_strong_random_secret_key_here_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:password@localhost:5432/interview_db

# Redis (for session management)
REDIS_URL=redis://localhost:6379/0

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Application
DEBUG=False
LOG_LEVEL=INFO
```

### Generating Secure JWT Secret

```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# OpenSSL
openssl rand -base64 32
```

---

## 🗄️ Database Migration

### From SQLite to PostgreSQL

1. **Install PostgreSQL**

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
```

2. **Create Database**

```sql
CREATE DATABASE interview_db;
CREATE USER interview_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE interview_db TO interview_user;
```

3. **Update Backend Configuration**

```python
# backend/config.py
import os
from sqlalchemy import create_engine

class Config:
    # Use PostgreSQL in production
    if os.getenv("DATABASE_URL"):
        DATABASE = os.getenv("DATABASE_URL")
    else:
        # Fallback to SQLite for development
        DATABASE = os.path.join(PARENT_DIR, "instance", "interview.db")
```

4. **Migrate Data** (if needed)

```bash
# Export from SQLite
sqlite3 instance/interview.db .dump > backup.sql

# Import to PostgreSQL (after adapting SQL syntax)
psql -U interview_user -d interview_db -f backup.sql
```

---

## 🐳 Docker Deployment

### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Build application
COPY frontend/ .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: interview_db
      POSTGRES_USER: interview_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - XAI_API_KEY=${XAI_API_KEY}
      - DATABASE_URL=postgresql://interview_user:${DB_PASSWORD}@postgres:5432/interview_db
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USER=${ADMIN_USER}
      - ADMIN_PASS=${ADMIN_PASS}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. EC2 Setup

```bash
# Launch EC2 instance (Ubuntu 22.04)
# Security Group: Allow ports 22, 80, 443, 8000

# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone your-repo-url
cd AI-Interview-Screening-Evaluation

# Set up environment
cp .env.example .env
nano .env  # Edit with production values

# Deploy
docker-compose up -d
```

#### 2. RDS for Database

```bash
# Create RDS PostgreSQL instance
# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@your-rds-endpoint:5432/interview_db
```

#### 3. ElastiCache for Redis

```bash
# Create ElastiCache Redis cluster
# Update REDIS_URL in .env
REDIS_URL=redis://your-elasticache-endpoint:6379/0
```

#### 4. S3 for File Storage (Optional)

```bash
# Create S3 bucket for resume uploads
# Configure IAM role with S3 access
```

### Heroku Deployment

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set XAI_API_KEY=your_key
heroku config:set JWT_SECRET=your_secret
heroku config:set ADMIN_USER=admin
heroku config:set ADMIN_PASS=your_password

# Deploy
git push heroku main

# Open app
heroku open
```

### DigitalOcean Deployment

```bash
# Create Droplet (Ubuntu 22.04)
# Follow EC2 setup steps above

# Or use App Platform
# Connect GitHub repository
# Configure environment variables
# Deploy automatically
```

---

## 🔒 SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/interview-frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📊 Monitoring & Logging

### Application Monitoring

```python
# backend/main.py
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
handler = RotatingFileHandler('logs/app.log', maxBytes=10000000, backupCount=5)
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)

logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "database": "connected",
        "redis": "connected"
    }
```

### Monitoring Tools

- **Prometheus + Grafana**: Metrics and dashboards
- **Sentry**: Error tracking
- **CloudWatch**: AWS monitoring
- **Datadog**: Full-stack monitoring

---

## 🔄 Backup Strategy

### Database Backups

```bash
# Automated PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="interview_db_$DATE.sql"

pg_dump -U interview_user interview_db > $BACKUP_DIR/$FILENAME
gzip $BACKUP_DIR/$FILENAME

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Cron Job

```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

---

## 🧪 Load Testing

### Using Apache Bench

```bash
# Test API endpoint
ab -n 1000 -c 10 http://localhost:8000/

# Test with POST data
ab -n 100 -c 10 -p data.json -T application/json http://localhost:8000/generate_competencies
```

### Using Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class InterviewUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def generate_competencies(self):
        self.client.post("/generate_competencies", json={"role": "Software Engineer"})
    
    @task
    def suggest_skills(self):
        self.client.post("/suggest_skills", json={
            "role": "Software Engineer",
            "skill_type": "technical",
            "partial_input": "python"
        })
```

```bash
# Run load test
locust -f locustfile.py --host=http://localhost:8000
```

---

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL
   - Verify database is running
   - Check firewall rules

2. **JWT Authentication Fails**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure consistent secret across instances

3. **Camera Not Working**
   - Ensure HTTPS is enabled
   - Check browser permissions
   - Verify face-api.js models are loaded

4. **High Memory Usage**
   - Implement Redis for sessions
   - Optimize database queries
   - Add caching layer

---

## 📈 Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml with multiple backend instances
services:
  backend:
    deploy:
      replicas: 3
    # ... rest of config

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - backend
```

### Load Balancer Configuration

```nginx
upstream backend {
    least_conn;
    server backend_1:8000;
    server backend_2:8000;
    server backend_3:8000;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

---

## ✅ Post-Deployment Verification

```bash
# 1. Check API health
curl https://yourdomain.com/api/health

# 2. Test competency generation
curl -X POST https://yourdomain.com/api/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer"}'

# 3. Test admin login
curl -X POST https://yourdomain.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 4. Check database connection
docker-compose exec backend python -c "from utils.db_ops import init_db; from config import Config; init_db(Config.DATABASE)"

# 5. Monitor logs
docker-compose logs -f backend
```

---

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Test database connectivity
4. Review Nginx configuration
5. Check firewall rules

---

**Deployment Guide Version**: 2.0.0  
**Last Updated**: 2026-02-04
