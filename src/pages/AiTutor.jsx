import { useState, useRef, useEffect } from "react";

const GROQ_MODEL = "llama-3.3-70b-versatile";

const SUBJECTS = ["All Subjects", "Math", "Science", "History", "English", "Programming", "Geography", "Economics"];

const LEVELS = [
  { label: "Class 1–2",   desc: "Age 6–8"   },
  { label: "Class 3–5",   desc: "Age 8–11"  },
  { label: "Class 6–8",   desc: "Age 11–14" },
  { label: "Class 9–10",  desc: "Age 14–16" },
  { label: "Class 11–12", desc: "Age 16–18" },
  { label: "University",  desc: "Age 18+"   },
];

const SUGGESTIONS = {
  "All Subjects":  ["Explain photosynthesis 🌿", "Help with quadratic equations 📐", "What caused World War I? 🌍", "Explain recursion 💻"],
  "Math":          ["Solve quadratic equations 📐", "Explain Pythagoras theorem 📏", "What is calculus? ∫", "Help with fractions 🔢"],
  "Science":       ["Explain photosynthesis 🌿", "What is gravity? 🍎", "How do cells work? 🔬", "Explain the water cycle 💧"],
  "History":       ["What caused WW1? 🌍", "Tell me about the French Revolution ⚔️", "Who was Napoleon? 👑", "What was the Cold War? 🌐"],
  "English":       ["Help me write an essay ✍️", "Explain metaphors 📚", "What is grammar? 📝", "Help with Shakespeare 🎭"],
  "Programming":   ["Explain recursion 💻", "What is a loop? 🔁", "Help with Python 🐍", "What is an API? 🔌"],
  "Geography":     ["What are tectonic plates? 🌋", "Explain climate zones 🌤️", "What causes earthquakes? 💥", "Tell me about rivers 🏞️"],
  "Economics":     ["What is inflation? 📈", "Explain supply and demand 🏪", "What is GDP? 💰", "How do taxes work? 🧾"],
};

