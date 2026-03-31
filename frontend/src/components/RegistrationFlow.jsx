import { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://ai-interview-screening-evaluation.onrender.com';

const RegistrationFlow = ({ onComplete }) => {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Competencies, 3: Skills, 4: Responsibilities
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    experience: '',
    hobbies: ''
  });

  const [competencies, setCompetencies] = useState([]);
  const [technicalSkills, setTechnicalSkills] = useState(['', '', '', '', '']);
  const [functionalSkills, setFunctionalSkills] = useState(['', '', '', '', '']);
  const [responsibilities, setResponsibilities] = useState(['']);
  const [techSuggestions, setTechSuggestions] = useState([]);
  const [funcSuggestions, setFuncSuggestions] = useState([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);

  // Step 1: Basic Info
  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role || !formData.experience) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Auto-generate competencies
      const response = await axios.post(`${API_URL}/generate_competencies`, {
        role: formData.role
      });

      if (response.data.success && response.data.data.competencies) {
        setCompetencies(response.data.data.competencies.slice(0, 5));
      }
      setStep(2);
    } catch (error) {
      console.error('Error generating competencies:', error);
      // Use fallback competencies
      setCompetencies([
        { name: 'Communication', positive_indicator: 'Communicates clearly', negative_indicator: 'Poor communication' },
        { name: 'Problem Solving', positive_indicator: 'Solves problems effectively', negative_indicator: 'Struggles with problems' },
        { name: 'Teamwork', positive_indicator: 'Works well in teams', negative_indicator: 'Works in isolation' }
      ]);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Review Competencies
  const handleCompetenciesNext = () => {
    if (competencies.length < 3) {
      alert('At least 3 competencies are required');
      return;
    }
    setStep(3);
  };

  // Step 3: Skills Input with AI Suggestions
  const handleSkillChange = async (index, value, type) => {
    if (type === 'technical') {
      const newSkills = [...technicalSkills];
      newSkills[index] = value;
      setTechnicalSkills(newSkills);

      // Get suggestions
      if (value.length >= 2) {
        setActiveSuggestionField(`tech-${index}`);
        try {
          const response = await axios.post(`${API_URL}/suggest_skills`, {
            role: formData.role,
            skill_type: 'technical',
            partial_input: value
          });
          if (response.data.success) {
            setTechSuggestions(response.data.suggestions);
          }
        } catch (error) {
          console.error('Error getting suggestions:', error);
        }
      } else {
        setTechSuggestions([]);
        setActiveSuggestionField(null);
      }
    } else {
      const newSkills = [...functionalSkills];
      newSkills[index] = value;
      setFunctionalSkills(newSkills);

      // Get suggestions
      if (value.length >= 2) {
        setActiveSuggestionField(`func-${index}`);
        try {
          const response = await axios.post(`${API_URL}/suggest_skills`, {
            role: formData.role,
            skill_type: 'functional',
            partial_input: value
          });
          if (response.data.success) {
            setFuncSuggestions(response.data.suggestions);
          }
        } catch (error) {
          console.error('Error getting suggestions:', error);
        }
      } else {
        setFuncSuggestions([]);
        setActiveSuggestionField(null);
      }
    }
  };

  const selectSuggestion = (index, suggestion, type) => {
    if (type === 'technical') {
      const newSkills = [...technicalSkills];
      newSkills[index] = suggestion;
      setTechnicalSkills(newSkills);
      setTechSuggestions([]);
    } else {
      const newSkills = [...functionalSkills];
      newSkills[index] = suggestion;
      setFunctionalSkills(newSkills);
      setFuncSuggestions([]);
    }
    setActiveSuggestionField(null);
  };

  const handleSkillsNext = () => {
    const techFilled = technicalSkills.filter(s => s.trim()).length;
    const funcFilled = functionalSkills.filter(s => s.trim()).length;

    if (techFilled < 5 || funcFilled < 5) {
      alert('Please fill in all 5 technical and 5 functional skills');
      return;
    }

    setStep(4);
  };

  // Step 4: Responsibilities
  const addResponsibility = () => {
    setResponsibilities([...responsibilities, '']);
  };

  const updateResponsibility = (index, value) => {
    const newResp = [...responsibilities];
    newResp[index] = value;
    setResponsibilities(newResp);
  };

  const removeResponsibility = (index) => {
    if (responsibilities.length > 1) {
      setResponsibilities(responsibilities.filter((_, i) => i !== index));
    }
  };

  const handleFinalSubmit = () => {
    const filledResp = responsibilities.filter(r => r.trim());
    if (filledResp.length === 0) {
      alert('Please add at least one responsibility');
      return;
    }

    // Ensure competencies are in the correct format
    const formattedCompetencies = competencies.map(c => ({
      name: c.name,
      positive_indicator: c.positive_indicator,
      negative_indicator: c.negative_indicator
    }));

    const finalData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      experience: formData.experience,
      hobbies: formData.hobbies || '',
      competencies: formattedCompetencies,
      technical_skills: technicalSkills.filter(s => s.trim()),
      functional_skills: functionalSkills.filter(s => s.trim()),
      responsibilities: filledResp
    };

    console.log('Sending interview data:', finalData);
    onComplete(finalData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      <div className="w-full max-w-3xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
            {['Basic Info', 'Competencies', 'Skills', 'Responsibilities'].map((label, idx) => (
              <div key={idx} className={`text-sm font-semibold ${step > idx ? 'text-emerald-400' : step === idx + 1 ? 'text-white' : 'text-gray-400'}`}>
                {label}
              </div>
            ))}
          </div>
          <div className="h-3 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden shadow-lg">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 transition-all duration-700 ease-out shadow-lg"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4 animate-bounce">🤖</div>
                <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  AI Interview System v2.0
                </h1>
                <p className="text-gray-200 text-lg">Let's get started with your information</p>
                <a
                  href="/admin.html"
                  target="_blank"
                  className="inline-block mt-3 text-sm text-emerald-300 hover:text-emerald-200 transition-colors font-medium"
                >
                  🔐 Admin Panel
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Role Applied For *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all"
                    placeholder="Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Years of Experience *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="50"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all"
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Hobbies (Optional)</label>
                <input
                  type="text"
                  value={formData.hobbies}
                  onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all"
                  placeholder="Reading, Coding, Sports"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Competencies...
                  </span>
                ) : (
                  'Next: Review Competencies →'
                )}
              </button>
            </form>
          )}

          {/* Step 2: Competencies */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">✨</div>
                <h2 className="text-3xl font-bold text-white mb-2">Generated Competencies</h2>
                <p className="text-gray-200">AI has generated these competencies for {formData.role}</p>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {competencies.map((comp, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl">🎯</span>
                      {comp.name}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <span className="text-emerald-400 text-xl">✓</span>
                        <span className="text-gray-100">{comp.positive_indicator}</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <span className="text-red-400 text-xl">✗</span>
                        <span className="text-gray-100">{comp.negative_indicator}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCompetenciesNext}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Next: Add Skills →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Skills */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎯</div>
                <h2 className="text-3xl font-bold text-white mb-2">Your Skills</h2>
                <p className="text-gray-200">Enter 5 technical and 5 functional skills</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">💻</span>
                  Technical Skills (5 required)
                </h3>
                <div className="space-y-3">
                  {technicalSkills.map((skill, idx) => (
                    <div key={idx} className="relative">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleSkillChange(idx, e.target.value, 'technical')}
                        onFocus={() => setActiveSuggestionField(`tech-${idx}`)}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        placeholder={`Technical Skill ${idx + 1}`}
                      />
                      {techSuggestions.length > 0 && activeSuggestionField === `tech-${idx}` && (
                        <div className="absolute z-10 w-full mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar">
                          {techSuggestions.map((suggestion, sidx) => (
                            <div
                              key={sidx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(idx, suggestion, 'technical');
                              }}
                              className="px-4 py-3 hover:bg-cyan-500/20 cursor-pointer text-white transition-all duration-200 first:rounded-t-xl last:rounded-b-xl"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎨</span>
                  Functional Skills (5 required)
                </h3>
                <div className="space-y-3">
                  {functionalSkills.map((skill, idx) => (
                    <div key={idx} className="relative">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleSkillChange(idx, e.target.value, 'functional')}
                        onFocus={() => setActiveSuggestionField(`func-${idx}`)}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                        placeholder={`Functional Skill ${idx + 1}`}
                      />
                      {funcSuggestions.length > 0 && activeSuggestionField === `func-${idx}` && (
                        <div className="absolute z-10 w-full mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar">
                          {funcSuggestions.map((suggestion, sidx) => (
                            <div
                              key={sidx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(idx, suggestion, 'functional');
                              }}
                              className="px-4 py-3 hover:bg-purple-500/20 cursor-pointer text-white transition-all duration-200 first:rounded-t-xl last:rounded-b-xl"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSkillsNext}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Next: Add Responsibilities →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Responsibilities */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">📋</div>
                <h2 className="text-3xl font-bold text-white mb-2">Your Responsibilities</h2>
                <p className="text-gray-200">Add your key responsibilities</p>
              </div>

              <div className="space-y-3">
                {responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex gap-3">
                    <input
                      type="text"
                      value={resp}
                      onChange={(e) => updateResponsibility(idx, e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50 transition-all"
                      placeholder={`Responsibility ${idx + 1}`}
                    />
                    {responsibilities.length > 1 && (
                      <button
                        onClick={() => removeResponsibility(idx)}
                        className="px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addResponsibility}
                className="w-full py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border-2 border-dashed border-white/30 hover:border-emerald-400"
              >
                + Add Another Responsibility
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg"
                >
                  🚀 Start Interview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationFlow;
