# 🤖 AI Interview Screening & Evaluation System v2.0

A production-ready AI-powered interview platform with **adaptive questioning**, **role-based competencies**, **camera proctoring**, and **comprehensive admin panel**.

## 🆕 What's New in v2.0

### ✨ Major Enhancements

1. **Role → Competencies Generation (STEP 1)**
   - AI automatically generates 3-7 competencies based on role complexity
   - Each competency includes positive and negative behavioral indicators
   - Competencies drive interview question generation

2. **AI-Powered Skill Suggestions (STEP 2)**
   - Real-time skill suggestions while typing
   - Role-aware recommendations
   - Exactly 5 technical + 5 functional skills required
   - No duplicates allowed

3. **Experience & Responsibilities (STEP 3)**
   - Experience level controls question count and difficulty bounds
   - Multiple responsibilities can be added
   - Drives scenario-based questions

4. **Adaptive Question Engine (STEP 4)**
   - Dynamic question count based on experience (5-25 questions)
   - Difficulty adjusts after each answer:
     - Strong answer → increase difficulty
     - Weak answer → decrease difficulty
     - Partial answer → maintain difficulty
   - Difficulty bounded by experience level
   - Questions sourced from competencies, skills, and responsibilities

5. **Enhanced Camera Proctoring (STEP 5)**
   - Camera stays ON throughout interview
   - Multiple violation types: multiple faces, looking away, no face
   - Escalation system:
     - 1st violation: Warning (popup + voice)
     - 2nd violation: Strict warning
     - 3rd violation: Mark FAIL (interview continues)
   - Interview continues even after FAIL for data collection

6. **Comprehensive Answer Evaluation (STEP 6)**
   - Evaluates correctness, depth, relevance, confidence
   - Classifies answers as: Strong, Partial, or Weak
   - Feeds back into adaptive difficulty control

7. **Database Management (STEP 7)**
   - All results persisted in SQLite database
   - Stores: metadata, questions, answers, difficulty progression, scores, violations

8. **Secure Admin Panel (STEP 8)**
   - JWT token-based authentication
   - View all candidate interviews
   - Filter by status (All, Passed, Failed, In Progress)
   - Real-time statistics dashboard
   - Detailed candidate information and scores
   - Proctoring status tracking

## 🔐 Admin Panel Access

### Quick Access
- **URL**: `http://localhost:5173/admin.html`
- **Default Credentials**:
  - Username: `admin`
  - Password: `admin123`

### Features
- 📊 Dashboard with statistics (Total, Completed, In Progress, Disqualified)
- 👥 Complete candidate list with filtering
- 🎯 View scores, proctoring status, and timestamps
- 🔄 Real-time data refresh
- 🔒 Secure authentication with JWT tokens

For detailed admin panel documentation, see [ADMIN_ACCESS.md](ADMIN_ACCESS.md)
   - Candidates have NO access to stored results
   - Admin-only access

8. **Secure Admin Panel (STEP 8)**
   - JWT-based authentication
   - View all candidate results
   - Filter by role, date, status
   - Detailed interview reports with:
     - Skill-wise performance
     - Competency-wise evaluation
     - Difficulty progression
     - Proctoring flags
     - Final recommendation
   - Download reports (JSON format)

9. **Modern Professional UI (STEP 9)**
   - Clean, distraction-free candidate interface
   - Professional admin dashboard
   - Enterprise-grade design
   - Clear FAIL reasons (knowledge vs proctoring)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Multi-Step   │ │ Enhanced     │ │ Admin Dashboard      │ │
