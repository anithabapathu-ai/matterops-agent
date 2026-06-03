import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.get("/", (req, res) => {
  res.send("MatterOps Agent backend is running with Groq");
});

app.post("/api/analyze", async (req, res) => {
  const startTime = Date.now();

  try {
    const { clientName, practiceArea, urgency, description } = req.body;

    if (!description) {
      return res.status(400).json({
        error: "Case description is required",
      });
    }

    const matterId = `MAT-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    const systemPrompt = `
You are MatterOps Agent, an AI Legal Operations Workflow Assistant for law firms.

You are NOT a lawyer.
Do NOT provide legal advice.
Do NOT predict legal outcomes.
Do NOT say whether the client will win or lose.

Your job is to convert messy intake notes into a structured matter operations plan for attorneys and paralegals.

Focus on:
- intake triage
- operational urgency
- missing information
- missing documents
- routing
- staffing
- timeline extraction
- action checklist
- decision trace
- evaluation checks
- attorney-ready internal brief
- human review

Generate scores from 0 to 100:
- urgency_score
- confidence_score
- intake_completeness_score
- operational_readiness_score

Score guidance:
- urgency_score: how quickly the firm should review/respond
- confidence_score: how reliable the analysis is based on intake clarity
- intake_completeness_score: how complete the submitted information is
- operational_readiness_score: how ready the matter is for attorney review

Escalation guidance:
Set escalation_required to true if urgency is high, deadlines are mentioned, important documents are missing, or there is potential time sensitivity.
Set escalation_reason to a concise operational reason.

SLA guidance:
High urgency: respond within 24 hours.
Medium urgency: respond within 72 hours.
Low urgency: respond within 5-7 business days.

Rules:
- Return ONLY valid JSON.
- Keep language professional and concise.
- Always require human review.
- Attorney brief must be useful internally but must not provide legal advice.

Return this exact JSON structure:
{
  "matter_id": "",
  "client_name": "",
  "matter_type": "",
  "case_summary": "",
  "key_facts": [],
  "case_timeline": [],
  "missing_information": [],
  "missing_documents": [],
  "recommended_next_steps": [],
  "internal_task_list": [],
  "action_checklist": [],
  "recommended_roles": [],
  "urgency_score": 0,
  "urgency_level": "",
  "confidence_score": 0,
  "intake_completeness_score": 0,
  "operational_readiness_score": 0,
  "sla_recommendation": "",
  "routing_recommendation": "",
  "decision_trace": [],
  "possible_operational_risks": [],
  "escalation_required": false,
  "escalation_reason": "",
  "quality_checks": {
    "summary_generated": true,
    "timeline_extracted": true,
    "missing_info_detected": true,
    "missing_documents_detected": true,
    "routing_generated": true,
    "staffing_generated": true,
    "attorney_brief_generated": true,
    "human_review_required": true
  },
  "attorney_intake_brief": ""
}
`;

    const userPrompt = `
Matter ID: ${matterId}
Client Name: ${clientName || "Unknown Client"}
Matter Type: ${practiceArea}
Client Reported Urgency: ${urgency}

Intake Notes:
${description}
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
    });

    const aiText = completion.choices[0].message.content;
    const parsedOutput = JSON.parse(aiText);

    parsedOutput.matter_id = parsedOutput.matter_id || matterId;
    parsedOutput.client_name =
      parsedOutput.client_name || clientName || "Unknown Client";
    parsedOutput.matter_type = parsedOutput.matter_type || practiceArea;
    parsedOutput.model_used = "llama-3.3-70b-versatile";
    parsedOutput.processing_time_ms = Date.now() - startTime;

    res.json(parsedOutput);
  } catch (error) {
    console.error("Backend error:", error);

    res.status(500).json({
      error: "Failed to analyze intake",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});