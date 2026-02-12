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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db(Config.DATABASE)

# Store session data in memory
sessions: Dict[int, Dict[str, Any]] = {}

# Pydantic Models
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
    skill_type: str
    partial_input: Optional[str] = ""

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "AI Interview API v2.0 - Enhanced",
        "version": "2.0.0",
        "status": "running"
    }

@app.post("/generate_competencies")
async def generate_competencies(request: Dict[str, str]):
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

@app.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    if not verify_admin_credentials(request.username, request.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_admin_token(request.username)
    
    return {
        "success": True,
        "token": token,
        "username": request.username,
        "role": "admin"
    }

@app.get("/admin/candidates")
async def admin_list_candidates(admin: Dict = Depends(get_current_admin)):
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
            "proctoring_status": row[9] if len(row) > 9 else None,
            "failure_reason": row[10] if len(row) > 10 else None
        })
    return {"success": True, "candidates": candidates}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


@app.post("/start_interview")
async def start_interview(request: dict):
    """Start interview - handles both v1.0 (simple) and v2.0 (full) formats."""
    try:
        # Check if this is v1.0 format (no competencies field)
        if "competencies" not in request:
            # V1.0 format - auto-generate everything
            role = request.get("role", "General")
            experience = request.get("experience", "3")
            
            # Auto-generate competencies
            comp_data = generate_competencies_for_role(role)
            competencies_list = comp_data.get("competencies", [])[:3]
            
            if not competencies_list:
                competencies_list = [
                    {"name": "Communication", "positive_indicator": "Good", "negative_indicator": "Bad"},
                    {"name": "Problem Solving", "positive_indicator": "Good", "negative_indicator": "Bad"},
                    {"name": "Teamwork", "positive_indicator": "Good", "negative_indicator": "Bad"}
                ]
            
            # Auto-generate skills
            tech_skills = suggest_skills(role, "technical", "")[:5]
            if len(tech_skills) < 5:
                tech_skills = ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5"]
            
            func_skills = suggest_skills(role, "functional", "")[:5]
            if len(func_skills) < 5:
                func_skills = ["Communication", "Leadership", "Planning", "Analysis", "Teamwork"]
            
            responsibilities = [f"Perform {role} duties", "Collaborate with team"]
        else:
            # V2.0 format - use provided data
            competencies_list = request["competencies"]
            tech_skills = request["technical_skills"]
            func_skills = request["functional_skills"]
            responsibilities = request["responsibilities"]
            role = request.get("role", "General")
            experience = request.get("experience", "3")
            
            # Validate v2.0 format
            if len(tech_skills) != 5:
                raise HTTPException(status_code=400, detail="Exactly 5 technical skills required")
            if len(func_skills) != 5:
                raise HTTPException(status_code=400, detail="Exactly 5 functional skills required")
            if len(competencies_list) < 3:
                raise HTTPException(status_code=400, detail="At least 3 competencies required")
        
        # Calculate initial difficulty
        exp_years = int(experience) if experience.isdigit() else 3
        initial_difficulty = min(80, max(30, 40 + exp_years * 5))
        
        # Save candidate
        candidate_id = save_candidate(
            request.get("name", ""),
            request.get("email", ""),
            role,
            experience,
            request.get("hobbies", ""),
            request.get("resume_name"),
            Config.DATABASE
        )
        
        # Create interview
        interview_id = create_interview(
            candidate_id, Config.DATABASE,
            competencies=competencies_list,
            technical_skills=tech_skills,
            functional_skills=func_skills,
            responsibilities=responsibilities,
            initial_difficulty=initial_difficulty
        )
        
        # Generate questions
        questions = generate_adaptive_questions(
            role,
            experience,
            competencies_list,
            tech_skills,
            func_skills,
            responsibilities,
            initial_difficulty
        )
        
        # Store in session
        sessions[interview_id] = {
            "candidate_id": candidate_id,
            "questions": questions,
            "current_index": 0,
            "role": role,
            "experience": experience,
            "experience_years": exp_years,
            "competencies": competencies_list,
            "technical_skills": tech_skills,
            "functional_skills": func_skills,
            "responsibilities": responsibilities,
            "current_difficulty": initial_difficulty,
            "chat_history": [],
            "violation_count": 0,
            "is_disqualified": False,
            "competency_tracking": {c["name"]: {"scores": [], "count": 0} for c in competencies_list},
            "skill_tracking": {
                **{s: {"scores": [], "count": 0} for s in tech_skills},
                **{s: {"scores": [], "count": 0} for s in func_skills}
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
        print(f"Error in start_interview: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/questions/{session_id}")
async def get_current_question(session_id: int):
    """Get current question for the session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if session.get("is_disqualified", False):
        return {
            "success": False,
            "is_disqualified": True,
            "message": "Interview disqualified due to proctoring violations"
        }
    
    idx = session["current_index"]
    questions = session["questions"]
    
    if idx >= len(questions):
        # Interview complete
        avg_score = finalize_interview(session_id, Config.DATABASE)
        return {
            "success": True,
            "is_complete": True,
            "final_score": avg_score,
            "total_answered": idx
        }
    
    return {
        "success": True,
        "is_complete": False,
        "current_index": idx,
        "total_questions": len(questions),
        "question": questions[idx]
    }

@app.post("/submit_answer")
async def submit_answer(request: SubmitAnswerRequest):
    """Submit answer with evaluation."""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[request.session_id]
    
    idx = session["current_index"]
    questions = session["questions"]
    
    if idx >= len(questions):
        return {"success": False, "message": "No more questions"}
    
    current_q = questions[idx]
    
    try:
        # Evaluate answer
        evaluation = evaluate_answer_comprehensive(
            current_q["question"],
            request.answer_text,
            current_q.get("category", "General"),
            session["role"],
            session["experience"],
            session.get("current_difficulty", 50),
            current_q.get("source", "")
        )
        
        # Save response
        save_response(
            request.session_id, idx + 1, current_q.get("category"),
            current_q["question"], request.answer_text,
            evaluation.get("score"), evaluation.get("feedback"),
            Config.DATABASE, session.get("current_difficulty", 50), 
            evaluation.get("quality", "partial")
        )
        
        # Move to next question
        session["current_index"] += 1
        
        # Check if complete
        is_complete = session["current_index"] >= len(questions)
        final_score = None
        
        if is_complete:
            final_score = finalize_interview(request.session_id, Config.DATABASE)
        
        next_question = None
        if not is_complete and session["current_index"] < len(questions):
            next_question = questions[session["current_index"]]
        
        return {
            "success": True,
            "evaluation": evaluation,
            "is_complete": is_complete,
            "final_score": final_score,
            "next_question": next_question,
            "questions_answered": session["current_index"],
            "total_questions": len(questions)
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
        save_response(
            request.session_id, idx + 1, current_q.get("category"),
            current_q["question"], "", 0, "Skipped",
            Config.DATABASE, session.get("current_difficulty", 50), "weak"
        )
        session["current_index"] += 1
    
    is_complete = session["current_index"] >= len(questions)
    final_score = None
    if is_complete:
        final_score = finalize_interview(request.session_id, Config.DATABASE)
    
    return {
        "success": True,
        "is_complete": is_complete,
        "final_score": final_score,
        "current_index": session["current_index"]
    }

@app.post("/report_violation")
async def report_violation(request: ViolationRequest):
    """Report a proctoring violation."""
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
    
    # Log violation
    log_violation(
        request.session_id, request.violation_count,
        request.violation_type, Config.DATABASE, severity
    )
    
    # Check if should disqualify
    if request.violation_count >= 3:
        session["is_disqualified"] = True
        disqualify_interview(request.session_id, Config.DATABASE, f"proctoring_{request.violation_type}")
        return {
            "success": True,
            "is_disqualified": True,
            "severity": severity,
            "message": "Interview marked as FAILED due to proctoring violations."
        }
    
    return {
        "success": True,
        "is_disqualified": False,
        "severity": severity,
        "violation_count": request.violation_count,
        "remaining_warnings": 3 - request.violation_count
    }

@app.get("/interview_status/{session_id}")
async def get_interview_status(session_id: int):
    """Get current interview status."""
    if session_id not in sessions:
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
        "is_disqualified": session.get("is_disqualified", False),
        "violation_count": session.get("violation_count", 0)
    }


# Backward compatible model for old frontend
class StartInterviewRequestSimple(BaseModel):
    name: str
    email: str
    role: str
    experience: str
    hobbies: Optional[str] = ""
    resume_name: Optional[str] = None

# Override the start_interview endpoint to handle both old and new formats
@app.post("/start_interview_v1")
async def start_interview_v1(request: StartInterviewRequestSimple):
    """Backward compatible endpoint for v1.0 frontend."""
    try:
        # Auto-generate competencies
        comp_data = generate_competencies_for_role(request.role)
        competencies_list = comp_data.get("competencies", [])[:3]  # Take first 3
        
        # If no competencies generated, use defaults
        if not competencies_list:
            competencies_list = [
                {"name": "Communication", "positive_indicator": "Good", "negative_indicator": "Bad"},
                {"name": "Problem Solving", "positive_indicator": "Good", "negative_indicator": "Bad"},
                {"name": "Teamwork", "positive_indicator": "Good", "negative_indicator": "Bad"}
            ]
        
        # Auto-generate skills
        tech_skills = suggest_skills(request.role, "technical", "")[:5]
        if len(tech_skills) < 5:
            tech_skills = ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5"][:5]
        
        func_skills = suggest_skills(request.role, "functional", "")[:5]
        if len(func_skills) < 5:
            func_skills = ["Communication", "Leadership", "Planning", "Analysis", "Teamwork"][:5]
        
        responsibilities = [f"Perform {request.role} duties", "Collaborate with team"]
        
        # Calculate initial difficulty
        exp_years = int(request.experience) if request.experience.isdigit() else 3
        initial_difficulty = min(80, max(30, 40 + exp_years * 5))
        
        # Save candidate
        candidate_id = save_candidate(
            request.name, request.email, request.role, request.experience,
            request.hobbies, request.resume_name, Config.DATABASE
        )
        
        # Create interview
        interview_id = create_interview(
            candidate_id, Config.DATABASE,
            competencies=competencies_list,
            technical_skills=tech_skills,
            functional_skills=func_skills,
            responsibilities=responsibilities,
            initial_difficulty=initial_difficulty
        )
        
        # Generate questions
        questions = generate_adaptive_questions(
            request.role,
            request.experience,
            competencies_list,
            tech_skills,
            func_skills,
            responsibilities,
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
            "technical_skills": tech_skills,
            "functional_skills": func_skills,
            "responsibilities": responsibilities,
            "current_difficulty": initial_difficulty,
            "chat_history": [],
            "violation_count": 0,
            "is_disqualified": False,
            "competency_tracking": {c["name"]: {"scores": [], "count": 0} for c in competencies_list},
            "skill_tracking": {
                **{s: {"scores": [], "count": 0} for s in tech_skills},
                **{s: {"scores": [], "count": 0} for s in func_skills}
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
        print(f"Error in start_interview_v1: {e}")
        raise HTTPException(status_code=500, detail=str(e))
