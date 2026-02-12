# app.py
import streamlit as st
import pandas as pd
from config import Config
from utils.db_ops import (
    init_db, save_candidate, create_interview, save_response,
    list_candidates, get_candidate_details, finalize_interview
)
from utils.ai_utils import (
    transcribe_audio_wav, generate_questions_for_role,
    evaluate_answer_ai, generate_adaptive_question
)
from streamlit_mic_recorder import mic_recorder

# -----------------------------------------------------------
# STREAMLIT PAGE CONFIG + THEME CSS
# -----------------------------------------------------------
st.set_page_config(
    page_title="AI Interview System",
    layout="wide",
    page_icon="🤖"
)

st.markdown("""
<style>
.block-container { padding-top: 1.2rem; padding-bottom: 1.2rem; }
h1, h2, h3 { letter-spacing: 0.2px; }
.badge { display:inline-block; padding:6px 12px; border-radius:999px; font-weight:700; font-size:0.82rem; color:#fff; }
.badge-role { background: #2563eb; }
.badge-exp { background: #059669; margin-left:8px; }
.badge-cat { background: #6b7280; }
.question-box { background:#0f172a; color:#fff; border:1px solid #334155; padding:18px; border-radius:12px; }
.score-box { background:linear-gradient(135deg,#1e3a8a,#0ea5e9); color:#fff; padding:22px; border-radius:12px; text-align:center; }
.btn-row .stButton>button { border-radius:10px; padding:10px 14px; font-weight:700; }
.small-note { color:#64748b; font-size:0.85rem; }
hr { border: none; height: 1px; background: #e2e8f0; margin: 10px 0 16px; }
.sidebar-card { background:#0b1220; color:#e5e7eb; padding:14px; border-radius:12px; border:1px solid #1f2937; }
.sidebar-card h4 { margin: 0 0 8px 0; }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------
# DB INIT
# -----------------------------------------------------------
init_db(Config.DATABASE)

# -----------------------------------------------------------
# SESSION STATE
# -----------------------------------------------------------
defaults = {
    "candidate_id": None,
    "interview_id": None,
    "questions": [],
    "q_index": 0,
    "role": "",
    "experience": "",
    "started": False,
    "admin_ok": False,
    "section": "candidate",      # 'candidate' | 'interview'
    "_switch_js": False          # trigger JS tab switch once
}
for k, v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

def go(section_name: str):
    """Lightweight navigator + trigger a one-time JS tab click."""
    st.session_state.section = section_name
    st.session_state._switch_js = True

# -----------------------------------------------------------
# Helper: TTS (browser native)
# -----------------------------------------------------------
def tts(text: str):
    if not text:
        return
    st.components.v1.html(
        f"""
        <script>
            const msg = new SpeechSynthesisUtterance({text!r});
            msg.rate = 1;
            speechSynthesis.cancel();
            speechSynthesis.speak(msg);
        </script>
        """,
        height=0
    )

# -----------------------------------------------------------
# Helper: auto-click a tab (JS) — 0=candidate, 1=interview
# -----------------------------------------------------------
def click_tab(index_zero_based: int):
    st.components.v1.html(
        f"""
        <script>
        const trySwitch = () => {{
          const tabs = Array.from(parent.document.querySelectorAll('button[role="tab"]'));
          if (tabs && tabs[{index_zero_based}]) {{
            tabs[{index_zero_based}].click();
          }} else {{
            setTimeout(trySwitch, 150);
          }}
        }};
        setTimeout(trySwitch, 150);
        </script>
        """,
        height=0
    )

# -----------------------------------------------------------
# SIDEBAR — ADMIN PANEL (no tab)
# -----------------------------------------------------------
with st.sidebar:
    st.markdown("<div class='sidebar-card'><h4>🔐 Admin</h4>", unsafe_allow_html=True)
    if not st.session_state.admin_ok:
        u = st.text_input("Username", key="admin_user")
        p = st.text_input("Password", type="password", key="admin_pass")
        if st.button("Login", use_container_width=True):
            if u == Config.ADMIN_USER and p == Config.ADMIN_PASS:
                st.session_state.admin_ok = True
                st.success("Logged in")
                st.rerun()
            else:
                st.error("Invalid credentials")
    else:
        st.success("Logged in")
        rows = list_candidates(Config.DATABASE)
        if rows:
            df = pd.DataFrame(rows, columns=[
                "cand_id","name","email","role","interview_id","started_at","status","overall_score"
            ])
            st.dataframe(df, use_container_width=True, height=240)
            if df["overall_score"].notna().sum() > 0:
                st.caption("Scores")
                st.bar_chart(df.set_index("name")["overall_score"])
            sel = st.number_input("Open candidate id", min_value=1, step=1, key="admin_sel_id")
            if st.button("Open details", use_container_width=True):
                cand, responses = get_candidate_details(int(sel), Config.DATABASE)
                if not cand:
                    st.warning("Candidate not found")
                else:
                    st.write("**Candidate**")
                    st.write({
                        "id": cand[0], "full_name": cand[1], "email": cand[2],
                        "role": cand[3], "experience": cand[4], "hobbies": cand[5],
                        "resume_name": cand[6], "created_at": cand[7]
                    })
                    st.write("**Responses**")
                    if responses:
                        rdf = pd.DataFrame(responses, columns=[
                            "Q#", "Category", "Question", "Answer", "Score", "Feedback", "Created At"
                        ])
                        st.dataframe(rdf, use_container_width=True, height=260)
                    else:
                        st.info("No responses yet.")
        else:
            st.info("No candidates yet.")
    st.markdown("</div>", unsafe_allow_html=True)

# -----------------------------------------------------------
# PAGE TITLE + NAV TABS (ONLY TWO TABS NOW)
# -----------------------------------------------------------
st.title("🤖 AI Interview Screening & Evaluation")
tabs = st.tabs(["🧑 Candidate", "🎤 Interview"])

# If we marked a switch, perform it now (0=candidate,1=interview)
if st.session_state._switch_js:
    st.session_state._switch_js = False
    click_tab(1 if st.session_state.section == "interview" else 0)

# -----------------------------------------------------------
# TAB 1 — Candidate
# -----------------------------------------------------------
with tabs[0]:
    st.subheader("Candidate Details")

    with st.form("candidate_form", clear_on_submit=False):
        c1, c2 = st.columns(2)
        full_name = c1.text_input("Full Name")
        email     = c2.text_input("Email")

        c3, c4 = st.columns(2)
        role        = c3.text_input("Role Applied For")
        experience  = c4.text_input("Years of Experience")

        hobbies = st.text_input("Hobbies (Optional)")
        resume  = st.file_uploader("Upload Resume (PDF) — optional", type=["pdf"])

        st.markdown("<span class='small-note'>We’ll store your details locally for this session.</span>", unsafe_allow_html=True)
        submitted = st.form_submit_button("🚀 Start Interview")

    if submitted:
        resume_name = resume.name if resume else None

        # Persist candidate + create interview
        cid = save_candidate(
            full_name, email, role, experience, hobbies,
            resume_name, Config.DATABASE
        )
        iid = create_interview(cid, Config.DATABASE)

        # Keep session
        st.session_state.candidate_id = cid
        st.session_state.interview_id = iid
        st.session_state.role = role or "General"
        st.session_state.experience = experience or "0"

        # Fetch questions (AI or fallback) and limit to 20
        qs = generate_questions_for_role(st.session_state.role, st.session_state.experience)
        st.session_state.questions = qs[:20] if isinstance(qs, list) else []
        st.session_state.q_index = 0
        st.session_state.started = True

        st.success("✅ Interview created! Taking you to the Interview…")
        go("interview")
        st.rerun()

# -----------------------------------------------------------
# TAB 2 — Interview
# -----------------------------------------------------------
with tabs[1]:
    st.subheader("Interview")

    if not st.session_state.started or not st.session_state.interview_id:
        st.info("Please fill candidate details in the **Candidate** tab first.")
    else:
        # Header chips
        st.markdown(
            f"<span class='badge badge-role'>{st.session_state.role or 'General'}</span>"
            f"<span class='badge badge-exp'>Exp: {st.session_state.experience or '0'} yrs</span>",
            unsafe_allow_html=True
        )

        q_idx = st.session_state.q_index
        questions = st.session_state.questions
        total_qs = len(questions)

        # Progress
        pct = 0.0 if total_qs == 0 else q_idx / max(1, total_qs)
        st.progress(pct, text=f"{q_idx}/{total_qs} answered")

        # Finished?
        if q_idx >= total_qs or q_idx >= 20:
            avg = finalize_interview(st.session_state.interview_id, Config.DATABASE)
            st.success("✅ Interview completed!")
            st.markdown(
                f"<div class='score-box'><h2>Final Score: {avg:.1f} / 100</h2>"
                f"<div class='small-note'>You can review answers from the Admin panel in the sidebar.</div></div>",
                unsafe_allow_html=True
            )
        else:
            q = questions[q_idx] if total_qs else {"category":"", "question":"(No questions loaded)"}

            # Category + Question
            st.markdown(
                f"<span class='badge badge-cat'>{q.get('category','General')}</span>",
                unsafe_allow_html=True
            )
            st.markdown(
                f"<div class='question-box'><h3>{q.get('question','')}</h3></div>",
                unsafe_allow_html=True
            )

            # Auto TTS
            tts(q.get("question", ""))

            # Answer controls
            st.caption("Answer by voice or type below.")
            wav_audio = mic_recorder(
                start_prompt="🎤 Start Recording",
                stop_prompt="⏹ Stop",
                just_once=False,
                use_container_width=True
            )
            transcript = st.text_area("Or type your answer:", key=f"typed_{q_idx}", height=120)

            colA, colB, colC = st.columns([1, 1, 1])

            # Skip
            with colA:
                if st.button("⏭ Skip", use_container_width=True):
                    save_response(
                        st.session_state.interview_id, q_idx + 1, q.get("category"),
                        q.get("question"), "", 0, "Skipped", Config.DATABASE
                    )
                    st.session_state.q_index += 1
                    go("interview")
                    st.rerun()

            # Submit
            with colB:
                if st.button("✅ Submit", use_container_width=True):
                    final_text = (transcript or "").strip()

                    # If user recorded audio and left text empty → transcribe
                    if not final_text and wav_audio and "bytes" in wav_audio:
                        try:
                            final_text = transcribe_audio_wav(wav_audio["bytes"])
                        except Exception as e:
                            st.warning(f"Transcription unavailable: {e}")

                    if not final_text:
                        st.warning("No answer detected. Please speak or type.")
                    else:
                        # Evaluate
                        ai_eval = evaluate_answer_ai(
                            q.get("question", ""),
                            final_text,
                            q.get("category", ""),
                            st.session_state.role,
                            st.session_state.experience
                        )

                        # Store response
                        save_response(
                            st.session_state.interview_id, q_idx + 1, q.get("category"),
                            q.get("question"), final_text,
                            ai_eval.get("score"), ai_eval.get("feedback"),
                            Config.DATABASE
                        )

                        # Adaptive follow-up
                        try:
                            nxt = generate_adaptive_question(
                                q.get("question",""), final_text, q.get("category",""),
                                st.session_state.role, st.session_state.experience
                            )
                            if nxt:
                                st.session_state.questions.insert(
                                    q_idx + 1, {"category": q.get("category",""), "question": nxt}
                                )
                                st.session_state.questions = st.session_state.questions[:20]
                        except Exception:
                            pass

                        st.session_state.q_index += 1
                        go("interview")
                        st.rerun()

            # Repeat Question
            with colC:
                if st.button("🔊 Repeat Q", use_container_width=True):
                    tts(q.get("question",""))
