# 🧪 Testing Guide - AI Interview System v2.0

Complete testing guide to verify all features are working correctly.

---

## 📋 Pre-Testing Checklist

- [ ] Backend is running on `http://localhost:8000`
- [ ] Frontend is running on `http://localhost:5173`
- [ ] `.env` file is configured with valid `XAI_API_KEY`
- [ ] Database is initialized
- [ ] All dependencies are installed

---

## 🔧 Backend API Tests

### 1. Test API Health

```bash
curl http://localhost:8000/
```

**Expected Response:**
```json
{
  "message": "AI Interview API v2.0 - Enhanced",
  "version": "2.0.0",
  "features": [...]
}
```

---

### 2. Test Competency Generation

```bash
curl -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer"}'
```

**Expected Response:**
- Success: true
- 3-7 competencies returned
- Each with name, positive_indicator, negative_indicator

**Test Different Roles:**
```bash
# Data Scientist
curl -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Data Scientist"}'

# Product Manager
curl -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Product Manager"}'

# Marketing Manager
curl -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Marketing Manager"}'
```

---

### 3. Test Skill Suggestions

```bash
# Technical skills
curl -X POST http://localhost:8000/suggest_skills \
  -H "Content-Type: application/json" \
  -d '{
    "role":"Software Engineer",
    "skill_type":"technical",
    "partial_input":"pyt"
  }'

# Functional skills
curl -X POST http://localhost:8000/suggest_skills \
  -H "Content-Type: application/json" \
  -d '{
    "role":"Software Engineer",
    "skill_type":"functional",
    "partial_input":"agil"
  }'
```

**Expected Response:**
- Success: true
- Array of 5-10 relevant suggestions
- Suggestions match partial_input

---

### 4. Test Interview Creation

```bash
curl -X POST http://localhost:8000/start_interview \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Candidate",
    "email": "test@example.com",
    "role": "Software Engineer",
    "experience": "5",
    "competencies": [
      {
        "name": "Problem Solving",
        "positive_indicator": "Approaches challenges systematically",
        "negative_indicator": "Gets overwhelmed by complex problems"
      },
      {
        "name": "Communication",
        "positive_indicator": "Articulates ideas clearly",
        "negative_indicator": "Struggles to express thoughts"
      },
      {
        "name": "Teamwork",
        "positive_indicator": "Collaborates effectively",
        "negative_indicator": "Works in isolation"
      }
    ],
    "technical_skills": [
      "Python",
      "JavaScript",
      "React",
      "Node.js",
      "PostgreSQL"
    ],
    "functional_skills": [
      "Agile Methodology",
      "Project Management",
      "Team Leadership",
      "Communication",
      "Problem Analysis"
    ],
    "responsibilities": [
      "Lead development team",
      "Design system architecture",
      "Code review and mentoring"
    ]
  }'
```

**Expected Response:**
- Success: true
- session_id returned
- total_questions between 5-25
- initial_difficulty calculated based on experience
- first_question returned

**Save the session_id for next tests!**

---

### 5. Test Get Current Question

```bash
# Replace {session_id} with actual session_id from previous test
curl http://localhost:8000/questions/1
```

**Expected Response:**
- Success: true
- is_complete: false
- current_index: 0
- current_difficulty: number
- question object with category, question, difficulty, source

---

### 6. Test Answer Submission

```bash
curl -X POST http://localhost:8000/submit_answer \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "answer_text": "Python is a high-level, interpreted programming language known for its simplicity and readability. It supports multiple programming paradigms including procedural, object-oriented, and functional programming. Python has a large standard library and extensive third-party packages available through pip."
  }'
```

**Expected Response:**
- Success: true
- evaluation object with:
  - score (0-100)
  - feedback (string)
  - quality (strong/partial/weak)
  - correctness, depth, relevance, confidence scores
- next_question returned
- current_difficulty updated
- difficulty_change shown

**Test Different Answer Qualities:**

```bash
# Strong answer (should increase difficulty)
curl -X POST http://localhost:8000/submit_answer \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "answer_text": "Comprehensive and detailed answer with examples and deep understanding..."
  }'

# Weak answer (should decrease difficulty)
curl -X POST http://localhost:8000/submit_answer \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "answer_text": "I dont know"
  }'

# Partial answer (should maintain difficulty)
curl -X POST http://localhost:8000/submit_answer \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "answer_text": "It is a programming language"
  }'
```

---

### 7. Test Violation Reporting