│  │ Registration │ │ Proctoring   │ │ (Authenticated)      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP + JWT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend v2.0                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Competency   │ │ Adaptive     │ │ Admin APIs           │ │
│  │ Generator    │ │ Engine       │ │ (JWT Protected)      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Skill        │ │ Enhanced DB  │ │ Report Generator     │ │
│  │ Suggester    │ │ Operations   │ │                      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Grok API key from [x.ai](https://console.x.ai/)

### 1. Clone & Setup Environment

```bash
cd "d:\New folder\projects\AI Interview\AI-Interview-Screening-Evaluation"
```

### 2. Configure Environment Variables

Edit the `.env` file in the project root:

```env
# Required: Get your API key from https://console.x.ai/
XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=grok-2-latest

# Admin credentials (change in production!)
ADMIN_USER=admin
ADMIN_PASS=admin123

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at: `http://localhost:8000`

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at: `http://localhost:5173`

---

## 📁 Project Structure

```
AI-Interview-Screening-Evaluation/
├── .env                          # Environment variables
├── backend/
│   ├── main.py                   # FastAPI application (v2.0)
│   ├── config.py                 # Enhanced configuration
│   ├── requirements.txt          # Python dependencies
│   └── utils/
│       ├── ai_utils.py           # AI functions (competencies, skills, adaptive)
│       ├── db_ops.py             # Enhanced database operations
│       ├── auth.py               # JWT authentication (NEW)
│       └── __init__.py
├── frontend/
│   ├── public/
│   │   └── models/               # Face-api.js models
│   ├── src/
│   │   ├── App.jsx               # Main application (enhanced)
│   │   ├── main.jsx              # Entry point
│   │   ├── index.css             # TailwindCSS styles
│   │   └── components/
│   │       ├── VoiceChat.jsx     # Voice recording
│   │       ├── CameraProctor.jsx # Enhanced face detection
│   │       ├── ChatHistory.jsx   # Chat display
│   │       ├── AdminLogin.jsx    # Admin authentication (NEW)
│   │       ├── AdminDashboard.jsx # Admin panel (NEW)
│   │       └── ReportViewer.jsx  # Report display (NEW)
│   ├── package.json
│   └── vite.config.js
└── instance/
    └── interview.db              # SQLite database (enhanced schema)
```

---

## 🔌 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info and version |
| POST | `/generate_competencies` | Generate competencies for role |
| POST | `/suggest_skills` | Get AI skill suggestions |
| POST | `/start_interview` | Create interview session |
| GET | `/questions/{session_id}` | Get current question |
| POST | `/submit_answer` | Submit and evaluate answer |
| POST | `/skip_question` | Skip current question |
| POST | `/report_violation` | Log proctoring violation |
| GET | `/interview_status/{session_id}` | Get interview progress |

### Admin Endpoints (JWT Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Admin authentication |
| GET | `/admin/candidates` | List all candidates |
| GET | `/admin/interview/{id}` | Get full interview report |
| GET | `/admin/download_report/{id}` | Download report (JSON) |

---

## 🎯 Interview Flow

### For Candidates

1. **Registration (Multi-Step)**
   - Enter name, email, role, experience
   - AI generates competencies for role
   - Enter 5 technical skills (with AI suggestions)
   - Enter 5 functional skills (with AI suggestions)
   - Add responsibilities

2. **Interview**
   - Camera proctoring activates
   - Answer questions via voice or text
   - Difficulty adapts based on performance
   - Real-time feedback on answers
   - Progress tracking

3. **Completion**
   - View final score
   - No access to detailed report

### For Admins

1. **Login**
   - Secure JWT authentication
   - Default: admin / admin123

2. **Dashboard**
   - View all candidates
   - Filter and search
   - See proctoring status

3. **Reports**
   - View detailed interview reports
   - Competency scores
   - Skill scores
   - Difficulty progression
   - Violation history
   - Download as JSON

---

## 🎤 Voice Recognition

Uses **Web Speech API** via `react-speech-recognition`:

- Click microphone to start recording
- Speak your answer
- Auto-submits after 2 seconds of silence
- Or click "Send Answer" manually

> **Note**: Voice recognition works best in **Chrome browser**

---

## 📹 Camera Proctoring

Uses **face-api.js** for face detection:

- Detects number of faces in camera
- Monitors gaze direction (looking away)
- Warns when violations detected
- **3 violations = Mark as FAILED**
- Interview continues even after FAIL
- All violations logged to database

### Violation Types

1. **Multiple Faces**: More than one person detected
2. **Looking Away**: Candidate not looking at screen
3. **No Face**: No face detected in frame

### Escalation

- 1st violation: Warning (popup + voice alert)
- 2nd violation: Strict warning
- 3rd violation: Mark FAIL (interview continues for data)

---

## 🔧 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `XAI_API_KEY` | ✅ Yes | Your Grok (xAI) API key |
| `XAI_MODEL` | No | Model name (default: `grok-2-latest`) |
| `ADMIN_USER` | No | Admin username (default: `admin`) |
| `ADMIN_PASS` | No | Admin password (default: `admin123`) |
| `JWT_SECRET` | No | JWT secret key (change in production!) |

---

## 🛠️ Development

### Running Tests

```bash
# Test backend API
curl http://localhost:8000/

# Test competency generation
curl -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer"}'

# Test skill suggestions
curl -X POST http://localhost:8000/suggest_skills \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer","skill_type":"technical","partial_input":"pyt"}'
```

### Admin Login

```bash
# Login as admin
curl -X POST http://localhost:8000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use returned token for authenticated requests
curl http://localhost:8000/admin/candidates \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# The build output will be in frontend/dist/
```

---

## 🔒 Security Features

1. **JWT Authentication**: Admin endpoints protected with JWT tokens
2. **Password Hashing**: Admin credentials validated securely
3. **CORS Configuration**: Configurable allowed origins
4. **Input Validation**: Pydantic models validate all inputs
5. **SQL Injection Protection**: Parameterized queries
6. **Token Expiration**: JWT tokens expire after 24 hours
7. **Candidate Isolation**: Candidates cannot access stored results

---

## 📊 Database Schema

### Enhanced Tables

1. **candidates**: Basic candidate information
2. **interviews**: Enhanced with competencies, skills, responsibilities, difficulty tracking
3. **responses**: Enhanced with difficulty level and answer quality
4. **violations**: Enhanced with severity tracking
5. **competency_scores**: NEW - Tracks competency performance
6. **skill_scores**: NEW - Tracks skill performance

---

## 🎨 UI/UX Features

### Candidate Interface

- Clean, distraction-free design
- Real-time camera preview
- Violation warnings (popup + voice)
- Progress indicator
- Difficulty indicator
- No access to results

### Admin Interface

- Professional dashboard layout
- Table-based result listing
- Advanced filtering
- Drill-down report view
- Download functionality
- Clear failure reasons

---

## 🚀 Deployment Checklist

- [ ] Change `ADMIN_USER` and `ADMIN_PASS` in `.env`
- [ ] Change `JWT_SECRET` to a strong random key
- [ ] Configure CORS allowed origins in `main.py`
- [ ] Set up production database (PostgreSQL recommended)
- [ ] Enable HTTPS
- [ ] Set up Redis for session management
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging
- [ ] Test all proctoring features
- [ ] Test admin authentication

---

## 📝 License

MIT License - feel free to use for your projects!

---

## 🤝 Contributing

This is a production-ready system. For enhancements:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a pull request

---

## 📞 Support

For issues or questions:
- Check the API documentation at `http://localhost:8000/docs`
- Review the code comments
- Test with the provided curl commands

---

## 🎯 Key Features Summary

✅ Role-based competency generation  
✅ AI-powered skill suggestions  
✅ Adaptive difficulty engine  
✅ Enhanced camera proctoring  
✅ Comprehensive answer evaluation  
✅ Secure admin panel  
✅ Detailed reporting  
✅ JWT authentication  
✅ Database persistence  
✅ Production-ready architecture  

**Version**: 2.0.0  
**Status**: Production Ready  
**Last Updated**: 2026-02-04
