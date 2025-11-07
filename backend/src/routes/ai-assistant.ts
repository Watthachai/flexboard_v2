import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Initialize Gemini AI - use lazy initialization
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("🔍 [AI Assistant] Initializing Gemini client...");
    console.log(`🔍 [AI Assistant] API Key length: ${apiKey?.length || 0}`);
    console.log(
      `🔍 [AI Assistant] API Key preview: ${
        apiKey ? apiKey.substring(0, 10) + "..." : "NOT SET"
      }`
    );

    if (!apiKey) {
      console.error("⚠️ GEMINI_API_KEY is not set in environment variables!");
      console.error("Please add GEMINI_API_KEY to your .env file");
      throw new Error("GEMINI_API_KEY is not configured");
    }

    genAI = new GoogleGenerativeAI(apiKey);
    console.log("✅ [AI Assistant] Gemini client initialized");
  }
  return genAI;
}

/**
 * POST /api/tenants/:tenantId/ai-assistant/generate-config
 * Generate dashboard configuration from natural language prompt
 */
router.post(
  "/tenants/:tenantId/ai-assistant/generate-config",
  async (req, res) => {
    try {
      const { prompt, context, model } = req.body;
      const { tenantId } = req.params;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Get Gemini client (will initialize if needed)
      const geminiClient = getGeminiClient();

      // Default to gemini-2.5-flash (recommended) if not specified
      const selectedModel = model || "gemini-2.5-flash";

      // Get datasource schema if provided
      const { tableSchema, currentConfig, widgetType } = context || {};

      // Build system prompt with context
      const systemPrompt = `You are an intelligent dashboard configuration agent. You work incrementally with users to build and refine dashboards.

LANGUAGE SUPPORT:
- You can understand and respond in both English and Thai (ภาษาไทย)
- If user asks in Thai, respond in Thai
- If user asks in English, respond in English
- Your explanations should match the user's language

YOUR ROLE AS AN AGENT:
1. ANALYZE the current dashboard configuration (if provided)
2. UNDERSTAND what the user wants to change/add (in any language)
3. SUGGEST incremental modifications (keep existing, modify, add new, or remove)
4. EXPLAIN your reasoning and what will change (in user's language)
5. Generate ONLY the modified parts or full config as needed

WORKING MODE:
- If currentConfig exists: Work incrementally, preserve existing widgets unless user asks to change/remove
- If no currentConfig: Generate fresh configuration
- Always explain what you're keeping, changing, or adding

RESPONSE FORMAT (for config generation):
You must return a JSON object with TWO parts:
{
  "explanation": "Brief explanation of what you're doing in the same language as user's request (e.g., 'I'm keeping your existing 2 KPI widgets and adding a new bar chart to show sales by product.' or 'ผมจะเก็บ KPI widget 2 อันที่มีอยู่ และเพิ่ม bar chart ใหม่เพื่อแสดงยอดขายตามสินค้า')",
  "config": {
    "layout": "grid",
    "theme": "light",
    "gridCols": 12,
    "gridRowHeight": 100,
    "widgets": [...]
  }
}

AGENT COMMANDS YOU UNDERSTAND (English & Thai):
- "add/create X" / "เพิ่ม/สร้าง X" → Add new widget, keep existing
- "change/modify X" / "แก้ไข/เปลี่ยน X" → Update specific widget
- "remove/delete X" / "ลบ X" → Remove specific widget
- "keep X, but change Y" / "เก็บ X แต่เปลี่ยน Y" → Preserve some, modify others
- "replace X with Y" / "แทนที่ X ด้วย Y" → Replace specific widget
- "start over" / "เริ่มใหม่" → Generate fresh config

DASHBOARD CONFIG STRUCTURE:
{
  "layout": "grid",
  "theme": "light",
  "gridCols": 12,
  "gridRowHeight": 100,
  "widgets": [...]
}

WIDGET CONFIG STRUCTURE:
{
  "id": "widget_X",
  "title": "Widget Title",
  "type": "bar|line|pie|doughnut|kpi|table|gauge",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataConfig": {
    "table": "table_name",
    "xField": "column_name",
    "yField": "column_name",
    "aggregation": "sum|avg|count|min|max",
    "groupBy": ["column_name"],
    "orderBy": [{ "field": "column_name", "direction": "ASC|DESC" }],
    "limit": 10
  },
  "styleConfig": {
    "color": "#3b82f6",
    "colors": ["#3b82f6", "#8b5cf6"],
    "showLegend": true,
    "showGrid": true,
    "prefix": "฿",
    "suffix": " units"
  },
  "tooltipConfig": {
    "enabled": true,
    "format": "{fieldName}: {value}"
  },
  "visible": true
}

WIDGET TYPES:
- bar: Bar chart for comparing categories
- line: Line chart for trends over time
- pie/doughnut: Part-to-whole relationships (limit 5-8 slices)
- kpi: Single key metric with prefix/suffix
- table: Detailed tabular data
- gauge: Progress/capacity metrics

SMART POSITIONING:
- When adding widgets to existing config, calculate positions to avoid overlap
- Use available space efficiently
- Keep existing widget positions unless user asks to reorganize

AGGREGATION + GROUP BY:
- ALWAYS use "aggregation" when using "groupBy"
- Example: {"yField": "totalSales", "aggregation": "sum", "groupBy": ["productName"]}

${
  tableSchema
    ? `\nAVAILABLE DATABASE SCHEMA:\n${JSON.stringify(tableSchema, null, 2)}`
    : ""
}

${
  currentConfig
    ? `\nCURRENT DASHBOARD CONFIG (analyze this):\n${JSON.stringify(
        currentConfig,
        null,
        2
      )}\n\nCurrent widgets count: ${
        currentConfig.widgets?.length || 0
      }\nYour job: Work with this existing config incrementally.`
    : "\nNo existing config - generate fresh dashboard."
}

${widgetType ? `\nREQUESTED WIDGET TYPE: ${widgetType}` : ""}

USER REQUEST: ${prompt}

IMPORTANT: Return ONLY a JSON object with "explanation" and "config" fields. No markdown, no extra text.`;

      // Call Gemini API with selected model
      const modelInstance = geminiClient.getGenerativeModel({
        model: selectedModel,
      });
      const result = await modelInstance.generateContent(systemPrompt);
      const response = await result.response;
      let text = response.text();

      console.log("Gemini Raw Response:", text);

      // Clean up response - remove markdown code blocks if present
      text = text.trim();
      if (text.startsWith("```json")) {
        text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (text.startsWith("```")) {
        text = text.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      // Try to parse as JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", text);
        return res.status(500).json({
          error: "AI generated invalid JSON",
          rawResponse: text,
          suggestion: "Please try rephrasing your request",
        });
      }

      // Extract explanation and config from agent response
      const explanation =
        parsedResponse.explanation || "Configuration generated successfully.";
      let generatedConfig = parsedResponse.config || parsedResponse;

      // Validate and enhance the config
      if (generatedConfig.widgets) {
        generatedConfig.widgets = generatedConfig.widgets.map(
          (widget: any, index: number) => {
            // Ensure required fields
            if (!widget.id) widget.id = `widget_${Date.now()}_${index}`;
            if (!widget.visible) widget.visible = true;

            // Ensure proper position
            if (!widget.position) {
              widget.position = { x: 0, y: 0, w: 6, h: 4 };
            }

            return widget;
          }
        );
      }

      res.json({
        success: true,
        config: generatedConfig,
        explanation,
        prompt,
        model: selectedModel,
      });
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      res.status(500).json({
        error: error.message || "Failed to generate configuration",
        details: error.toString(),
      });
    }
  }
);

/**
 * POST /api/tenants/:tenantId/ai-assistant/chat
 * General chat with AI assistant about dashboard configuration
 */
router.post("/tenants/:tenantId/ai-assistant/chat", async (req, res) => {
  try {
    const { message, history, context, model } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get Gemini client (will initialize if needed)
    const geminiClient = getGeminiClient();

    // Default to gemini-2.5-flash (recommended) if not specified
    const selectedModel = model || "gemini-2.5-flash";

    const { currentConfig, tableSchema } = context || {};

    const systemPrompt = `You are an intelligent dashboard configuration agent with memory of the current state.

LANGUAGE SUPPORT:
- You can understand and respond in both English and Thai (ภาษาไทย)
- Match your response language to the user's question language
- Be natural and conversational in whichever language you use

YOUR CAPABILITIES:
- Understand the current dashboard configuration
- Provide advice on modifications (add, remove, change, keep)
- Explain visualization best practices (in user's language)
- Help with data configuration
- Debug issues
- Suggest improvements

BE AGENT-LIKE:
- Remember what user has in their dashboard
- Suggest incremental changes
- Explain trade-offs
- Be conversational and helpful
- Respond in the same language as the user's question

CRITICAL: HOW TO RESPOND WITH CONFIG CHANGES
========================================
When user asks to MODIFY/CHANGE an existing widget:
1. Respond with explanation in plain text
2. Then add ONLY the modified widget(s) in JSON format
3. DO NOT send the entire dashboard config - only the widget(s) being changed

CORRECT Example (modifying 1 widget):
"ได้เลยครับ! ผมจะเปลี่ยนสี widget 'Top 10 Products' เป็นสีน้ำเงินเข้ม #1e3a8a

Here's the updated widget:

{
  "id": "widget_1",
  "title": "Top 10 Products by Sales",
  "type": "bar",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataConfig": { ... },
  "styleConfig": {
    "color": "#1e3a8a"
  }
}"

WRONG Example (sending entire config - NEVER DO THIS):
{
  "layout": "grid",
  "widgets": [ ... all 8 widgets ... ]  ❌ DON'T DO THIS!
}

When to send FULL config vs WIDGET only:
- User says "เปลี่ยนสี widget X" → Send ONLY that widget
- User says "แก้ไข 2 widget" → Send ONLY those 2 widgets  
- User says "เพิ่ม widget ใหม่" → Send ONLY the new widget
- User says "สร้าง dashboard ใหม่" → Send FULL config

${
  currentConfig
    ? `\nCURRENT DASHBOARD STATE:\n${JSON.stringify(
        currentConfig,
        null,
        2
      )}\n\nYou can see the user currently has ${
        currentConfig.widgets?.length || 0
      } widget(s). Reference these when discussing changes.`
    : "\nNo dashboard created yet. Help user get started."
}

${
  tableSchema
    ? `\nAVAILABLE DATA:\n${JSON.stringify(tableSchema, null, 2)}`
    : ""
}

Be concise, friendly, and actionable. Provide specific examples when helpful. Always respond in the same language as the user's message.`;

    // Build chat history for Gemini
    const chatHistory = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Hello! I'm your dashboard configuration assistant. I can help you create charts, KPIs, and configure your dashboard. What would you like to create?",
          },
        ],
      },
    ];

    // Add previous messages
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        chatHistory.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      });
    }

    // Add current message
    chatHistory.push({
      role: "user",
      parts: [{ text: message }],
    });

    const modelInstance = geminiClient.getGenerativeModel({
      model: selectedModel,
    });
    const chat = modelInstance.startChat({
      history: chatHistory.slice(0, -1), // Don't include the last message
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Try to extract JSON config from the response
    let extractedConfig = null;

    // Try to match full dashboard config first
    let jsonMatch = text.match(/\{[\s\S]*?"layout"[\s\S]*?"widgets"[\s\S]*?\}/);

    if (jsonMatch) {
      try {
        extractedConfig = JSON.parse(jsonMatch[0]);
        console.log("✅ Extracted FULL dashboard config from AI response");
      } catch (e) {
        console.log("⚠️ Found full config pattern but couldn't parse");
      }
    }

    // If no full config, try to extract widgets using proper JSON parsing
    if (!extractedConfig) {
      // Find all balanced JSON objects by counting braces
      const widgets: any[] = [];
      let depth = 0;
      let start = -1;

      for (let i = 0; i < text.length; i++) {
        if (text[i] === "{") {
          if (depth === 0) start = i;
          depth++;
        } else if (text[i] === "}") {
          depth--;
          if (depth === 0 && start !== -1) {
            // Found a complete JSON object
            const jsonStr = text.substring(start, i + 1);
            try {
              const parsed = JSON.parse(jsonStr);
              // Check if this looks like a widget
              if (
                parsed.id &&
                parsed.type &&
                typeof parsed.id === "string" &&
                parsed.id.startsWith("widget_")
              ) {
                widgets.push(parsed);
                console.log(
                  `✅ Found widget: ${parsed.id} (${
                    parsed.title || "untitled"
                  })`
                );
              }
            } catch (e) {
              // Not valid JSON, skip
            }
            start = -1;
          }
        }
      }

      if (widgets.length > 0) {
        extractedConfig = {
          widgets: widgets,
        };
        console.log(
          `✅ Extracted ${widgets.length} widget(s) from AI response`
        );
      }
    }

    res.json({
      success: true,
      response: text,
      config: extractedConfig, // Include config if found
      model: selectedModel,
    });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({
      error: error.message || "Failed to process chat message",
    });
  }
});

export default router;
