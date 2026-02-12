import sqlite3
import os
import datetime
import json
from typing import Tuple, List, Any, Optional, Dict

# -------------------------------------------------------------
# Initialize DB with Enhanced Schema
# -------------------------------------------------------------
def init_db(db_path: str):
    """Initialize database with required tables."""
    folder = os.path.dirname(db_path)
    if folder:
        os.makedirs(folder, exist_ok=True)

    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()

        # Candidates table
        c.execute("""
        CREATE TABLE IF NOT EXISTS candidates(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            email TEXT,
            role TEXT,
            experience TEXT,
            hobbies TEXT,
            resume_name TEXT,
            created_at TEXT
        )
        """)

        # Interviews table with enhanced fields
        c.execute("""
        CREATE TABLE IF NOT EXISTS interviews(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER,
            started_at TEXT,
            submitted_at TEXT,
            overall_score REAL,
            status TEXT,
            competencies_json TEXT,
            technical_skills_json TEXT,
            functional_skills_json TEXT,
            responsibilities_json TEXT,
            initial_difficulty INTEGER,
            final_difficulty INTEGER,
            proctoring_status TEXT,
            failure_reason TEXT
        )
        """)

        # Responses table with difficulty tracking
        c.execute("""
        CREATE TABLE IF NOT EXISTS responses(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER,
            question_index INTEGER,
            category TEXT,
            question_text TEXT,
            transcript TEXT,
            ai_score REAL,
            ai_feedback TEXT,
            difficulty_level INTEGER,
            answer_quality TEXT,
            created_at TEXT
        )
        """)

        # Violations table with enhanced tracking
        c.execute("""
        CREATE TABLE IF NOT EXISTS violations(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER,
            violation_count INTEGER,
            violation_type TEXT,
            severity TEXT,
            created_at TEXT
        )
        """)

        # Competency scores table
        c.execute("""
        CREATE TABLE IF NOT EXISTS competency_scores(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER,
            competency_name TEXT,
            score REAL,
            positive_indicators INTEGER,
            negative_indicators INTEGER
        )
        """)

        # Skill scores table
        c.execute("""
        CREATE TABLE IF NOT EXISTS skill_scores(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER,
            skill_name TEXT,
            skill_type TEXT,
            score REAL,
            questions_asked INTEGER
        )
        """)

        conn.commit()


# -------------------------------------------------------------
# Candidate Operations
# -------------------------------------------------------------
def save_candidate(full_name: str, email: str, role: str, experience: str, 
                   hobbies: str, resume_name: str, db_path: str) -> int:
    """Save candidate and return candidate ID."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO candidates(full_name,email,role,experience,hobbies,resume_name,created_at)
            VALUES(?,?,?,?,?,?,?)
        """, (
            full_name, email, role, experience, hobbies,
            resume_name, datetime.datetime.utcnow().isoformat()
        ))
        cid = c.lastrowid
        conn.commit()
        return cid


# -------------------------------------------------------------
# Interview Operations
# -------------------------------------------------------------
def create_interview(candidate_id: int, db_path: str, competencies: List[Dict] = None,
                    technical_skills: List[str] = None, functional_skills: List[str] = None,
                    responsibilities: List[str] = None, initial_difficulty: int = 50) -> int:
    """Create interview session with enhanced metadata."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO interviews(
                candidate_id, started_at, status, competencies_json,
                technical_skills_json, functional_skills_json, responsibilities_json,
                initial_difficulty, proctoring_status
            )
            VALUES(?,?,?,?,?,?,?,?,?)
        """, (
            candidate_id,
            datetime.datetime.utcnow().isoformat(),
            "IN_PROGRESS",
            json.dumps(competencies or []),
            json.dumps(technical_skills or []),
            json.dumps(functional_skills or []),
            json.dumps(responsibilities or []),
            initial_difficulty,
            "ACTIVE"
        ))
        iid = c.lastrowid
        conn.commit()
        return iid


def update_interview_difficulty(interview_id: int, final_difficulty: int, db_path: str):
    """Update final difficulty level."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            UPDATE interviews SET final_difficulty = ? WHERE id = ?
        """, (final_difficulty, interview_id))
        conn.commit()


# -------------------------------------------------------------
# Response Operations
# -------------------------------------------------------------
def save_response(interview_id: int, question_index: int, category: str, 
                  question_text: str, transcript: str, score: float, 
                  feedback: str, db_path: str, difficulty_level: int = 50,
                  answer_quality: str = "partial"):
    """Save interview response with difficulty tracking."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO responses(
                interview_id, question_index, category, question_text,
                transcript, ai_score, ai_feedback, difficulty_level,
                answer_quality, created_at
            )
            VALUES(?,?,?,?,?,?,?,?,?,?)
        """, (
            interview_id, question_index, category, question_text,
            transcript, score, feedback, difficulty_level,
            answer_quality,
            datetime.datetime.utcnow().isoformat()
        ))
        conn.commit()


# -------------------------------------------------------------
# Violation Operations
# -------------------------------------------------------------
def log_violation(interview_id: int, violation_count: int, 
                  violation_type: str, db_path: str, severity: str = "warning"):
    """Log a proctoring violation with severity."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO violations(interview_id, violation_count, violation_type, severity, created_at)
            VALUES(?,?,?,?,?)
        """, (
            interview_id, violation_count, violation_type, severity,
            datetime.datetime.utcnow().isoformat()
        ))
        conn.commit()