```bash
# First violation (warning)
curl -X POST http://localhost:8000/report_violation \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "violation_count": 1,
    "violation_type": "multiple_faces"
  }'

# Second violation (strict warning)
curl -X POST http://localhost:8000/report_violation \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "violation_count": 2,
    "violation_type": "looking_away"
  }'

# Third violation (fail)
curl -X POST http://localhost:8000/report_violation \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "violation_count": 3,
    "violation_type": "no_face"
  }'
```

**Expected Responses:**
- 1st: severity="warning", remaining_warnings=2
- 2nd: severity="strict_warning", remaining_warnings=1
- 3rd: severity="fail", is_disqualified=true

---

### 8. Test Admin Login

```bash
curl -X POST http://localhost:8000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Expected Response:**
- Success: true
- token returned (JWT)
- username: "admin"
- role: "admin"

**Save the token for next tests!**

---

### 9. Test Admin Endpoints (Protected)

```bash
# Set your token
TOKEN="your_jwt_token_here"

# List all candidates
curl http://localhost:8000/admin/candidates \
  -H "Authorization: Bearer $TOKEN"

# Get interview report
curl http://localhost:8000/admin/interview/1 \
  -H "Authorization: Bearer $TOKEN"

# Download report
curl http://localhost:8000/admin/download_report/1?format=json \
  -H "Authorization: Bearer $TOKEN" \
  -o report.json
```

**Expected Responses:**
- List candidates: Array of all candidates with interview data
- Get report: Complete interview report with all details
- Download: JSON file saved

---

### 10. Test Authentication Failure

```bash
# Try admin endpoint without token
curl http://localhost:8000/admin/candidates

# Try with invalid token
curl http://localhost:8000/admin/candidates \
  -H "Authorization: Bearer invalid_token"
```

**Expected Response:**
- Status: 401 Unauthorized
- Detail: "Invalid or expired authentication token"

---

## 🎨 Frontend Tests

### Manual Testing Checklist

#### Registration Flow

- [ ] Open `http://localhost:5173`
- [ ] Enter candidate information
- [ ] Click "Generate Competencies" (if implemented)
- [ ] Verify competencies are displayed
- [ ] Enter technical skills with AI suggestions
- [ ] Enter functional skills with AI suggestions
- [ ] Add responsibilities
- [ ] Submit and start interview

#### Interview Flow

- [ ] Camera activates and shows preview
- [ ] First question is displayed
- [ ] Microphone button works
- [ ] Voice recognition captures speech
- [ ] Text input works as alternative
- [ ] Answer submission works
- [ ] Evaluation feedback is shown
- [ ] Next question appears
- [ ] Difficulty indicator updates
- [ ] Progress bar updates

#### Proctoring Tests

- [ ] Multiple faces detected → Warning shown
- [ ] Second violation → Strict warning
- [ ] Third violation → Marked as FAILED
- [ ] Interview continues after FAIL
- [ ] Violations logged to database

#### Completion

- [ ] Interview completes after all questions
- [ ] Final score is displayed
- [ ] Candidate cannot access detailed report

#### Admin Panel (if implemented)

- [ ] Admin login page works
- [ ] JWT token is stored
- [ ] Dashboard shows all candidates
- [ ] Filtering works
- [ ] Clicking candidate shows report
- [ ] Report displays all sections:
  - [ ] Candidate info
  - [ ] Overall score
  - [ ] Competency scores
  - [ ] Skill scores
  - [ ] Difficulty progression
  - [ ] Violations
  - [ ] All Q&A pairs
- [ ] Download button works

---

## 🔍 Database Verification

### Check Database Tables

```bash
# Connect to database
sqlite3 instance/interview.db

# List tables
.tables

# Check candidates
SELECT * FROM candidates;

# Check interviews
SELECT * FROM interviews;

# Check responses
SELECT * FROM responses;

# Check violations
SELECT * FROM violations;

# Check competency scores
SELECT * FROM competency_scores;

# Check skill scores
SELECT * FROM skill_scores;

# Exit
.quit
```

**Expected:**
- All 6 tables exist
- Data is properly stored
- Foreign keys are correct
- JSON fields are valid

---

## 🧪 Integration Tests

### Complete Interview Flow

