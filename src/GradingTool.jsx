import { useState } from "react";

const STANDARDS = [
  {
    category: "1. Site Structure",
    items: [
      "Images are in an images folder",
      "Stylesheets are in a styles folder; default stylesheet is called default.css",
      "Scripts are in a scripts folder",
      "Unused files are in a z_archives folder",
      "Reusable code is in a components folder",
      "Absolute URLs used for external sites",
      "Relative URLs used for internal pages",
      "Relative links do NOT open in new windows/tabs",
    ],
  },
  {
    category: "2. File Naming",
    items: [
      "Filename is meaningful, lowercase, no spaces",
      "Filename is consistent with other pages in the site",
    ],
  },
  {
    category: "3. Title Element",
    items: ["Title has site name + divider + page name"],
  },
  {
    category: "4. Favicon",
    items: ["Legible favicon present that matches site name/theme"],
  },
  {
    category: "5. Page Validation",
    items: [
      "Accumulus lint script is last line in head element",
      "Cloud appears all green on page",
      "WCAG shows no warnings/errors",
    ],
  },
  {
    category: "6. Page Layout / Structure",
    items: [
      "Body has header, main, and footer",
      "Header and footer match across entire site",
      "Header includes site name in h1",
      "Header includes navbar with site navigation",
      "Main includes page name in h2 at top",
      "Subsections use h3 as section titles",
      "Footer includes 'Site Designed by' credit",
      "Footer includes site tagline in italics or quotes",
      "Footer goes widest to narrowest (no Christmas tree effect)",
    ],
  },
  {
    category: "7. Styles",
    items: [
      "No plain white or black used without justification",
      "At least 2 fonts used; no complex/serif fonts for small text",
      "Default link colors overridden (no default blue/purple)",
      "Cohesive color palette used",
      "Paragraphs not center-aligned on normal screens",
    ],
  },
  {
    category: "8. CRAP Design Principles",
    items: [
      "Contrast: text and elements have sufficient contrast",
      "Repetition: design elements consistent across site",
      "Alignment: elements aligned to create visual connection",
      "Proximity: related items grouped, unrelated items spaced",
    ],
  },
  {
    category: "9. DO NOTs",
    items: [
      "No divs/spans when semantic elements are available",
      "No inline styles (except ≤2 instances)",
      "No unused classes",
      "No unnecessary or AI-copied code without purpose",
      "Only one h1 and one h2 per page",
      "CSS and HTML are not overcomplicated",
      "No black, white, Times New Roman, Comic Sans, or Papyrus",
      "No clashing or too-similar colors",
      "No centered paragraphs",
      "No centered bullets",
    ],
  },
];

const SYSTEM_PROMPT = `You are a grading assistant for ITIS3135 Front-End Web Development. You will be given a student's website URL AND the URL of their personal home page (the root index of the site). First fetch the personal home page and extract the student's full name from it (look for a heading, byline, or "about me" text). Then fetch the project page and evaluate it against each checklist item below.

STANDARDS:
${STANDARDS.map(
  (cat) => `${cat.category}:\n${cat.items.map((item) => `  - ${item}`).join("\n")}`
).join("\n\n")}

Respond ONLY with a valid JSON object — no markdown, no backticks, no preamble. Use this exact format:
{
  "student_name": "Full Name or null if not found",
  "categories": [
    {
      "category": "exact category name from above",
      "items": [
        {
          "item": "exact item text from above",
          "pass": true,
          "note": ""
        }
      ]
    }
  ],
  "overall_notes": "2-3 sentence summary suitable for pasting directly into Canvas as instructor feedback."
}

Rules:
- student_name: the student's name extracted from their personal home page; null if not found
- pass: true if met, false if not met, null if you cannot determine from source alone
- note: brief, constructive explanation when pass is false or null; empty string when pass is true
- Preserve the exact category and item text from the checklist above`;

function getRootUrl(rawUrl) {
  try {
    return new URL(rawUrl).origin + "/";
  } catch {
    return null;
  }
}

