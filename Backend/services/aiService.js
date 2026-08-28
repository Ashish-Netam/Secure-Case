import { configDotenv } from "dotenv";

configDotenv();

const ollamaUrl = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const ollamaModel = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const analysisSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    classification: { type: "string" },
    confidence: { type: "number" },
    entities: {
      type: "object",
      properties: {
        persons: { type: "array", items: { type: "string" } },
        organizations: { type: "array", items: { type: "string" } },
        locations: { type: "array", items: { type: "string" } },
        dates: { type: "array", items: { type: "string" } },
      },
    },
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          event: { type: "string" },
        },
        required: ["date", "event"],
      },
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        properties: {
          relationship: { type: "string" },
          support: { type: "string" },
        },
        required: ["relationship", "support"],
      },
    },
    followupEvidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item: { type: "string" },
          whyItMatters: { type: "string" },
        },
        required: ["item", "whyItMatters"],
      },
    },
  },
  required: ["summary", "classification", "confidence"],
};

function extractJson(value) {
  const cleaned = value.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

function removeEmptyValues(value) {
  if (Array.isArray(value)) {
    const items = value.map(removeEmptyValues).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, nestedValue]) => [key, removeEmptyValues(nestedValue)])
      .filter(([, nestedValue]) => nestedValue !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  return value === "" || value === null || value === undefined ? undefined : value;
}

export async function analyzeEvidence(text) {
  const promptStartedAt = performance.now();
  const prompt = `
You are a digital-forensics evidence analyst. Return only valid JSON and use only the supplied evidence.

Use this shape:
{
  "summary": "string",
  "entities": { "persons": [], "organizations": [], "locations": [], "dates": [] },
  "suspicious_points": ["string"],
  "relationships": [{ "relationship": "string", "support": "string" }],
  "timeline": [{ "date": "string", "event": "string" }],
  "classification": "string",
  "confidence": 0.0,
  "followupEvidence": [{ "item": "string", "whyItMatters": "string" }]
}

Rules:
- Never invent facts, names, dates, locations, motives, relationships, or suspicious activity.
- Omit unsupported optional fields.
- Keep the summary concise and distinguish facts from inferences.
- Confidence must be a number from 0 to 1.

Evidence:
${text}
`;
  const promptConstructionMs = Math.round(performance.now() - promptStartedAt);

  const inferenceStartedAt = performance.now();
  let response;
  try {
    response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        format: analysisSchema,
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || "10m",
        options: {
          temperature: 0.1,
          num_predict: Number(process.env.OLLAMA_NUM_PREDICT || 500),
        },
      }),
    });
  } catch (error) {
    if (error.cause?.code === "ECONNREFUSED" || error.code === "ECONNREFUSED") {
      throw new Error("Ollama is unavailable. Start Ollama with `ollama serve` and try again.");
    }
    throw error;
  }
  const inferenceMs = Math.round(performance.now() - inferenceStartedAt);

  const parsingStartedAt = performance.now();
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Ollama returned HTTP ${response.status}.`);
  }

  if (typeof payload?.response !== "string" || !payload.response.trim()) {
    throw new Error("Ollama returned an empty analysis.");
  }

  let result;
  try {
    result = JSON.parse(extractJson(payload.response));
  } catch {
    throw new Error("Ollama returned invalid analysis JSON.");
  }

  if (!result || Array.isArray(result) || typeof result !== "object") {
    throw new Error("Ollama returned an invalid analysis object.");
  }

  result = removeEmptyValues(result) || {};
  if (
    typeof result.summary !== "string" ||
    typeof result.classification !== "string" ||
    typeof result.confidence !== "number"
  ) {
    throw new Error("Ollama analysis is missing required fields.");
  }

  return {
    result,
    model: payload.model || ollamaModel,
    timings: {
      promptConstructionMs,
      inferenceMs,
      jsonParsingMs: Math.round(performance.now() - parsingStartedAt),
    },
  };
}