```bash
# 1. Generate competencies
COMP_RESPONSE=$(curl -s -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer"}')

echo "Competencies: $COMP_RESPONSE"

# 2. Start interview (use competencies from step 1)
INTERVIEW_RESPONSE=$(curl -s -X POST http://localhost:8000/start_interview \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Integration Test",
    "email": "integration@test.com",
    "role": "Software Engineer",
    "experience": "3",
    "competencies": [
      {"name":"Problem Solving","positive_indicator":"Good","negative_indicator":"Bad"},
      {"name":"Communication","positive_indicator":"Good","negative_indicator":"Bad"},
      {"name":"Teamwork","positive_indicator":"Good","negative_indicator":"Bad"}
    ],
    "technical_skills": ["Python","JavaScript","React","Node.js","SQL"],
    "functional_skills": ["Agile","PM","Leadership","Communication","Analysis"],
    "responsibilities": ["Lead team","Design architecture"]
  }')

SESSION_ID=$(echo $INTERVIEW_RESPONSE | jq -r '.session_id')
echo "Session ID: $SESSION_ID"

# 3. Answer questions
for i in {1..5}; do
  echo "Answering question $i..."
  curl -s -X POST http://localhost:8000/submit_answer \
    -H "Content-Type: application/json" \
    -d "{
      \"session_id\": $SESSION_ID,
      \"answer_text\": \"This is a comprehensive answer to question $i with detailed explanation and examples.\"
    }" | jq '.evaluation.score'
  sleep 1
done

# 4. Check final status
curl -s http://localhost:8000/questions/$SESSION_ID | jq '.'

# 5. Admin login
TOKEN=$(curl -s -X POST http://localhost:8000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Admin Token: $TOKEN"

# 6. Get report
curl -s http://localhost:8000/admin/interview/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.report.metadata'
```

---

## 📊 Performance Tests

### Load Testing with Apache Bench

```bash
# Test competency generation
ab -n 100 -c 10 -p comp_data.json -T application/json \
  http://localhost:8000/generate_competencies

# Test skill suggestions
ab -n 100 -c 10 -p skill_data.json -T application/json \
  http://localhost:8000/suggest_skills
```

**Create test data files:**

```bash
# comp_data.json
echo '{"role":"Software Engineer"}' > comp_data.json

# skill_data.json
echo '{"role":"Software Engineer","skill_type":"technical","partial_input":"pyt"}' > skill_data.json
```

---

## ✅ Test Results Checklist

### Backend Tests
- [ ] API health check passes
- [ ] Competency generation works for multiple roles
- [ ] Skill suggestions work for technical and functional
- [ ] Interview creation validates inputs correctly
- [ ] Questions are generated adaptively
- [ ] Answer evaluation classifies quality correctly
- [ ] Difficulty adjusts based on answer quality
- [ ] Violations are tracked with correct severity
- [ ] Admin login returns valid JWT
- [ ] Admin endpoints require authentication
- [ ] Reports contain all required data

### Frontend Tests
- [ ] Registration flow is smooth
- [ ] AI suggestions appear while typing
- [ ] Camera proctoring works
- [ ] Voice recognition works
- [ ] Interview progresses correctly
- [ ] Admin panel is accessible
- [ ] Reports are viewable
- [ ] Download functionality works

### Database Tests
- [ ] All tables created correctly
- [ ] Data is stored properly
- [ ] Relationships are maintained
- [ ] JSON fields are valid

### Integration Tests
- [ ] Complete flow works end-to-end
- [ ] Data flows correctly between components
- [ ] No data loss occurs

### Performance Tests
- [ ] API responds within acceptable time
- [ ] No memory leaks
- [ ] Handles concurrent requests

---

## 🐛 Common Issues & Solutions

### Issue: "XAI_API_KEY missing"
**Solution:** Add valid API key to `.env` file

### Issue: "Session not found"
**Solution:** Use correct session_id from start_interview response

### Issue: "Invalid token"
**Solution:** Login again to get fresh JWT token

### Issue: "Database locked"
**Solution:** Close other connections to database

### Issue: "Camera not working"
**Solution:** 
- Use HTTPS in production
- Grant camera permissions in browser
- Use Chrome for best compatibility

---

## 📝 Test Report Template

```markdown
# Test Report - AI Interview System v2.0

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** Development/Production

## Test Results

### Backend API Tests
- [ ] PASS / FAIL - API Health
- [ ] PASS / FAIL - Competency Generation
- [ ] PASS / FAIL - Skill Suggestions
- [ ] PASS / FAIL - Interview Creation
- [ ] PASS / FAIL - Answer Submission
- [ ] PASS / FAIL - Violation Reporting
- [ ] PASS / FAIL - Admin Authentication
- [ ] PASS / FAIL - Admin Endpoints

### Frontend Tests
- [ ] PASS / FAIL - Registration Flow
- [ ] PASS / FAIL - Interview Flow
- [ ] PASS / FAIL - Proctoring
- [ ] PASS / FAIL - Admin Panel

### Issues Found
1. Issue description
2. Issue description

### Recommendations
1. Recommendation
2. Recommendation
```

---

**Testing Guide Version**: 2.0.0  
**Last Updated**: 2026-02-04
