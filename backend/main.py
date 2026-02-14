from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from utils.db_ops import (
    init_db, save_candidate, create_interview, save_response,
    list_candidates, get_candidate_details, finalize_interview,
    log_violation, disqualify_interview, get_interview, get_response_count,
    save_competency_score, save_skill_score, get_interview_full_report,
    update_interview_difficulty
)
from utils.ai_utils import (
    get_ai_response, generate_competencies_for_role, suggest_skills,
    generate_adaptive_questions, evaluate_answer_comprehensive,
    calculate_next_difficulty, generate_adaptive_followup
)
from utils.auth import (
    create_admin_token, verify_admin_credentials, get_current_admin
)

# Initialize FastAPI app
app = FastAPI(
    title="AI Interview API - Enhanced",
    description="Production-ready AI Interview Screening & Evaluation System",
    version="2.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development. Configure this for production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db(Config.DATABASE)

# Store session data in memory (in production, use Redis or similar)
sessions: Dict[int, Dict[str, Any]] = {}


# --------------------------------------------------------
# Pydantic Models
# --------------------------------------------------------
class CompetencyModel(BaseModel):
    name: str
    positive_indicator: str
    negative_indicator: str


class StartInterviewRequest(BaseModel):
    name: str
    email: EmailStr
    role: str
    experience: str
    competencies: List[CompetencyModel]
    technical_skills: List[str]
    functional_skills: List[str]
    responsibilities: List[str]
    hobbies: Optional[str] = ""
    resume_name: Optional[str] = None


class ChatRequest(BaseModel):
    user_text: str
    session_id: int


class SubmitAnswerRequest(BaseModel):
    session_id: int
    answer_text: str


class ViolationRequest(BaseModel):
    session_id: int
    violation_count: int
    violation_type: str
    severity: Optional[str] = "warning"


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class SkillSuggestionRequest(BaseModel):
    role: str
    skill_type: str  # 'technical' or 'functional'
    partial_input: Optional[str] = ""


# --------------------------------------------------------
# Public API Endpoints
# --------------------------------------------------------

@app.get("/")
async def root():
    return {
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


@app.post("/generate_competencies")
async def generate_competencies(request: Dict[str, str]):
    """Generate competencies for a given role."""
    try:
        role = request.get("role", "")
        if not role:
            raise HTTPException(status_code=400, detail="Role is required")
        
        competencies_data = generate_competencies_for_role(role)
        
        return {
            "success": True,
            "data": competencies_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/suggest_skills")
async def get_skill_suggestions(request: SkillSuggestionRequest):
    """Get AI-powered skill suggestions."""
    try:
        suggestions = suggest_skills(
            request.role,
            request.skill_type,
            request.partial_input
        )
        
        return {
            "success": True,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/start_interview")
async def start_interview(request: StartInterviewRequest):
    """Start a new interview session with enhanced metadata."""
    try:
        # Validate inputs
        if len(request.technical_skills) != 5:
            raise HTTPException(status_code=400, detail="Exactly 5 technical skills required")
        if len(request.functional_skills) != 5:
            raise HTTPException(status_code=400, detail="Exactly 5 functional skills required")
        if len(request.competencies) < 3:
            raise HTTPException(status_code=400, detail="At least 3 competencies required")
        
        # Calculate initial difficulty based on experience
        exp_years = int(request.experience) if request.experience.isdigit() else 3
        initial_difficulty = min(80, max(30, 40 + exp_years * 5))
        
        # Save candidate
        candidate_id = save_candidate(
            request.name, request.email, request.role, request.experience,
            request.hobbies, request.resume_name, Config.DATABASE
        )
        
        # Prepare competencies data
        competencies_list = [c.dict() for c in request.competencies]
        
        # Create interview with enhanced metadata
        interview_id = create_interview(
            candidate_id, Config.DATABASE,
            competencies=competencies_list,
            technical_skills=request.technical_skills,
            functional_skills=request.functional_skills,
            responsibilities=request.responsibilities,
            initial_difficulty=initial_difficulty
        )
        
        # Generate adaptive questions
        questions = generate_adaptive_questions(
            request.role,
            request.experience,
            competencies_list,
            request.technical_skills,
            request.functional_skills,
            request.responsibilities,
            initial_difficulty
        )
        
        # Store in session
        sessions[interview_id] = {
            "candidate_id": candidate_id,
            "questions": questions,
            "current_index": 0,
            "role": request.role,
            "experience": request.experience,
            "experience_years": exp_years,
            "competencies": competencies_list,
            "technical_skills": request.technical_skills,
            "functional_skills": request.functional_skills,
            "responsibilities": request.responsibilities,
            "current_difficulty": initial_difficulty,
            "chat_history": [],
            "violation_count": 0,
            "is_disqualified": False,
            "competency_tracking": {c["name"]: {"scores": [], "count": 0} for c in competencies_list},
            "skill_tracking": {
                **{s: {"scores": [], "count": 0} for s in request.technical_skills},
                **{s: {"scores": [], "count": 0} for s in request.functional_skills}
            }
        }
        
        return {
            "success": True,
            "session_id": interview_id,
            "candidate_id": candidate_id,
            "total_questions": len(questions),
            "initial_difficulty": initial_difficulty,
            "first_question": questions[0] if questions else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/questions/{session_id}")
async def get_current_question(session_id: int):
    """Get current question for the session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if session["is_disqualified"]:
        return {
            "success": False,
            "is_disqualified": True,
            "message": "Interview disqualified due to proctoring violations"
        }
    
    idx = session["current_index"]
    questions = session["questions"]
    
    if idx >= len(questions):
        # Interview complete - finalize
        avg_score = finalize_interview(session_id, Config.DATABASE)
        update_interview_difficulty(session_id, session["current_difficulty"], Config.DATABASE)
        
        # Save competency and skill scores
        for comp_name, data in session["competency_tracking"].items():
            if data["count"] > 0:
                avg_score_comp = sum(data["scores"]) / data["count"]
                save_competency_score(session_id, comp_name, avg_score_comp, 0, 0, Config.DATABASE)
        
        for skill_name, data in session["skill_tracking"].items():
            if data["count"] > 0:
                avg_score_skill = sum(data["scores"]) / data["count"]
                skill_type = "technical" if skill_name in session["technical_skills"] else "functional"
                save_skill_score(session_id, skill_name, skill_type, avg_score_skill, data["count"], Config.DATABASE)
        
        return {
            "success": True,
            "is_complete": True,
            "final_score": avg_score,
            "total_answered": idx,
            "final_difficulty": session["current_difficulty"]
        }
    
    return {
        "success": True,
        "is_complete": False,
        "current_index": idx,
        "total_questions": len(questions),
        "current_difficulty": session["current_difficulty"],
        "question": questions[idx]
    }


@app.post("/submit_answer")
async def submit_answer(request: SubmitAnswerRequest):
    """Submit answer with adaptive difficulty adjustment."""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[request.session_id]
    
    if session["is_disqualified"]:
        return {
            "success": False,
            "is_disqualified": True,
            "message": "Interview disqualified"
        }
    
    idx = session["current_index"]
    questions = session["questions"]
    
    if idx >= len(questions):
        return {
            "success": False,
            "message": "No more questions"
        }
    
    current_q = questions[idx]
    current_difficulty = session["current_difficulty"]
    
    try:
        # Comprehensive evaluation
        evaluation = evaluate_answer_comprehensive(
            current_q["question"],
            request.answer_text,
            current_q.get("category", "General"),
            session["role"],
            session["experience"],
            current_difficulty,
            current_q.get("source", "")
        )
        
        # Track scores for competencies and skills
        source = current_q.get("source", "")
        if source in session["competency_tracking"]:
            session["competency_tracking"][source]["scores"].append(evaluation["score"])
            session["competency_tracking"][source]["count"] += 1
        elif source in session["skill_tracking"]:
            session["skill_tracking"][source]["scores"].append(evaluation["score"])
            session["skill_tracking"][source]["count"] += 1
        
        # Save response to database
        save_response(
            request.session_id, idx + 1, current_q.get("category"),
            current_q["question"], request.answer_text,
            evaluation.get("score"), evaluation.get("feedback"),
            Config.DATABASE, current_difficulty, evaluation.get("quality")
        )
        
        # Calculate next difficulty
        new_difficulty = calculate_next_difficulty(
            current_difficulty,
            evaluation["quality"],
            session["experience_years"]
        )
        session["current_difficulty"] = new_difficulty
        
        # Generate adaptive follow-up question
        if idx + 1 < Config.MAX_QUESTIONS and evaluation["quality"] in ["strong", "partial"]:
            try:
                adaptive_q = generate_adaptive_followup(
                    current_q["question"],
                    request.answer_text,
                    evaluation["quality"],
                    current_q.get("category", ""),
                    session["role"],
                    session["experience"],
                    new_difficulty,
                    current_q.get("source", "")
                )
                
                if adaptive_q and idx + 1 < len(questions):
                    # Insert adaptive question
                    questions.insert(idx + 1, adaptive_q)
                    # Limit total questions
                    session["questions"] = questions[:Config.MAX_QUESTIONS]
            except Exception as e:
                print(f"Error generating adaptive question: {e}")
        
        # Move to next question
        session["current_index"] += 1
        
        # Check if interview complete
        is_complete = session["current_index"] >= len(session["questions"])
        final_score = None
        
        if is_complete:
            final_score = finalize_interview(request.session_id, Config.DATABASE)
            update_interview_difficulty(request.session_id, new_difficulty, Config.DATABASE)
            
            # Save final competency and skill scores
            for comp_name, data in session["competency_tracking"].items():
                if data["count"] > 0:
                    avg_score_comp = sum(data["scores"]) / data["count"]
                    save_competency_score(request.session_id, comp_name, avg_score_comp, 0, 0, Config.DATABASE)
            
            for skill_name, data in session["skill_tracking"].items():
                if data["count"] > 0:
                    avg_score_skill = sum(data["scores"]) / data["count"]
                    skill_type = "technical" if skill_name in session["technical_skills"] else "functional"
                    save_skill_score(request.session_id, skill_name, skill_type, avg_score_skill, data["count"], Config.DATABASE)
        
        next_question = None
        if not is_complete and session["current_index"] < len(session["questions"]):
            next_question = session["questions"][session["current_index"]]
        
        return {
            "success": True,
            "evaluation": evaluation,
            "is_complete": is_complete,
            "final_score": final_score,
            "next_question": next_question,
            "questions_answered": session["current_index"],
            "total_questions": len(session["questions"]),
            "current_difficulty": new_difficulty,
            "difficulty_change": new_difficulty - current_difficulty
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/skip_question")
async def skip_question(request: ChatRequest):
    """Skip current question."""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[request.session_id]
    idx = session["current_index"]
    questions = session["questions"]
    
    if idx < len(questions):
        current_q = questions[idx]
        # Save as skipped
        save_response(
            request.session_id, idx + 1, current_q.get("category"),
            current_q["question"], "", 0, "Skipped",
            Config.DATABASE, session["current_difficulty"], "weak"
        )
        session["current_index"] += 1
    
    is_complete = session["current_index"] >= len(questions)
    final_score = None
    if is_complete:
        final_score = finalize_interview(request.session_id, Config.DATABASE)
        update_interview_difficulty(request.session_id, session["current_difficulty"], Config.DATABASE)
    
    return {
        "success": True,
        "is_complete": is_complete,
        "final_score": final_score,
        "current_index": session["current_index"]
    }


@app.post("/report_violation")
async def report_violation(request: ViolationRequest):
    """Report a proctoring violation with severity tracking."""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[request.session_id]
    session["violation_count"] = request.violation_count
    
    # Determine severity
    if request.violation_count == 1:
        severity = "warning"
    elif request.violation_count == 2:
        severity = "strict_warning"
    else:
        severity = "fail"
    
    # Log violation to database
    log_violation(
        request.session_id, request.violation_count,
        request.violation_type, Config.DATABASE, severity
    )
    
    # Check if should disqualify (3 violations)
    if request.violation_count >= Config.MAX_VIOLATIONS:
        session["is_disqualified"] = True
        disqualify_interview(request.session_id, Config.DATABASE, f"proctoring_{request.violation_type}")
        return {
            "success": True,
            "is_disqualified": True,
            "severity": severity,
            "message": "Interview marked as FAILED due to proctoring violations. Interview will continue for data collection."
        }
    
    return {
        "success": True,
        "is_disqualified": False,
        "severity": severity,
        "violation_count": request.violation_count,
        "remaining_warnings": Config.MAX_VIOLATIONS - request.violation_count
    }


@app.get("/interview_status/{session_id}")
async def get_interview_status(session_id: int):
    """Get current interview status."""
    if session_id not in sessions:
        # Try to get from database
        interview = get_interview(session_id, Config.DATABASE)
        if not interview:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "success": True,
            "interview": interview,
            "from_database": True
        }
    
    session = sessions[session_id]
    return {
        "success": True,
        "current_index": session["current_index"],
        "total_questions": len(session["questions"]),
        "is_disqualified": session["is_disqualified"],
        "violation_count": session["violation_count"],
        "current_difficulty": session["current_difficulty"]
    }


# --------------------------------------------------------
# Admin API Endpoints (Protected)
# --------------------------------------------------------

@app.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    """Admin login endpoint."""
    if not verify_admin_credentials(request.username, request.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    token = create_admin_token(request.username)
    
    return {
        "success": True,
        "token": token,
        "username": request.username,
        "role": "admin"
    }


@app.get("/admin/candidates")
async def admin_list_candidates(admin: Dict = Depends(get_current_admin)):
    """Admin endpoint to list all candidates."""
    rows = list_candidates(Config.DATABASE)
    candidates = []
    for row in rows:
        candidates.append({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "role": row[3],
            "experience": row[4],
            "interview_id": row[5],
            "started_at": row[6],
            "status": row[7],
            "overall_score": row[8],
            "proctoring_status": row[9],
            "failure_reason": row[10]
        })
    return {"success": True, "candidates": candidates}


@app.get("/admin/interview/{interview_id}")
async def admin_get_interview_report(interview_id: int, admin: Dict = Depends(get_current_admin)):
    """Admin endpoint to get full interview report."""
    report = get_interview_full_report(interview_id, Config.DATABASE)
    
    if not report:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Format the report
    interview_data = report["interview"]
    
    formatted_report = {
        "interview_id": interview_data[0],
        "candidate": {
            "id": interview_data[1],
            "name": interview_data[11],
            "email": interview_data[12],
            "role": interview_data[13],
            "experience": interview_data[14]
        },
        "metadata": {
            "started_at": interview_data[2],
            "submitted_at": interview_data[3],
            "overall_score": interview_data[4],
            "status": interview_data[5],
            "initial_difficulty": interview_data[10],
            "final_difficulty": interview_data[11] if len(interview_data) > 11 else None,
            "proctoring_status": interview_data[12] if len(interview_data) > 12 else None,
            "failure_reason": interview_data[13] if len(interview_data) > 13 else None
        },
        "responses": [
            {
                "question_index": r[1],
                "category": r[2],
                "question": r[3],
                "answer": r[4],
                "score": r[5],
                "feedback": r[6],
                "difficulty": r[7],
                "quality": r[8],
                "timestamp": r[9]
            }
            for r in report["responses"]
        ],
        "violations": [
            {
                "count": v[2],
                "type": v[3],
                "severity": v[4],
                "timestamp": v[5]
            }
            for v in report["violations"]
        ],
        "competency_scores": [
            {
                "name": c[2],
                "score": c[3],
                "positive_indicators": c[4],
                "negative_indicators": c[5]
            }
            for c in report["competency_scores"]
        ],
        "skill_scores": [
            {
                "name": s[2],
                "type": s[3],
                "score": s[4],
                "questions_asked": s[5]
            }
            for s in report["skill_scores"]
        ]
    }
    
    return {
        "success": True,
        "report": formatted_report
    }


@app.get("/admin/download_report/{interview_id}")
async def admin_download_report(interview_id: int, format: str = "json", admin: Dict = Depends(get_current_admin)):
    """Admin endpoint to download interview report."""
    report_response = await admin_get_interview_report(interview_id, admin)
    report = report_response["report"]
    
    if format == "json":
        return JSONResponse(content=report)
    
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'json'")


# Run with: uvicorn main:app --reload --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
