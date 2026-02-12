# 📚 API Documentation - AI Interview System v2.0

Complete API reference for the AI Interview Screening & Evaluation System.

## Base URL

```
Development: http://localhost:8000
Production: https://your-domain.com/api
```

## Authentication

Admin endpoints require JWT authentication.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 📋 Table of Contents

1. [Public Endpoints](#public-endpoints)
2. [Admin Endpoints](#admin-endpoints)
3. [Data Models](#data-models)
4. [Error Responses](#error-responses)
5. [Examples](#examples)

---

## Public Endpoints

### 1. Get API Info

```http
GET /
```

**Response:**
```json
{
  "message": "AI Interview API v2.0 - Enhanced",
  "version": "2.0.0",
  "features": [
    "Role-based competency generation",
    "AI-powered skill suggestions",
    "Adaptive difficulty engine",
    "Enhanced camera proctoring",
    "Admin panel with authentication",
    "Comprehensive reporting"
  ]
}
```

---

### 2. Generate Competencies

Generate role-based competencies with behavioral indicators.

```http
POST /generate_competencies
```

**Request Body:**
```json
{
  "role": "Software Engineer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": "Software Engineer",
    "competencies": [
      {
        "name": "Technical Problem Solving",
        "positive_indicator": "Breaks down complex problems systematically and finds efficient solutions",
        "negative_indicator": "Struggles with complex problems or gives up easily"
      },
      {
        "name": "Code Quality",
        "positive_indicator": "Writes clean, maintainable, and well-documented code",
        "negative_indicator": "Produces messy code with poor documentation"
      }
    ]
  }
}
```

---

### 3. Suggest Skills

Get AI-powered skill suggestions based on role and partial input.

```http
POST /suggest_skills
```

**Request Body:**
```json
{
  "role": "Software Engineer",
  "skill_type": "technical",
  "partial_input": "pyt"
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    "Python",
    "PyTorch",
    "Pytest",
    "Python Flask",
    "Python Django"
  ]
}
```

**Parameters:**
- `role` (string, required): Job role
- `skill_type` (string, required): "technical" or "functional"
- `partial_input` (string, optional): Partial skill name for filtering

---

### 4. Start Interview

Create a new interview session with complete metadata.

```http
POST /start_interview
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Software Engineer",
  "experience": "5",
  "competencies": [
    {
      "name": "Problem Solving",
      "positive_indicator": "Approaches challenges systematically",
      "negative_indicator": "Gets overwhelmed by complex problems"
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
  ],
  "hobbies": "Reading, Coding",
  "resume_name": "john_doe_resume.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": 1,
  "candidate_id": 1,
  "total_questions": 15,
  "initial_difficulty": 65,
  "first_question": {
    "category": "Technical",
    "question": "Explain the concept of closures in JavaScript",
    "difficulty": 65,
    "source": "JavaScript"
  }
}
```

**Validation Rules:**
- Exactly 5 technical skills required
- Exactly 5 functional skills required
- At least 3 competencies required
- Valid email format

---

### 5. Get Current Question

Retrieve the current question for an interview session.

```http
GET /questions/{session_id}
```

**Response (Active Interview):**
```json
{
  "success": true,
  "is_complete": false,
  "current_index": 2,
  "total_questions": 15,
  "current_difficulty": 70,
  "question": {
    "category": "Competency",
    "question": "Describe a time when you had to solve a complex technical problem",
    "difficulty": 70,
    "source": "Problem Solving"
  }
}
```

**Response (Complete Interview):**
```json
{
  "success": true,
  "is_complete": true,
  "final_score": 78.5,
  "total_answered": 15,
  "final_difficulty": 75
}
```

**Response (Disqualified):**
```json
{
  "success": false,
  "is_disqualified": true,
  "message": "Interview disqualified due to proctoring violations"
}
```

---

### 6. Submit Answer

Submit an answer and receive evaluation with adaptive difficulty adjustment.

```http
POST /submit_answer
```

**Request Body:**
```json
{
  "session_id": 1,
  "answer_text": "Closures in JavaScript are functions that have access to variables from an outer function even after the outer function has returned. They are created when a function is defined inside another function and the inner function references variables from the outer scope."
}
```

**Response:**
```json
{
  "success": true,
  "evaluation": {
    "score": 85,
    "feedback": "Excellent explanation with clear understanding of closures",
    "quality": "strong",
    "correctness": 90,
    "depth": 85,
    "relevance": 90,
    "confidence": 80
  },
  "is_complete": false,
  "next_question": {
    "category": "Technical",
    "question": "How would you implement a closure-based counter in JavaScript?",
    "difficulty": 75,
    "source": "JavaScript"
  },
  "questions_answered": 3,
  "total_questions": 15,
  "current_difficulty": 75,
  "difficulty_change": 10
}
```

**Answer Quality Classification:**
- `strong`: Comprehensive, accurate, confident answer → Difficulty increases
- `partial`: Correct but incomplete → Difficulty maintains
- `weak`: Incorrect or vague → Difficulty decreases

---

### 7. Skip Question

Skip the current question.

```http
POST /skip_question
```

**Request Body:**
```json
{
  "user_text": "",
  "session_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "is_complete": false,
  "current_index": 4
}
```

---

### 8. Report Violation

Report a proctoring violation.

```http
POST /report_violation
```

**Request Body:**
```json
{
  "session_id": 1,
  "violation_count": 1,
  "violation_type": "multiple_faces",
  "severity": "warning"
}
```

**Response (Warning):**
```json
{
  "success": true,
  "is_disqualified": false,
  "severity": "warning",
  "violation_count": 1,
  "remaining_warnings": 2
}
```

**Response (Disqualified):**
```json
{
  "success": true,
  "is_disqualified": true,
  "severity": "fail",
  "message": "Interview marked as FAILED due to proctoring violations. Interview will continue for data collection."
}
```

**Violation Types:**
- `multiple_faces`: More than one person detected
- `looking_away`: Candidate not looking at screen
- `no_face`: No face detected

**Severity Levels:**
- `warning`: 1st violation
- `strict_warning`: 2nd violation
- `fail`: 3rd violation (marked as FAILED, interview continues)

---

### 9. Get Interview Status

Get current status of an interview session.

```http
GET /interview_status/{session_id}
```

**Response:**
```json
{
  "success": true,
  "current_index": 5,
  "total_questions": 15,
  "is_disqualified": false,
  "violation_count": 1,
  "current_difficulty": 70
}
```

---

## Admin Endpoints

All admin endpoints require JWT authentication.

### 1. Admin Login

Authenticate as admin and receive JWT token.

```http
POST /admin/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin",
  "role": "admin"
}
```

**Error Response:**
```json
{
  "detail": "Invalid credentials"
}
```

---

### 2. List All Candidates

Get list of all candidates with interview summaries.

```http
GET /admin/candidates
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "candidates": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Software Engineer",
      "experience": "5",
      "interview_id": 1,
      "started_at": "2026-02-04T10:30:00",
      "status": "COMPLETED",
      "overall_score": 78.5,
      "proctoring_status": "ACTIVE",
      "failure_reason": null
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "Data Scientist",
      "experience": "3",
      "interview_id": 2,
      "started_at": "2026-02-04T11:00:00",
      "status": "DISQUALIFIED",
      "overall_score": 65.0,
      "proctoring_status": "FAILED",
      "failure_reason": "proctoring_multiple_faces"
    }
  ]
}
```

---

### 3. Get Interview Report

Get detailed interview report for a specific interview.

```http
GET /admin/interview/{interview_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "report": {
    "interview_id": 1,
    "candidate": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Software Engineer",
      "experience": "5"
    },
    "metadata": {
      "started_at": "2026-02-04T10:30:00",
      "submitted_at": "2026-02-04T11:15:00",
      "overall_score": 78.5,
      "status": "COMPLETED",
      "initial_difficulty": 65,
      "final_difficulty": 75,
      "proctoring_status": "ACTIVE",
      "failure_reason": null
    },
    "responses": [
      {
        "question_index": 1,
        "category": "Technical",
        "question": "Explain closures in JavaScript",
        "answer": "Closures are functions that...",
        "score": 85,
        "feedback": "Excellent explanation",
        "difficulty": 65,
        "quality": "strong",
        "timestamp": "2026-02-04T10:35:00"
      }
    ],
    "violations": [
      {
        "count": 1,
        "type": "looking_away",
        "severity": "warning",
        "timestamp": "2026-02-04T10:40:00"
      }
    ],
    "competency_scores": [
      {
        "name": "Problem Solving",
        "score": 82.0,
        "positive_indicators": 0,
        "negative_indicators": 0
      }
    ],
    "skill_scores": [
      {
        "name": "JavaScript",
        "type": "technical",
        "score": 85.0,
        "questions_asked": 3
      }
    ]
  }
}
```

---

### 4. Download Report

Download interview report in JSON format.

```http
GET /admin/download_report/{interview_id}?format=json
Authorization: Bearer <token>
```

**Query Parameters:**
- `format`: "json" (default)

**Response:**
Returns the full report JSON (same structure as Get Interview Report)

---

## Data Models

### Competency Model

```typescript
{
  name: string;
  positive_indicator: string;
  negative_indicator: string;
}
```

### Question Model

```typescript
{
  category: string;
  question: string;
  difficulty: number;  // 0-100
  source: string;
}
```

### Evaluation Model

```typescript
{
  score: number;  // 0-100
  feedback: string;
  quality: "strong" | "partial" | "weak";
  correctness: number;  // 0-100
  depth: number;  // 0-100
  relevance: number;  // 0-100
  confidence: number;  // 0-100
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Exactly 5 technical skills required"
}
```

### 401 Unauthorized

```json
{
  "detail": "Invalid or expired authentication token"
}
```

### 404 Not Found

```json
{
  "detail": "Session not found"
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error message"
}
```

---

## Examples

### Complete Interview Flow

```bash
# 1. Generate competencies
curl -X POST http://localhost:8000/generate_competencies \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer"}'

# 2. Get skill suggestions
curl -X POST http://localhost:8000/suggest_skills \
  -H "Content-Type: application/json" \
  -d '{"role":"Software Engineer","skill_type":"technical","partial_input":"pyt"}'

# 3. Start interview
curl -X POST http://localhost:8000/start_interview \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "email":"john@example.com",
    "role":"Software Engineer",
    "experience":"5",
    "competencies":[{"name":"Problem Solving","positive_indicator":"Good","negative_indicator":"Bad"}],
    "technical_skills":["Python","JavaScript","React","Node.js","PostgreSQL"],
    "functional_skills":["Agile","PM","Leadership","Communication","Analysis"],
    "responsibilities":["Lead team","Design architecture"]
  }'

# 4. Submit answer
curl -X POST http://localhost:8000/submit_answer \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"answer_text":"Closures are functions that..."}'

# 5. Report violation
curl -X POST http://localhost:8000/report_violation \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"violation_count":1,"violation_type":"looking_away"}'
```

### Admin Flow

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:8000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# 2. List candidates
curl http://localhost:8000/admin/candidates \
  -H "Authorization: Bearer $TOKEN"

# 3. Get interview report
curl http://localhost:8000/admin/interview/1 \
  -H "Authorization: Bearer $TOKEN"

# 4. Download report
curl http://localhost:8000/admin/download_report/1?format=json \
  -H "Authorization: Bearer $TOKEN" \
  -o report.json
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production:

- Implement rate limiting per IP
- Limit API calls per user
- Use Redis for distributed rate limiting

---

## Versioning

Current API version: **v2.0.0**

API versioning strategy:
- Major version: Breaking changes
- Minor version: New features (backward compatible)
- Patch version: Bug fixes

---

## Support

For API issues:
- Check FastAPI auto-generated docs: `http://localhost:8000/docs`
- Review error messages in response
- Check server logs

---

**API Documentation Version**: 2.0.0  
**Last Updated**: 2026-02-04