export default function AiTutor() {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [subject,   setSubject]   = useState("All Subjects");
  const [level,     setLevel]     = useState(null);
  const [quizMode,  setQuizMode]  = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildSystemPrompt = () => {
    const levelText   = level ? `The student is in ${level.label} (${level.desc}).` : "";
    const subjectText = subject !== "All Subjects" ? `Focus primarily on ${subject}.` : "Cover all subjects.";
    const quizText    = quizMode ? "After every explanation, always end with a quiz question to test the student." : "";
    return `You are an expert AI tutor inside "Study Buddy".
${levelText} ${subjectText} ${quizText}
- Tailor language to the student's level.
- Class 1-5: very simple words, fun emojis, short sentences.
- Class 6-8: clear explanations, step-by-step breakdowns.
- Class 9-12: detailed, proper terminology, exam tips.
- University: advanced, academic language.
- Be encouraging and positive 🌸
- Use analogies and real-world examples.
- Keep responses digestible.`;
  };

  const sendMessage = async (text) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    
    try {
      // 1. Explicitly check for the API key to catch missing .env files
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("Missing API Key. Ensure VITE_GROQ_API_KEY is in your .env file.");
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...newMessages
          ],
          temperature: 0.7,
          max_tokens: 800,
          stream: false
        })
      });
      
      // 2. Catch the specific 401 error to diagnose quote mark issues
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401 Unauthorized: API key rejected. Remove any quotes in the .env file and restart the Vite server.");
        }
        const errData = await response.json();
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const replyText = data?.choices?.[0]?.message?.content || "Something went wrong.";
      setMessages([...newMessages, { role: "assistant", content: replyText }]);
      
    } catch (err) {
      setError("⚠️ " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────
  if (showSetup) {
    return (
      <div style={{
        width: "100%",
        minHeight: "100%",
        overflowY: "auto",
        background: "#ffffff",
        fontFamily: "'Segoe UI', sans-serif",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "28px 16px 120px",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{ fontSize: 52, marginBottom: 8, textAlign: "center" }}>🎓</div>
          <h1 style={{
            fontSize: "clamp(20px, 5vw, 28px)",
            fontWeight: 800, color: "#be185d",
            margin: "0 0 4px", textAlign: "center",
          }}>AI Tutor Setup</h1>
          <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 0, marginBottom: 24, textAlign: "center" }}>
            Personalise your learning experience
          </p>

          {/* Study Level */}
          <div style={{ width: "100%", maxWidth: 500, marginBottom: 22 }}>
            <div style={{ fontWeight: 700, color: "#111827", marginBottom: 10, fontSize: 15 }}>📚 Your Study Level</div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10, width: "100%",
            }}>
              {LEVELS.map((l) => (
                <button key={l.label} onClick={() => setLevel(l)} style={{
                  padding: "12px 14px", borderRadius: 14,
                  border: `2px solid ${level?.label === l.label ? "#ec4899" : "#e5e7eb"}`,
                  background: level?.label === l.label ? "#fdf2f8" : "#fff",
                  color: level?.label === l.label ? "#be185d" : "#374151",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  textAlign: "left", minHeight: 56,
                  WebkitTapHighlightColor: "transparent",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{l.label}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Focus */}
          <div style={{ width: "100%", maxWidth: 500, marginBottom: 22 }}>
            <div style={{ fontWeight: 700, color: "#111827", marginBottom: 10, fontSize: 15 }}>🔬 Subject Focus</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUBJECTS.map((s) => (
                <button key={s} onClick={() => setSubject(s)} style={{
                  padding: "8px 14px", borderRadius: 20,
                  border: `2px solid ${subject === s ? "#ec4899" : "#e5e7eb"}`,
                  background: subject === s ? "#fdf2f8" : "#fff",
                  color: subject === s ? "#be185d" : "#374151",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", minHeight: 38,
                  WebkitTapHighlightColor: "transparent",
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Quiz Mode */}
          <div style={{ width: "100%", maxWidth: 500, marginBottom: 22 }}>
            <div style={{ fontWeight: 700, color: "#111827", marginBottom: 10, fontSize: 15 }}>📝 Quiz Mode</div>
            <button onClick={() => setQuizMode(!quizMode)} style={{
              padding: "12px 16px", borderRadius: 14,
              border: `2px solid ${quizMode ? "#ec4899" : "#e5e7eb"}`,
              background: quizMode ? "#fdf2f8" : "#fff",
              color: quizMode ? "#be185d" : "#374151",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", minHeight: 48,
              WebkitTapHighlightColor: "transparent",
            }}>
              <span style={{ fontSize: 20 }}>{quizMode ? "✅" : "⬜"}</span>
              Quiz me after every explanation
            </button>
          </div>

          {/* Start button */}
          <button
            onClick={() => { if (level) setShowSetup(false); }}
            disabled={!level}
            style={{
              width: "100%", maxWidth: 500, padding: "16px",
              borderRadius: 16, border: "none",
              fontWeight: 800, fontSize: 16,
              background: level ? "linear-gradient(135deg, #ec4899, #be185d)" : "#f3f4f6",
              color: level ? "#fff" : "#9ca3af",
              cursor: level ? "pointer" : "not-allowed",
              boxShadow: level ? "0 6px 20px rgba(236,72,153,0.35)" : "none",
              minHeight: 52,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {level ? "Start Learning ✨" : "Select your level to continue"}
          </button>
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ───────────────────────────────────────────────────────────
  return (
    <div className="ai-chat-outer" style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#ffffff",
      fontFamily: "'Segoe UI', sans-serif",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
    }}>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        background: "#fff",
        borderBottom: "2px solid #fce7f3",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #ec4899, #be185d)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 4px 12px rgba(236,72,153,0.3)", flexShrink: 0,
          }}>🎓</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>AI Tutor</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {level?.label} · {subject}{quizMode ? " · 📝 Quiz" : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowSetup(true)} style={{
            fontSize: 12, color: "#ec4899", background: "#fdf2f8",
            border: "1px solid #fbb6ce", borderRadius: 20,
            padding: "6px 12px", cursor: "pointer", fontWeight: 600, minHeight: 34,
          }}>⚙️ Setup</button>
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setError(null); }} style={{
              fontSize: 12, color: "#ec4899", background: "#fdf2f8",
              border: "1px solid #fbb6ce", borderRadius: 20,
              padding: "6px 12px", cursor: "pointer", fontWeight: 600, minHeight: 34,
            }}>🗑️</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 12px",
        display: "flex", flexDirection: "column", gap: 14,
        WebkitOverflowScrolling: "touch",
      }}>
        {messages.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", textAlign: "center",
            gap: 10, paddingTop: 20,
          }}>
            <div style={{ fontSize: 44 }}>🌸</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Hi! Ready to learn?</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {level?.label} · {subject}{quizMode ? " · Quiz Mode ON 📝" : ""}
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8, width: "100%", maxWidth: 460, marginTop: 4,
            }}>
              {(SUGGESTIONS[subject] || SUGGESTIONS["All Subjects"]).map((s) => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding: "10px 12px", borderRadius: 14,
                  border: "1.5px solid #fbb6ce", background: "#fff",
                  color: "#be185d", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", textAlign: "left", minHeight: 44,
                  WebkitTapHighlightColor: "transparent",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            alignItems: "flex-start", gap: 8,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, marginTop: 2,
              background: msg.role === "user"
                ? "linear-gradient(135deg, #f9a8d4, #ec4899)"
                : "linear-gradient(135deg, #ec4899, #be185d)",
            }}>
              {msg.role === "user" ? "🧑‍🎓" : "🎓"}
            </div>
            <div style={{
              maxWidth: "82%", padding: "11px 14px", borderRadius: 18,
              borderTopRightRadius: msg.role === "user" ? 4 : 18,
              borderTopLeftRadius: msg.role === "assistant" ? 4 : 18,
              background: msg.role === "user"
                ? "linear-gradient(135deg, #ec4899, #be185d)" : "#f9fafb",
              color: msg.role === "user" ? "#fff" : "#111827",
              border: msg.role === "assistant" ? "1.5px solid #f3f4f6" : "none",
              fontSize: 14, lineHeight: 1.7,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, background: "linear-gradient(135deg,#ec4899,#be185d)",
            }}>🎓</div>
            <div style={{
              background: "#f9fafb", border: "1.5px solid #f3f4f6",
              borderRadius: 18, borderTopLeftRadius: 4,
              padding: "14px 18px", display: "flex", gap: 6, alignItems: "center",
            }}>
              {[0, 150, 300].map((d) => (
                <div key={d} style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#f9a8d4",
                  animation: "bounce 1.2s infinite", animationDelay: `${d}ms`,
                }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: "#fff1f2", border: "1px solid #fecdd3",
            color: "#e11d48", borderRadius: 12,
            padding: "12px 16px", fontSize: 14, textAlign: "center",
          }}>{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: "10px 12px 16px", background: "#fff",
        borderTop: "2px solid #fce7f3", flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          background: "#f9fafb", border: "2px solid #fbb6ce",
          borderRadius: 22, padding: "10px 10px 10px 14px",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything… 💬"
            rows={1}
            style={{
              flex: 1, border: "none", outline: "none", resize: "none",
              fontSize: 15, color: "#111827", background: "transparent",
              lineHeight: 1.5, fontFamily: "inherit",
              minHeight: 24, maxHeight: 120, WebkitAppearance: "none",
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: 12, border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0, transition: "all 0.2s",
              background: input.trim() && !loading
                ? "linear-gradient(135deg, #ec4899, #be185d)" : "#f3f4f6",
              color: input.trim() && !loading ? "#fff" : "#9ca3af",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              boxShadow: input.trim() && !loading ? "0 4px 12px rgba(236,72,153,0.4)" : "none",
            }}
          >{loading ? "⏳" : "➤"}</button>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,60%,100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        * { box-sizing: border-box; }
        textarea { -webkit-appearance: none; }
        button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .ai-chat-outer { height: calc(100vh - 4rem); }
        @media (max-width: 768px) {
          .ai-chat-outer { height: calc(100svh - 80px - 2rem); }
        }
      `}</style>
    </div>
  );
}