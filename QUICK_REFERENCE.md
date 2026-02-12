# 🚀 Quick Reference - AI Interview System v2.0

One-page reference for developers.

---

## 📦 Installation

```bash
# Clone and setup
git clone <repo-url>
cd AI-Interview-Screening-Evaluation

# Run setup script
chmod +x setup.sh
./setup.sh

# Or on Windows
setup.bat
```

---

## 🔧 Configuration

### .env File
```env
XAI_API_KEY=your_key_here
ADMIN_USER=admin
ADMIN_PASS=admin123
JWT_SECRET=your_secret_key
```

---

## 🚀 Running

### Backend
```bash
cd backend
source ../.venv/bin/activate  # Windows: ..\.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

---

## 🔌 Key API Endpoints

### Public
```bash
POST /generate_competencies      # Generate role competencies
POST /suggest_skills             # Get skill suggestions
POST /start_interview            # Create interview
POST /submit_answer              # Submit answer
POST /report_violation           # Report proctoring violation
```

### Admin (JWT Required)
```bash
POST /admin/login                # Get JWT token
GET  /admin/candidates           # List all candidates
GET  /admin/interview/{id}       # Get full report
GET  /admin/download_report/{id} # Download report
```

---

## 📊 Database Schema

### Tables
1. **candidates** - Basic info
2. **interviews** - Session data + metadata
3. **responses** - Q&A with scores
4. **violations** - Proctoring events
5. **competency_scores** - Competency performance
6. **skill_scores** - Skill performance

---

## 🧪 Quick Tests

### Test API
```bash
curl http://localhost:8000/
```

### Generate Competencies
```bash
curl -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer"}'
```

### Admin Login
```bash
curl -X POST http://localhost:8000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 🎯 Key Features

### STEP 1: Role → Competencies
- AI generates 3-7 competencies
- Positive + negative indicators
- Role-dependent count

### STEP 2: Skill Suggestions
- Real-time AI suggestions
- 5 technical + 5 functional required
- No duplicates

### STEP 3: Experience & Responsibilities
- Controls question count (5-25)
- Sets difficulty bounds
- Drives scenarios

### STEP 4: Adaptive Engine
- Dynamic difficulty adjustment
- Strong → +10, Weak → -10
- Bounded by experience

### STEP 5: Enhanced Proctoring
- Multiple violation types
- 3-level escalation
- Interview continues after FAIL

### STEP 6: Answer Evaluation
- Classifies: strong/partial/weak
- Scores: correctness, depth, relevance, confidence
- Feeds difficulty control

### STEP 7: Database Management
- All data persisted
- Candidates have NO access
- Admin-only viewing

### STEP 8: Admin Panel
- JWT authentication
- Full reporting
- Download capability

### STEP 9: Professional UI
- Multi-step registration
- Clean candidate interface
- Enterprise admin dashboard

---

## 🔒 Security

### Admin Access
```bash
# Default credentials (CHANGE IN PRODUCTION!)
Username: admin
Password: admin123
```

### JWT Token
- Expires in 24 hours
- Required for admin endpoints
- Include in header: `Authorization: Bearer <token>`

---

## 📁 Project Structure

```
backend/
├── main.py              # FastAPI app (14 endpoints)
├── config.py            # Configuration
└── utils/
    ├── ai_utils.py      # AI functions (12 functions)
    ├── db_ops.py        # Database ops (20+ functions)
    └── auth.py          # JWT authentication

frontend/
├── src/
│   ├── App.jsx          # Main app
│   └── components/      # React components
└── public/
    └── models/          # Face detection models
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check XAI_API_KEY in .env
- Verify Python 3.9+
- Check port 8000 is free

### Frontend won't start
- Verify Node.js 18+
- Run `npm install`
- Check port 5173 is free

### Database errors
- Delete `instance/interview.db`
- Restart backend (auto-creates)

### Camera not working
- Use HTTPS in production
- Grant browser permissions
- Use Chrome browser

### Admin login fails
- Check credentials in .env
- Verify JWT_SECRET is set

---

## 📚 Documentation

- **README.md** - Complete overview
- **API_DOCUMENTATION.md** - Full API reference
- **DEPLOYMENT_GUIDE.md** - Production deployment
- **TESTING_GUIDE.md** - Testing procedures
- **UPGRADE_SUMMARY.md** - What's new in v2.0

---

## 🔗 URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`

---

## 💡 Tips

1. **Always activate venv** before running backend
2. **Use Chrome** for best camera/voice support
3. **Change default credentials** in production
4. **Generate strong JWT_SECRET** for production
5. **Use PostgreSQL** instead of SQLite in production
6. **Set up Redis** for session management
7. **Enable HTTPS** for camera access
8. **Monitor logs** in `logs/` directory
9. **Backup database** regularly
10. **Test thoroughly** before deployment

---

## 🎯 Common Commands

```bash
# Backend
cd backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev

# Database
sqlite3 instance/interview.db
.tables
SELECT * FROM candidates;

# Tests
curl http://localhost:8000/
curl -X POST http://localhost:8000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Logs
tail -f logs/app.log

# Build frontend
cd frontend
npm run build
```

---

## 📞 Support

- Check API docs: `http://localhost:8000/docs`
- Review logs: `logs/app.log`
- Test with curl commands above
- Read documentation files

---

## ✅ Pre-Deployment Checklist

- [ ] Change ADMIN_USER and ADMIN_PASS
- [ ] Generate strong JWT_SECRET
- [ ] Configure CORS for specific origins
- [ ] Set up PostgreSQL
- [ ] Configure Redis
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test all features
- [ ] Load test

---

**Quick Reference Version**: 2.0.0  
**Last Updated**: 2026-02-04

---

## 🎉 You're Ready!

Start building amazing AI-powered interviews!