def disqualify_interview(interview_id: int, db_path: str, reason: str = "proctoring_violations"):
    """Mark interview as disqualified with reason."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            UPDATE interviews
            SET status = 'DISQUALIFIED', submitted_at = ?, proctoring_status = 'FAILED', failure_reason = ?
            WHERE id = ?
        """, (
            datetime.datetime.utcnow().isoformat(),
            reason,
            interview_id
        ))
        conn.commit()


# -------------------------------------------------------------
# Competency & Skill Scoring
# -------------------------------------------------------------
def save_competency_score(interview_id: int, competency_name: str, score: float,
                         positive_indicators: int, negative_indicators: int, db_path: str):
    """Save competency evaluation score."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO competency_scores(interview_id, competency_name, score, positive_indicators, negative_indicators)
            VALUES(?,?,?,?,?)
        """, (interview_id, competency_name, score, positive_indicators, negative_indicators))
        conn.commit()


def save_skill_score(interview_id: int, skill_name: str, skill_type: str,
                    score: float, questions_asked: int, db_path: str):
    """Save skill evaluation score."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO skill_scores(interview_id, skill_name, skill_type, score, questions_asked)
            VALUES(?,?,?,?,?)
        """, (interview_id, skill_name, skill_type, score, questions_asked))
        conn.commit()


# -------------------------------------------------------------
# Admin Query Operations
# -------------------------------------------------------------
def list_candidates(db_path: str) -> List[tuple]:
    """List all candidates with interview info."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            SELECT
                c.id,
                c.full_name,
                c.email,
                c.role,
                c.experience,
                i.id AS interview_id,
                i.started_at,
                i.status,
                i.overall_score,
                i.proctoring_status,
                i.failure_reason
            FROM candidates c
            LEFT JOIN interviews i ON i.candidate_id = c.id
            ORDER BY c.id DESC
        """)
        rows = c.fetchall()
        return rows


def get_candidate_details(candidate_id: int, db_path: str) -> Tuple[Optional[tuple], List[tuple]]:
    """Get candidate info and all their responses."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()

        c.execute("SELECT * FROM candidates WHERE id=?", (candidate_id,))
        cand = c.fetchone()

        if not cand:
            return None, []

        c.execute("SELECT id FROM interviews WHERE candidate_id=?", (candidate_id,))
        row = c.fetchone()
        if not row:
            return cand, []

        interview_id = row[0]

        c.execute("""
            SELECT
                question_index,
                category,
                question_text,
                transcript,
                ai_score,
                ai_feedback,
                difficulty_level,
                answer_quality,
                created_at
            FROM responses
            WHERE interview_id=?
            ORDER BY question_index
        """, (interview_id,))
        responses = c.fetchall()

        return cand, responses


def get_interview_full_report(interview_id: int, db_path: str) -> Optional[Dict]:
    """Get complete interview report with all details."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        
        # Get interview details
        c.execute("""
            SELECT i.*, c.full_name, c.email, c.role, c.experience
            FROM interviews i
            JOIN candidates c ON c.id = i.candidate_id
            WHERE i.id = ?
        """, (interview_id,))
        interview_row = c.fetchone()
        
        if not interview_row:
            return None
        
        # Get responses
        c.execute("""
            SELECT * FROM responses WHERE interview_id = ? ORDER BY question_index
        """, (interview_id,))
        responses = c.fetchall()
        
        # Get violations
        c.execute("""
            SELECT * FROM violations WHERE interview_id = ? ORDER BY created_at
        """, (interview_id,))
        violations = c.fetchall()
        
        # Get competency scores
        c.execute("""
            SELECT * FROM competency_scores WHERE interview_id = ?
        """, (interview_id,))
        competency_scores = c.fetchall()
        
        # Get skill scores
        c.execute("""
            SELECT * FROM skill_scores WHERE interview_id = ?
        """, (interview_id,))
        skill_scores = c.fetchall()
        
        return {
            "interview": interview_row,
            "responses": responses,
            "violations": violations,
            "competency_scores": competency_scores,
            "skill_scores": skill_scores
        }


# -------------------------------------------------------------
# Interview Finalization
# -------------------------------------------------------------
def finalize_interview(interview_id: int, db_path: str) -> float:
    """Finalize interview and compute average score."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()

        c.execute("SELECT avg(ai_score) FROM responses WHERE interview_id=?", (interview_id,))
        avg_score = c.fetchone()[0] or 0

        c.execute("""
            UPDATE interviews
            SET submitted_at = ?, overall_score = ?, status = 'COMPLETED'
            WHERE id = ?
        """, (
            datetime.datetime.utcnow().isoformat(),
            avg_score,
            interview_id
        ))

        conn.commit()
        return float(avg_score)


# -------------------------------------------------------------
# Utility Functions
# -------------------------------------------------------------
def get_interview(interview_id: int, db_path: str) -> Optional[dict]:
    """Get interview details by ID."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            SELECT * FROM interviews WHERE id=?
        """, (interview_id,))
        row = c.fetchone()
        if row:
            return {
                "id": row[0],
                "candidate_id": row[1],
                "started_at": row[2],
                "submitted_at": row[3],
                "overall_score": row[4],
                "status": row[5],
                "competencies": json.loads(row[6] or "[]"),
                "technical_skills": json.loads(row[7] or "[]"),
                "functional_skills": json.loads(row[8] or "[]"),
                "responsibilities": json.loads(row[9] or "[]"),
                "initial_difficulty": row[10],
                "final_difficulty": row[11],
                "proctoring_status": row[12],
                "failure_reason": row[13]
            }
        return None


def get_response_count(interview_id: int, db_path: str) -> int:
    """Get number of responses for an interview."""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM responses WHERE interview_id=?", (interview_id,))
        return c.fetchone()[0]