export default function GradingTool() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function evaluate() {
    if (!url.trim() || !apiKey.trim()) return;
    setLoading(true);
    setResults(null);
    setError("");
    setCopied(false);

    const rootUrl = getRootUrl(url.trim());

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [
            {
              role: "user",
              content: `Personal home page (extract student name from here): ${rootUrl}\n\nProject page to evaluate: ${url.trim()}`,
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(`API error: ${data.error.message}`);
        return;
      }

      const textBlocks = data.content?.filter((b) => b.type === "text") || [];
      const raw = textBlocks.map((b) => b.text).join("");
      const clean = raw.replace(/```json|```/gi, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed);
    } catch (err) {
      setError("Something went wrong evaluating the page. Check the URL and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function buildFeedbackText() {
    if (!results) return "";
    const name = results.student_name ? `Student: ${results.student_name}\n` : "";
    const urlLine = `URL: ${url}\n\n`;
    const lines = results.categories
      .map((cat) => {
        const itemLines = cat.items
          .map((item) => {
            const icon = item.pass === true ? "✅" : item.pass === false ? "❌" : "⚠️";
            return `  ${icon} ${item.item}${item.note ? " — " + item.note : ""}`;
          })
          .join("\n");
        return `${cat.category}\n${itemLines}`;
      })
      .join("\n\n");
    const overall = results.overall_notes ? `\n\nOverall: ${results.overall_notes}` : "";
    return `${name}${urlLine}${lines}${overall}`;
  }

  function copyFeedback() {
    navigator.clipboard.writeText(buildFeedbackText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function passCount() {
    if (!results) return { pass: 0, fail: 0, unknown: 0 };
    let pass = 0, fail = 0, unknown = 0;
    results.categories.forEach((cat) =>
      cat.items.forEach((item) => {
        if (item.pass === true) pass++;
        else if (item.pass === false) fail++;
        else unknown++;
      })
    );
    return { pass, fail, unknown };
  }

  const counts = passCount();
  const totalItems = STANDARDS.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1F6", fontFamily: "'Inter', system-ui, sans-serif", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: "#1B2A4A", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1.5rem", color: "white" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7E9BBF", marginBottom: 6 }}>
            ITIS3135 · Front-End Web Development
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Student Site Evaluator
          </h1>
          <div style={{ marginTop: 4, fontSize: 13, color: "#A8BDD4" }}>
            Checks against the ITIS3135 Web Standards ({totalItems} criteria)
          </div>
        </div>

        {/* Input card */}
        <div style={{ background: "white", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input
              type="password"
              placeholder="Anthropic API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #D1D9E6", fontSize: 14, outline: "none", fontFamily: "monospace" }}
            />
            <input
              type="url"
              placeholder="https://student.github.io/project/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && evaluate()}
              style={{ flex: "3 1 280px", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #D1D9E6", fontSize: 14, outline: "none" }}
            />
            <button
              onClick={evaluate}
              disabled={loading || !url.trim() || !apiKey.trim()}
              style={{
                padding: "10px 22px", borderRadius: 8, border: "none",
                cursor: loading || !url.trim() || !apiKey.trim() ? "not-allowed" : "pointer",
                background: loading || !url.trim() || !apiKey.trim() ? "#CBD5E1" : "#1B2A4A",
                color: "white", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", transition: "background 0.15s",
              }}
            >
              {loading ? "Evaluating…" : "Evaluate"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>
            API key is used only in your browser and never stored or sent anywhere else.
          </div>
          {error && <div style={{ color: "#DC2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ background: "white", borderRadius: 12, padding: "2rem", textAlign: "center", color: "#64748B", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14 }}>Fetching page and evaluating against standards…</div>
          </div>
        )}

        {/* Results */}
        {results && (
          <>
            {/* Score bar */}
            <div style={{ background: "white", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                {results.student_name && <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{results.student_name}</div>}
                <div style={{ fontSize: 12, color: "#64748B", wordBreak: "break-all" }}>{url}</div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <Pill color="#16A34A" bg="#DCFCE7" label={`${counts.pass} passed`} />
                <Pill color="#DC2626" bg="#FEE2E2" label={`${counts.fail} failed`} />
                {counts.unknown > 0 && <Pill color="#D97706" bg="#FEF3C7" label={`${counts.unknown} unknown`} />}
              </div>
              <button
                onClick={copyFeedback}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid #1B2A4A", background: copied ? "#1B2A4A" : "white", color: copied ? "white" : "#1B2A4A", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
              >
                {copied ? "✓ Copied!" : "Copy Feedback"}
              </button>
            </div>

            {/* Category results */}
            {results.categories.map((cat, ci) => (
              <div key={ci} style={{ background: "white", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1B2A4A", marginBottom: "0.75rem", borderBottom: "1px solid #EEF1F6", paddingBottom: "0.5rem" }}>
                  {cat.category}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cat.items.map((item, ii) => (
                    <div key={ii} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>
                        {item.pass === true ? "✅" : item.pass === false ? "❌" : "⚠️"}
                      </span>
                      <div>
                        <span style={{ fontSize: 13, color: item.pass === false ? "#991B1B" : item.pass === null ? "#92400E" : "#1E293B" }}>
                          {item.item}
                        </span>
                        {item.note && (
                          <span style={{ fontSize: 12, color: "#64748B" }}> — {item.note}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Overall notes */}
            {results.overall_notes && (
              <div style={{ background: "#1B2A4A", borderRadius: 12, padding: "1.25rem 1.5rem", color: "#CBD8EB", fontSize: 14, lineHeight: 1.6, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ fontWeight: 700, color: "white", marginBottom: 6, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Overall Feedback</div>
                {results.overall_notes}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Pill({ color, bg, label }) {
  return (
    <div style={{ background: bg, color, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </div>
  );
}
