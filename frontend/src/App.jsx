import React, { useState } from "react";
import axios from "axios";

const sampleCase = {
  clientName: "Maria Johnson",
  practiceArea: "Employment Law",
  urgency: "High",
  description:
    "Maria Johnson says she was terminated two days after reporting unpaid overtime and unsafe working conditions at a warehouse where she worked for 3 years. Her supervisor regularly asked her to continue working after clocking out. She has screenshots of time records, text messages with her supervisor, and photos of unsafe equipment. She has not received her final paycheck. She is unsure whether she signed an arbitration agreement. The termination happened last Friday.",
};

const Card = ({ title, children }) => (
  <div style={styles.card}>
    <h3 style={styles.cardTitle}>{title}</h3>
    {children}
  </div>
);

const List = ({ items }) => (
  <ul style={{ paddingLeft: "20px" }}>
    {items?.map((item, index) => (
      <li key={index} style={{ marginBottom: "8px", lineHeight: "1.5" }}>
        {item}
      </li>
    ))}
  </ul>
);

const ScoreBar = ({ score }) => (
  <div>
    <div style={styles.scoreTrack}>
      <div
        style={{
          ...styles.scoreFill,
          width: `${Math.min(score || 0, 100)}%`,
        }}
      />
    </div>
    <strong>{score || 0}/100</strong>
  </div>
);

