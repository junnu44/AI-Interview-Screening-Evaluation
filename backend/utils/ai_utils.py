import json
import re
from typing import List, Dict, Any, Optional
from openai import OpenAI
from config import Config

# Initialize Grok (xAI) client using OpenAI SDK
client = None

def _ensure_client():
    """Ensure AI client is configured and returns the client."""
    global client
    if client is None:
        if not Config.XAI_API_KEY:
            raise RuntimeError("❌ XAI_API_KEY missing. Please set it in .env file.")
        client = OpenAI(
            api_key=Config.XAI_API_KEY,
            base_url=Config.XAI_BASE_URL
        )
    return client


def _extract_json(text: str):
    """Extract JSON payload from messy LLM responses."""
    try:
        # Try to find JSON in the text
        match = re.search(r"\{.*\}|\[.*\]", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except:
        return None


# --------------------------------------------------------
# GROK BASIC TEXT CALL
# --------------------------------------------------------
def call_grok_text(prompt: str, system_prompt: str = None, temperature: float = 0.7) -> str:
    """Call AI API and return text response."""
    ai_client = _ensure_client()
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    response = ai_client.chat.completions.create(
        model=Config.XAI_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=2048
    )
    
    return response.choices[0].message.content.strip()


# --------------------------------------------------------
# STEP 1: ROLE → COMPETENCIES GENERATION
# --------------------------------------------------------
def generate_competencies_for_role(role: str) -> Dict[str, Any]:
    """Generate dynamic competencies based on role with behavioral indicators."""
    system_prompt = """You are an expert HR consultant specializing in competency frameworks.
Generate role-appropriate competencies with behavioral indicators."""
    
    prompt = f"""Generate competencies for the role: "{role}"

Requirements:
1. Generate 3-7 competencies (number depends on role complexity)
2. Each competency must have:
   - name: Clear competency name
   - positive_indicator: ONE sentence describing positive behavior
   - negative_indicator: ONE sentence describing negative behavior

Return ONLY valid JSON in this exact format:
{{
  "role": "{role}",
  "competencies": [
    {{
      "name": "Competency Name",
      "positive_indicator": "Single sentence positive behavior",
      "negative_indicator": "Single sentence negative behavior"
    }}
  ]
}}"""

    try:
        raw = call_grok_text(prompt, system_prompt, temperature=0.5)
        data = _extract_json(raw)
        
        if data and "competencies" in data:
            # Validate structure
            for comp in data["competencies"]:
                if not all(k in comp for k in ["name", "positive_indicator", "negative_indicator"]):
                    raise ValueError("Invalid competency structure")
            return data
        
        # Fallback
        return generate_fallback_competencies(role)
    
    except Exception as e:
        print(f"Error generating competencies: {e}")
        return generate_fallback_competencies(role)


def generate_fallback_competencies(role: str) -> Dict[str, Any]:
    """Fallback competencies if AI generation fails."""
    return {
        "role": role,
        "competencies": [
            {
                "name": "Communication",
                "positive_indicator": "Articulates ideas clearly and listens actively to others",
                "negative_indicator": "Struggles to express thoughts or interrupts others frequently"
            },
            {
                "name": "Problem Solving",
                "positive_indicator": "Approaches challenges systematically and finds creative solutions",
                "negative_indicator": "Gets overwhelmed by problems or gives up easily"
            },
            {
                "name": "Teamwork",
                "positive_indicator": "Collaborates effectively and supports team members",
                "negative_indicator": "Works in isolation or creates conflicts within the team"
            },
            {
                "name": "Adaptability",
                "positive_indicator": "Embraces change and learns quickly in new situations",
                "negative_indicator": "Resists change or struggles with unfamiliar tasks"
            }
        ]
    }


# --------------------------------------------------------
# STEP 2: AI-POWERED SKILL SUGGESTIONS
# --------------------------------------------------------
def suggest_skills(role: str, skill_type: str, partial_input: str = "") -> List[str]:
    """Suggest skills based on role and partial input.
    
    Args:
        role: Job role
        skill_type: 'technical' or 'functional'
        partial_input: Partial skill name typed by user
    
    Returns:
        List of suggested skills
    """
    system_prompt = f"""You are a skill recommendation expert.
Suggest relevant {skill_type} skills for the given role."""
    
    prompt = f"""Role: {role}
Skill Type: {skill_type}
Partial Input: "{partial_input}"

Suggest 5-10 relevant {skill_type} skills.
If partial input is provided, prioritize skills matching that input.

Return ONLY valid JSON array:
["skill1", "skill2", "skill3", ...]"""

    try:
        raw = call_grok_text(prompt, system_prompt, temperature=0.3)
        data = _extract_json(raw)
        
        if isinstance(data, list):
            return data[:10]  # Limit to 10 suggestions
        
        return []
    
    except Exception as e:
        print(f"Error suggesting skills: {e}")
        return []


# --------------------------------------------------------
# STEP 4: ADAPTIVE QUESTION GENERATION
# --------------------------------------------------------
def generate_adaptive_questions(
    role: str,
    experience: str,
    competencies: List[Dict],
    technical_skills: List[str],
    functional_skills: List[str],
    responsibilities: List[str],
    initial_difficulty: int = 50
) -> List[Dict[str, Any]]:
    """Generate initial set of adaptive questions based on all inputs."""
    
    # Calculate question count based on experience
    exp_years = int(experience) if experience.isdigit() else 3
    question_count = min(Config.MAX_QUESTIONS, max(Config.MIN_QUESTIONS, 5 + exp_years * 2))
    
    system_prompt = """You are an expert interview question generator.
Create diverse, role-appropriate questions that assess competencies, skills, and experience."""
    
    prompt = f"""Generate {question_count} interview questions for:

Role: {role}
Experience: {experience} years
Initial Difficulty: {initial_difficulty}/100

Competencies to assess:
{json.dumps([c['name'] for c in competencies], indent=2)}

Technical Skills:
{json.dumps(technical_skills, indent=2)}

Functional Skills:
{json.dumps(functional_skills, indent=2)}

Responsibilities:
{json.dumps(responsibilities, indent=2)}

Requirements:
1. Mix questions across competencies, skills, and responsibilities
2. Start at difficulty level {initial_difficulty}
3. Include behavioral, technical, and scenario-based questions
4. Questions should be appropriate for {experience} years experience

Return ONLY valid JSON array:
[
  {{
    "category": "Competency|Technical|Functional|Responsibility",
    "question": "Question text",
    "difficulty": 50,
    "source": "specific competency/skill/responsibility name"
  }}
]"""

    try:
        raw = call_grok_text(prompt, system_prompt, temperature=0.7)
        data = _extract_json(raw)
        
        if isinstance(data, list) and len(data) > 0:
            # Ensure all questions have required fields
            questions = []
            for q in data:
                if "question" in q:
                    questions.append({
                        "category": q.get("category", "General"),
                        "question": q["question"],
                        "difficulty": q.get("difficulty", initial_difficulty),
                        "source": q.get("source", "")
                    })
            return questions[:question_count]
        
        return generate_fallback_questions(role, experience, question_count, initial_difficulty)
    
    except Exception as e:
        print(f"Error generating questions: {e}")
        return generate_fallback_questions(role, experience, question_count, initial_difficulty)


def generate_fallback_questions(role: str, experience: str, count: int, difficulty: int) -> List[Dict]:
    """Fallback questions if AI generation fails."""
    categories = ["Behavioral", "Technical", "Problem-Solving", "Decision-Making"]
    questions = []
    
    for i in range(count):
        cat = categories[i % len(categories)]
        questions.append({
            "category": cat,
            "question": f"{cat} question {i+1} for {role} with {experience} years experience",
            "difficulty": difficulty,
            "source": cat
        })
    
    return questions


# --------------------------------------------------------
# STEP 6: ANSWER EVALUATION WITH QUALITY CLASSIFICATION
# --------------------------------------------------------
def evaluate_answer_comprehensive(
    question: str,
    answer: str,
    category: str,
    role: str,
    experience: str,
    difficulty: int,
    source: str = ""
) -> Dict[str, Any]:
    """Comprehensive answer evaluation with quality classification."""
    
    system_prompt = """You are an expert interview evaluator.
Assess answers based on correctness, depth, relevance, and confidence."""
    
    prompt = f"""Evaluate this interview answer:

QUESTION: {question}
ANSWER: {answer}
CATEGORY: {category}
SOURCE: {source}
ROLE: {role}
EXPERIENCE: {experience} years
DIFFICULTY: {difficulty}/100

Provide evaluation in JSON format:
{{
  "score": <0-100>,
  "feedback": "one concise sentence",
  "quality": "strong|partial|weak",
  "correctness": <0-100>,
  "depth": <0-100>,
  "relevance": <0-100>,
  "confidence": <0-100>
}}

Quality classification:
- strong: Comprehensive, accurate, confident answer
- partial: Correct but incomplete or lacking depth
- weak: Incorrect, vague, or shows lack of understanding"""

    try:
        raw = call_grok_text(prompt, system_prompt, temperature=0.3)
        data = _extract_json(raw)
        
        if data and "score" in data:
            # Ensure score is valid
            score = max(0, min(100, int(data.get("score", 0))))
            quality = data.get("quality", "partial").lower()
            
            # Validate quality
            if quality not in ["strong", "partial", "weak"]:
                quality = "partial"
            
            return {
                "score": score,
                "feedback": data.get("feedback", "").strip(),
                "quality": quality,
                "correctness": max(0, min(100, int(data.get("correctness", score)))),
                "depth": max(0, min(100, int(data.get("depth", score)))),
                "relevance": max(0, min(100, int(data.get("relevance", score)))),
                "confidence": max(0, min(100, int(data.get("confidence", score))))
            }
        
        # Fallback evaluation
        return fallback_evaluation(answer)
    
    except Exception as e:
        print(f"Error evaluating answer: {e}")
        return fallback_evaluation(answer)


def fallback_evaluation(answer: str) -> Dict[str, Any]:
    """Fallback evaluation based on answer length."""
    score = min(95, max(35, len(answer) // 3))
    
    if score >= 70:
        quality = "strong"
    elif score >= 50:
        quality = "partial"
    else:
        quality = "weak"
    
    return {
        "score": score,
        "feedback": "Fallback evaluation based on answer length",
        "quality": quality,
        "correctness": score,
        "depth": score,
        "relevance": score,
        "confidence": score
    }


# --------------------------------------------------------
# ADAPTIVE DIFFICULTY ADJUSTMENT
# --------------------------------------------------------
def calculate_next_difficulty(
    current_difficulty: int,
    answer_quality: str,
    experience_years: int
) -> int:
    """Calculate next question difficulty based on answer quality.
    
    Args:
        current_difficulty: Current difficulty level (0-100)
        answer_quality: 'strong', 'partial', or 'weak'
        experience_years: Candidate's years of experience
    
    Returns:
        New difficulty level bounded by experience
    """
    # Calculate experience-based bounds
    min_difficulty = max(20, experience_years * 5)
    max_difficulty = min(100, 40 + experience_years * 10)
    
    # Adjust difficulty based on answer quality
    if answer_quality == "strong":
        new_difficulty = current_difficulty + Config.DIFFICULTY_ADJUSTMENT
    elif answer_quality == "weak":
        new_difficulty = current_difficulty - Config.DIFFICULTY_ADJUSTMENT
    else:  # partial
        new_difficulty = current_difficulty
    
    # Bound by experience limits
    new_difficulty = max(min_difficulty, min(max_difficulty, new_difficulty))
    
    return new_difficulty


# --------------------------------------------------------
# ADAPTIVE FOLLOW-UP QUESTION
# --------------------------------------------------------
def generate_adaptive_followup(
    prev_question: str,
    prev_answer: str,
    answer_quality: str,
    category: str,
    role: str,
    experience: str,
    new_difficulty: int,
    source: str = ""
) -> Optional[Dict[str, Any]]:
    """Generate adaptive follow-up question based on previous answer."""
    
    system_prompt = """You are an adaptive interviewer.
Generate follow-up questions that probe deeper or adjust difficulty based on previous answers."""
    
    prompt = f"""Generate a follow-up question:

PREVIOUS QUESTION: {prev_question}
PREVIOUS ANSWER: {prev_answer}
ANSWER QUALITY: {answer_quality}
CATEGORY: {category}
SOURCE: {source}
ROLE: {role}
EXPERIENCE: {experience} years
TARGET DIFFICULTY: {new_difficulty}/100

Generate a follow-up question that:
- If answer was strong: Increases depth/complexity
- If answer was weak: Simplifies or explores basics
- If answer was partial: Clarifies or expands on the topic

Return JSON:
{{
  "question": "Follow-up question text",
  "category": "{category}",
  "difficulty": {new_difficulty},
  "source": "{source}"
}}"""

    try:
        raw = call_grok_text(prompt, system_prompt, temperature=0.7)
        data = _extract_json(raw)
        
        if data and "question" in data:
            return {
                "question": data["question"],
                "category": data.get("category", category),
                "difficulty": data.get("difficulty", new_difficulty),
                "source": data.get("source", source)
            }
        
        return None
    
    except Exception as e:
        print(f"Error generating follow-up: {e}")
        return None


# --------------------------------------------------------
# LEGACY FUNCTIONS (for backward compatibility)
# --------------------------------------------------------
def get_ai_response(text: str, context: str = None) -> str:
    """Get AI interviewer response for user input."""
    system_prompt = """You are an expert AI interviewer conducting a professional job interview. 
    Respond naturally and professionally to the candidate's answers.
    Provide brief, encouraging feedback when appropriate.
    Keep responses concise (1-2 sentences)."""
    
    prompt = text
    if context:
        prompt = f"Context: {context}\n\nCandidate's response: {text}"
    
    return call_grok_text(prompt, system_prompt)


def generate_questions_for_role(role: str, experience: str) -> List[Dict[str, str]]:
    """Legacy function - generates basic questions."""
    exp_years = int(experience) if experience.isdigit() else 3
    count = min(20, max(10, 5 + exp_years * 2))
    
    return generate_fallback_questions(role, experience, count, 50)


def generate_adaptive_question(prev_q: str, prev_a: str, category: str, role: str, experience: str) -> str:
    """Legacy function - generates follow-up question."""
    result = generate_adaptive_followup(prev_q, prev_a, "partial", category, role, experience, 50)
    return result["question"] if result else ""


def evaluate_answer_ai(question: str, answer: str, category: str, role: str, experience: str) -> Dict[str, Any]:
    """Legacy function - basic evaluation."""
    result = evaluate_answer_comprehensive(question, answer, category, role, experience, 50)
    return {
        "score": result["score"],
        "feedback": result["feedback"]
    }