function App() {
  const [form, setForm] = useState({
    clientName: "",
    practiceArea: "Employment Law",
    urgency: "Medium",
    description: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("Pending Review");
  const [matterHistory, setMatterHistory] = useState([]);
  const [savedMatters, setSavedMatters] = useState(
    JSON.parse(localStorage.getItem("savedMatters")) || []
  );

  const updateForm = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const loadDemo = () => {
    setForm(sampleCase);
    setResult(null);
    setReviewStatus("Pending Review");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      setForm((prevForm) => ({
        ...prevForm,
        description: event.target.result,
      }));
    };

    reader.readAsText(file);
  };

  const analyzeCase = async () => {
    if (!form.description.trim()) {
      alert("Please enter intake notes.");
      return;
    }

    setLoading(true);
    setResult(null);
    setReviewStatus("Pending Review");

    try {
      const response = await axios.post("/api/analyze", form);
      setResult(response.data);

      setMatterHistory((prev) => [
        {
          matterId: response.data.matter_id,
          clientName: response.data.client_name,
          matterType: response.data.matter_type,
          urgencyScore: response.data.urgency_score,
        },
        ...prev.slice(0, 4),
      ]);
    } catch (error) {
      console.error(error);
      alert("Backend error. Make sure backend is running.");
    }

    setLoading(false);
  };

  const downloadBrief = () => {
    if (!result?.attorney_intake_brief) return;

    const blob = new Blob([result.attorney_intake_brief], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${result.matter_id || "attorney-brief"}.txt`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const downloadFullReport = () => {
    if (!result) return;

    const report = `
MATTEROPS AGENT - FULL MATTER REPORT

Matter ID: ${result.matter_id}
Client: ${result.client_name}
Matter Type: ${result.matter_type}
Review Status: ${reviewStatus}

URGENCY SCORE:
${result.urgency_score}/100 - ${result.urgency_level}

CONFIDENCE SCORE:
${result.confidence_score}/100

INTAKE COMPLETENESS:
${result.intake_completeness_score}/100

OPERATIONAL READINESS:
${result.operational_readiness_score}/100

ESCALATION:
${result.escalation_required ? "Escalation Required" : "No Escalation Required"}
${result.escalation_reason || "No major escalation trigger detected."}

SLA RECOMMENDATION:
${result.sla_recommendation}

CASE SUMMARY:
${result.case_summary}

ROUTING RECOMMENDATION:
${result.routing_recommendation}

ATTORNEY INTAKE BRIEF:
${result.attorney_intake_brief}

KEY FACTS:
${result.key_facts?.map((item) => `- ${item}`).join("\n")}

CASE TIMELINE:
${result.case_timeline?.map((item) => `- ${item}`).join("\n")}

MISSING INFORMATION:
${result.missing_information?.map((item) => `- ${item}`).join("\n")}

MISSING DOCUMENTS:
${result.missing_documents?.map((item) => `- ${item}`).join("\n")}

ACTION CHECKLIST:
${result.action_checklist?.map((item) => `- ${item}`).join("\n")}

RECOMMENDED ROLES:
${result.recommended_roles?.map((item) => `- ${item}`).join("\n")}

AI DECISION TRACE:
${result.decision_trace?.map((item) => `- ${item}`).join("\n")}

OPERATIONAL RISKS:
${result.possible_operational_risks?.map((item) => `- ${item}`).join("\n")}

EVALUATION CHECKS:
${Object.entries(result.quality_checks || {})
  .map(
    ([key, value]) =>
      `- ${key.replaceAll("_", " ")}: ${value ? "PASS" : "NEEDS REVIEW"}`
  )
  .join("\n")}

SYSTEM METADATA:
Model Used: ${result.model_used}
Processing Time: ${result.processing_time_ms} ms

DISCLAIMER:
This report organizes intake information for legal staff. It does not provide legal advice. Human review is required.
`;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${result.matter_id || "matter-report"}.txt`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const saveMatter = () => {
    if (!result) return;

    const matterToSave = {
      matter_id: result.matter_id,
      client_name: result.client_name,
      matter_type: result.matter_type,
      urgency_score: result.urgency_score,
      saved_at: new Date().toLocaleString(),
      review_status: reviewStatus,
      full_result: result,
    };

    const updatedMatters = [matterToSave, ...savedMatters];

    setSavedMatters(updatedMatters);
    localStorage.setItem("savedMatters", JSON.stringify(updatedMatters));

    alert("Matter saved successfully.");
  };

  const deleteSavedMatter = (matterId) => {
    const confirmDelete = window.confirm("Delete this saved matter?");
    if (!confirmDelete) return;

    const updated = savedMatters.filter((m) => m.matter_id !== matterId);

    setSavedMatters(updated);
    localStorage.setItem("savedMatters", JSON.stringify(updated));
  };

  const loadSavedMatter = (matter) => {
    setResult(matter.full_result);
    setReviewStatus(matter.review_status || "Pending Review");
  };

  const clearMatter = () => {
    const confirmClear = window.confirm(
      "Have you downloaded or saved the matter report? Clearing will remove the current intake and AI results from the screen."
    );

    if (!confirmClear) return;

    setForm({
      clientName: "",
      practiceArea: "Employment Law",
      urgency: "Medium",
      description: "",
    });

    setResult(null);
    setReviewStatus("Pending Review");
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>MatterOps Agent</h1>
          <p style={styles.subtitle}>
            AI legal operations workflow assistant: Intake → Triage →
            Evaluation → Human Review → Attorney Brief.
          </p>
        </div>

        <div style={styles.badge}>Human-in-the-loop · Not legal advice</div>
      </header>

      <div style={styles.grid}>
        <section>
          <Card title="Client Intake">
            <label style={styles.label}>Client Name</label>
            <input
              name="clientName"
              value={form.clientName}
              onChange={updateForm}
              placeholder="Client name or lead name"
              style={styles.input}
            />

            <label style={styles.label}>Matter Type</label>
            <select
              name="practiceArea"
              value={form.practiceArea}
              onChange={updateForm}
              style={styles.input}
            >
              <option>Employment Law</option>
              <option>Family Law</option>
              <option>Immigration</option>
              <option>Personal Injury</option>
              <option>Contract Dispute</option>
              <option>General Litigation</option>
            </select>

            <label style={styles.label}>Client Reported Urgency</label>
            <select
              name="urgency"
              value={form.urgency}
              onChange={updateForm}
              style={styles.input}
            >
              <option value="Low">Low - General inquiry</option>
              <option value="Medium">Medium - Needs review soon</option>
              <option value="High">High - Time-sensitive issue</option>
            </select>

            <p style={styles.helper}>
              Client-reported urgency is an intake signal. The agent calculates
              a separate operational urgency score from the facts.
            </p>

            <label style={styles.label}>Upload Intake Document</label>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              style={{ marginBottom: "10px" }}
            />

            <p style={styles.helper}>
              MVP supports .txt intake documents. Production version could add
              PDF/DOCX parsing and OCR.
            </p>

            <label style={styles.label}>Case Description / Intake Notes</label>
            <textarea
              rows="13"
              name="description"
              value={form.description}
              onChange={updateForm}
              placeholder="Paste client notes, emails, intake details, or paralegal notes here..."
              style={styles.textarea}
            />

            <div style={{ marginTop: "18px" }}>
              <button
                onClick={analyzeCase}
                disabled={loading}
                style={styles.primaryButton}
              >
                {loading ? "Analyzing..." : "Analyze Intake"}
              </button>

              <button onClick={loadDemo} style={styles.secondaryButton}>
                Load Demo Case
              </button>
            </div>

            <p style={styles.disclaimer}>
              This demo organizes intake information for legal staff. It does
              not provide legal advice.
            </p>
          </Card>

          {matterHistory.length > 0 && (
            <Card title="Recent Matters">
              {matterHistory.map((matter) => (
                <div key={matter.matterId} style={styles.historyItem}>
                  <strong>{matter.matterId}</strong>
                  <p style={{ margin: "4px 0" }}>{matter.clientName}</p>
                  <small>
                    {matter.matterType} · Urgency {matter.urgencyScore}/100
                  </small>
                </div>
              ))}
            </Card>
          )}

          {savedMatters.length > 0 && (
            <Card title="Saved Matters">
              {savedMatters.map((matter) => (
                <div key={matter.matter_id} style={styles.historyItem}>
                  <strong>{matter.matter_id}</strong>

                  <p style={{ margin: "4px 0" }}>{matter.client_name}</p>

                  <small>
                    {matter.matter_type} · Urgency {matter.urgency_score}/100
                  </small>

                  <br />

                  <small>Saved: {matter.saved_at}</small>

                  <div style={{ marginTop: "10px" }}>
                    <button
                      onClick={() => loadSavedMatter(matter)}
                      style={styles.primaryButton}
                    >
                      Open
                    </button>

                    <button
                      onClick={() => deleteSavedMatter(matter.matter_id)}
                      style={styles.clearButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          {!result && (
            <Card title="Matter Operations Plan">
              <p style={{ color: "#64748b" }}>
                Run an intake analysis to generate a structured matter plan with
                scoring, routing, evaluation checks, decision trace, escalation
                flag, and attorney-ready brief.
              </p>
            </Card>
          )}

          {result && (
            <>
              <div style={styles.topPanel}>
                <div>
                  <p style={styles.kicker}>Matter</p>
                  <h2 style={{ margin: 0 }}>{result.matter_id}</h2>
                  <p style={{ margin: "6px 0", color: "#475569" }}>
                    Client: {result.client_name}
                  </p>
                  <p style={{ margin: 0, color: "#475569" }}>
                    Type: {result.matter_type}
                  </p>
                </div>

                <div style={styles.statusBox}>
                  <p style={styles.kicker}>Review Status</p>
                  <strong>{reviewStatus}</strong>
                </div>
              </div>

              <div style={styles.dashboardGrid}>
                <Card title="Urgency">
                  <ScoreBar score={result.urgency_score} />
                  <p>{result.urgency_level}</p>
                </Card>

                <Card title="Confidence">
                  <ScoreBar score={result.confidence_score} />
                </Card>

                <Card title="Completeness">
                  <ScoreBar score={result.intake_completeness_score} />
                </Card>

                <Card title="Readiness">
                  <ScoreBar score={result.operational_readiness_score} />
                </Card>
              </div>

              <Card title="Escalation">
                <h2 style={{ marginTop: 0 }}>
                  {result.escalation_required
                    ? "Escalation Required"
                    : "No Escalation Required"}
                </h2>
                <p>
                  {result.escalation_reason ||
                    "No major escalation trigger detected."}
                </p>
                <p>
                  <strong>SLA:</strong> {result.sla_recommendation}
                </p>
              </Card>

              <Card title="Attorney Intake Brief">
                <pre style={styles.briefBox}>{result.attorney_intake_brief}</pre>
                <button onClick={downloadBrief} style={styles.primaryButton}>
                  Download Brief (.txt)
                </button>
              </Card>

              <Card title="Case Summary">
                <p style={styles.paragraph}>{result.case_summary}</p>
              </Card>

              <Card title="Routing Recommendation">
                <p style={styles.paragraph}>{result.routing_recommendation}</p>
              </Card>

              <Card title="Recommended Roles">
                <List items={result.recommended_roles} />
              </Card>

              <Card title="Action Checklist">
                <List items={result.action_checklist} />
              </Card>

              <Card title="Key Facts">
                <List items={result.key_facts} />
              </Card>

              <Card title="Case Timeline">
                <List items={result.case_timeline} />
              </Card>

              <Card title="Missing Information">
                <List items={result.missing_information} />
              </Card>

              <Card title="Missing Documents">
                <List items={result.missing_documents} />
              </Card>

              <Card title="AI Decision Trace">
                <List items={result.decision_trace} />
              </Card>

              <Card title="Possible Operational Risks">
                <List items={result.possible_operational_risks} />
              </Card>

              <Card title="Evaluation Checks">
                <div style={styles.evalGrid}>
                  {Object.entries(result.quality_checks || {}).map(
                    ([key, value]) => (
                      <div key={key} style={styles.evalItem}>
                        <span>{value ? "✓" : "!"}</span>
                        <p>{key.replaceAll("_", " ")}</p>
                      </div>
                    )
                  )}
                </div>
              </Card>

              <Card title="System Metadata">
                <p>
                  <strong>Model:</strong> {result.model_used}
                </p>
                <p>
                  <strong>Processing Time:</strong>{" "}
                  {result.processing_time_ms} ms
                </p>
              </Card>

              <Card title="Human Review">
                <button
                  onClick={() => setReviewStatus("Approved")}
                  style={styles.approveButton}
                >
                  Approve
                </button>

                <button
                  onClick={() => setReviewStatus("Needs Revision")}
                  style={styles.revisionButton}
                >
                  Needs Revision
                </button>

                <button
                  onClick={() => setReviewStatus("Rejected")}
                  style={styles.rejectButton}
                >
                  Reject
                </button>

                <div style={{ marginTop: "18px" }}>
                  <button onClick={downloadFullReport} style={styles.primaryButton}>
                    Download Full Matter Report
                  </button>

                  <button onClick={saveMatter} style={styles.secondaryButton}>
                    Save Matter
                  </button>

                  <button onClick={clearMatter} style={styles.clearButton}>
                    Clear Matter
                  </button>
                </div>
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
    marginBottom: "25px",
  },
  title: {
    marginBottom: "8px",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    maxWidth: "850px",
    lineHeight: "1.5",
  },
  badge: {
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#e0f2fe",
    color: "#075985",
    fontSize: "13px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr",
    gap: "24px",
    alignItems: "start",
  },
  card: {
    background: "white",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },
  cardTitle: {
    marginTop: 0,
    color: "#0f172a",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "6px",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    resize: "vertical",
    boxSizing: "border-box",
  },
  helper: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "-4px",
    marginBottom: "14px",
  },
  disclaimer: {
    marginTop: "14px",
    color: "#64748b",
    fontSize: "12px",
  },
  primaryButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#0f172a",
    color: "white",
    cursor: "pointer",
    marginRight: "10px",
    fontWeight: "bold",
  },
  secondaryButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: "pointer",
    marginRight: "10px",
    fontWeight: "bold",
  },
  clearButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "1px solid #dc2626",
    background: "white",
    color: "#dc2626",
    cursor: "pointer",
    fontWeight: "bold",
  },
  topPanel: {
    background: "white",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "16px",
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
  },
  statusBox: {
    background: "#f1f5f9",
    padding: "14px",
    borderRadius: "12px",
    minWidth: "150px",
  },
  kicker: {
    margin: "0 0 6px 0",
    color: "#64748b",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  scoreTrack: {
    width: "100%",
    height: "10px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
    marginBottom: "8px",
  },
  scoreFill: {
    height: "100%",
    background: "#0f172a",
  },
  paragraph: {
    lineHeight: "1.6",
    color: "#334155",
  },
  briefBox: {
    background: "#f8fafc",
    padding: "14px",
    borderRadius: "10px",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
    border: "1px solid #e2e8f0",
  },
  evalGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  evalItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f8fafc",
    padding: "10px",
    borderRadius: "10px",
    textTransform: "capitalize",
  },
  historyItem: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "10px",
    border: "1px solid #e2e8f0",
  },
  approveButton: {
    marginRight: "10px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#16a34a",
    color: "white",
    cursor: "pointer",
  },
  revisionButton: {
    marginRight: "10px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#ca8a04",
    color: "white",
    cursor: "pointer",
  },
  rejectButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
  },
};

export default App;