import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeQuery } from "../utils/database-connectors.js";

const router = express.Router();

// Function to get sample data from database
async function getSampleData(
  dataSource: any,
  tableName: string,
  limit: number = 5
) {
  try {
    if (!dataSource || !dataSource.type || !dataSource.connection) {
      return {
        success: false,
        error: "Invalid data source configuration",
      };
    }

    const query = `SELECT * FROM ${tableName} LIMIT ${limit}`;
    const result = await executeQuery(
      dataSource.type,
      dataSource.connection,
      query
    );
    return {
      success: true,
      data: result.data || [],
      columns: result.columns || [],
    };
  } catch (error) {
    console.error(`❌ Error fetching sample data from ${tableName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to check if prompt is dashboard-related
function isDashboardRelated(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase().trim();

  // ⭐ อนุญาตให้ผ่านคำทักทายและคำถามทั่วไป
  const greetingPatterns = [
    // Thai greetings and questions
    "สวัสดี",
    "หวัดดี",
    "ดีครับ",
    "ดีค่ะ",
    "ทำไรได้บ้าง",
    "ทำอะไรได้บ้าง",
    "คุณทำอะไรได้บ้าง",
    "ช่วยอะไรได้บ้าง",
    "มีอะไรให้ช่วย",
    "ทำอย่างอื่นได้",
    "ทำอย่างอื่นได้ไหม",
    "ช่วยอะไรได้",
    "ช่วยผมได้ไหม",

    // English greetings and questions
    "hello",
    "hi",
    "hey",
    "what can you do",
    "what do you do",
    "how can you help",
    "can you help",
    "help me",
  ];

  // ถ้าเป็นคำทักทายหรือคำถามทั่วไป → ให้ผ่าน
  if (greetingPatterns.some((pattern) => lowerPrompt.includes(pattern))) {
    return true;
  }

  const dashboardKeywords = [
    // English keywords
    "dashboard",
    "chart",
    "graph",
    "widget",
    "visualization",
    "data",
    "kpi",
    "metric",
    "table",
    "bar",
    "line",
    "pie",
    "gauge",
    "filter",
    "analytics",
    "report",
    "display",
    "show",
    "create",
    "add",
    "remove",
    "modify",
    "update",
    "column",
    "field",
    "xfield",
    "yfield",
    "config",
    "configuration",

    // Thai keywords
    "แดชบอร์ด",
    "แผนภูมิ",
    "กราฟ",
    "วิดเจ็ต",
    "ข้อมูล",
    "ตาราง",
    "แสดง",
    "สร้าง",
    "เพิ่ม",
    "ลบ",
    "แก้ไข",
    "เปลี่ยน",
    "อัปเดต",
    "รายงาน",
    "คอลัมน์",
    "ฟิลด์",
    "เติม",
    "ใส่",
    "config",
    "คอนฟิก",
  ];

  return dashboardKeywords.some((keyword) =>
    lowerPrompt.includes(keyword.toLowerCase())
  );
}

// ⭐ NEW: Apply partial changes to config
function applyConfigChanges(currentConfig: any, changes: any): any {
  try {
    const config = JSON.parse(JSON.stringify(currentConfig)); // Deep clone

    switch (changes.action) {
      case "update":
        if (changes.targetType === "widget" && changes.targetId) {
          const widgetIndex = config.widgets?.findIndex(
            (w: any) => w.id === changes.targetId
          );
          if (widgetIndex >= 0 && changes.changes) {
            // Apply each change using dot notation
            for (const [path, value] of Object.entries(changes.changes)) {
              setNestedValue(config.widgets[widgetIndex], path, value);
            }
            console.log(`✅ Updated widget: ${changes.targetId}`);
          }
        } else if (changes.targetType === "theme") {
          config.theme = changes.changes.theme || changes.changes;
        } else if (changes.targetType === "globalSettings") {
          Object.assign(config.globalSettings || {}, changes.changes);
        }
        break;

      case "add":
        if (changes.targetType === "widget" && changes.newWidget) {
          config.widgets = config.widgets || [];
          config.widgets.push(changes.newWidget);
          console.log(`✅ Added widget: ${changes.newWidget.id}`);
        } else if (changes.targetType === "filter" && changes.newFilter) {
          config.filters = config.filters || [];
          config.filters.push(changes.newFilter);
        }
        break;

      case "remove":
        if (changes.targetType === "widget" && changes.targetId) {
          config.widgets = config.widgets?.filter(
            (w: any) => w.id !== changes.targetId
          );
          console.log(`✅ Removed widget: ${changes.targetId}`);
        } else if (changes.targetType === "filter" && changes.targetId) {
          config.filters = config.filters?.filter(
            (f: any) => f.id !== changes.targetId
          );
        }
        break;
    }

    return config;
  } catch (e) {
    console.error("❌ Error applying config changes:", e);
    return null;
  }
}

// Helper: Set nested value using dot notation (e.g., "styleConfig.colors[0]")
function setNestedValue(obj: any, path: string, value: any) {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = isNaN(Number(parts[i + 1])) ? {} : [];
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

// Generate next step suggestions based on context and user language
function generateSuggestions(
  currentConfig: any,
  explanation: string,
  hasTableSchema: boolean = false,
  userLanguage: "th" | "en" = "th"
): string[] {
  const suggestions = [];
  const widgetCount = currentConfig?.widgets?.length || 0;

  // If no table schema, suggest getting column info first
  if (!hasTableSchema) {
    if (userLanguage === "th") {
      suggestions.push("ไปดู Available Columns ใน Columns tab ก่อน");
      suggestions.push("บอกผมว่าเห็น field อะไรบ้างในตาราง");
      suggestions.push("ถามเกี่ยวกับ widget types ที่มี");
    } else {
      suggestions.push("Check Available Columns in Columns tab first");
      suggestions.push("Tell me what fields you see in the table");
      suggestions.push("Ask about available widget types");
    }
    return suggestions;
  }

  // Generate suggestions based on widget count and content
  if (widgetCount === 0) {
    if (userLanguage === "th") {
      suggestions.push("เพิ่ม KPI widget เพื่อแสดงตัวเลขสำคัญ");
      suggestions.push("สร้าง bar chart เปรียบเทียบข้อมูล");
      suggestions.push("เพิ่ม table widget เพื่อแสดงรายละเอียด");
    } else {
      suggestions.push("Add KPI widget to display key metrics");
      suggestions.push("Create bar chart to compare data");
      suggestions.push("Add table widget for detailed data");
    }
  } else if (widgetCount < 3) {
    if (userLanguage === "th") {
      suggestions.push("เพิ่ม line chart เพื่อแสดงแนวโน้มตามเวลา");
      suggestions.push("สร้าง pie chart เพื่อแสดงสัดส่วน");
      suggestions.push("เพิ่ม progress bar หรือ gauge");
    } else {
      suggestions.push("Add line chart to show trends over time");
      suggestions.push("Create pie chart to show proportions");
      suggestions.push("Add progress bar or gauge widget");
    }
  } else {
    if (userLanguage === "th") {
      suggestions.push("ปรับสีและรูปแบบของ widgets");
      suggestions.push("เพิ่ม filter หรือ interactive features");
      suggestions.push("สร้าง metric card แสดง trends");
    } else {
      suggestions.push("Customize colors and styling of widgets");
      suggestions.push("Add filters or interactive features");
      suggestions.push("Create metric cards with trends");
    }
  }

  // Add data-specific suggestions based on explanation content
  if (explanation.includes("sales") || explanation.includes("ยอดขาย")) {
    if (userLanguage === "th") {
      suggestions.push("แสดงยอดขายตามช่วงเวลา");
      suggestions.push("เปรียบเทียบยอดขายตามผลิตภัณฑ์");
    } else {
      suggestions.push("Show sales over time periods");
      suggestions.push("Compare sales by products");
    }
  }

  if (explanation.includes("product") || explanation.includes("สินค้า")) {
    if (userLanguage === "th") {
      suggestions.push("วิเคราะห์สินค้าขายดี top 10");
      suggestions.push("แสดงสต็อกสินค้าด้วย gauge");
    } else {
      suggestions.push("Analyze top 10 best-selling products");
      suggestions.push("Show product inventory with gauge");
    }
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
}

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

      // Check if prompt is dashboard-related
      if (!isDashboardRelated(prompt)) {
        // ⭐ ตอบแบบเป็นธรรมชาติ พยายามเชื่อมโยงกับ Dashboard
        return res.json({
          explanation:
            '� ขอบคุณที่คุยกับผมนะครับ!\n\nแม้ว่าผมจะเชี่ยวชาญเฉพาะด้าน Dashboard แต่ผมยินดีที่จะคุยด้วยเสมอครับ ถ้าคุณมีข้อมูลที่อยากจะวิเคราะห์ หรืออยากทำ dashboard สวยๆ สักอัน ผมพร้อมช่วยเหลือนะครับ! 📊\n\n**ตัวอย่างเช่น:**\n- "ช่วยสร้าง dashboard แสดงยอดขายให้หน่อย"\n- "เพิ่ม bar chart เปรียบเทียบข้อมูล"\n- "ทำ KPI แสดงตัวเลขสำคัญ"\n\nมีอะไรให้ช่วยเรื่อง dashboard ไหมครับ? 😊',
          config: null,
          suggestions: [
            "ช่วยสร้าง dashboard แสดงยอดขายให้หน่อย",
            "เพิ่ม bar chart เปรียบเทียบข้อมูล",
            "ทำ KPI แสดงตัวเลขสำคัญ",
          ],
        });
      }

      // ⭐ SIMPLIFIED: Don't require sample data - just work with config directly
      // Get datasource schema if provided (but don't fetch sample data)
      const {
        tableSchema,
        currentConfig,
        widgetType,
        dataSource,
        selectedTable,
      } = context || {};

      // ⭐ REMOVED: No longer require table schema to generate config
      // User can directly ask to create widgets

      // Get Gemini client (will initialize if needed)
      const geminiClient = getGeminiClient();

      // Default to gemini-2.5-flash (recommended) if not specified
      const selectedModel = model || "gemini-2.5-flash";

      // Build system prompt with context
      const systemPrompt = `You are an intelligent dashboard configuration agent. Your primary job is to CREATE and MODIFY dashboard configurations based on user requests.

LANGUAGE SUPPORT:
- Understand and respond in both English and Thai (ภาษาไทย)
- Match your response language to the user's question

YOUR PRIMARY JOB:
1. READ the current config (if provided)
2. UNDERSTAND what user wants to change/add/remove
3. GENERATE the complete updated config
4. EXPLAIN what you changed

⚠️ IMPORTANT: ALWAYS RETURN A COMPLETE CONFIG
- Never return config: null
- If user asks to modify, return the FULL modified config
- If user asks to create, return a NEW complete config

RESPONSE FORMAT (REQUIRED):
You must return a JSON object with these fields:
{
  "explanation": "คำอธิบายสิ่งที่ทำ (ภาษาเดียวกับที่ user ใช้)",
  "config": {
    "layout": "grid",
    "theme": "light",
    "gridCols": 12,
    "gridRowHeight": 100,
    "widgets": [
      // ... all widgets
    ]
  },
  "suggestions": ["คำแนะนำถัดไป 1", "คำแนะนำถัดไป 2", "คำแนะนำถัดไป 3"]
}

WIDGET TYPES (All 11 supported):
- bar: Bar  ​​​​​​​​​​chart for comparing categories
- line: Line chart for trends over time  
- area: Area chart for trend visualization with fill
- pie: Pie chart for part-to-whole relationships
- doughnut: Doughnut chart (same as pie with center hole)
- scatter: Scatter plot for correlation analysis
- kpi: Single key metric with prefix/suffix
- metric: Advanced metric card with trend indication
- progress: Progress bar for completion rates
- table: Detailed tabular data
- gauge: Progress/capacity metrics with dial visualization

WIDGET CONFIG STRUCTURE:
{
  "id": "widget_X",
  "title": "Widget Title",
  "type": "bar|line|area|pie|doughnut|scatter|kpi|metric|progress|table|gauge",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataConfig": {
    "table": "TABLE_NAME",
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
  "visible": true
}

CRITICAL RULES:
1. orderBy MUST be array format: [{ "field": "column", "direction": "ASC|DESC" }]
2. ALWAYS include "groupBy" when using aggregation with xField
3. For KPI/metric widgets, use "field" (not yField) for the value
4. Generate unique widget IDs like "widget_1", "widget_2", etc.

${
  tableSchema
    ? `\nAVAILABLE DATABASE SCHEMA:\n${JSON.stringify(tableSchema, null, 2)}`
    : `\nNO TABLE SCHEMA PROVIDED - Use placeholder field names like "field1", "field2" or ask user for column names`
}

${selectedTable ? `\nSELECTED TABLE: ${selectedTable}` : ""}

${
  currentConfig
    ? `\nCURRENT DASHBOARD CONFIG (MODIFY THIS):\n${JSON.stringify(
        currentConfig,
        null,
        2
      )}\n\nCurrent widgets count: ${
        currentConfig.widgets?.length || 0
      }\nYour job: Modify this config based on user request and return the COMPLETE updated config.`
    : "\nNo existing config - Create a fresh dashboard config."
}

${widgetType ? `\nREQUESTED WIDGET TYPE: ${widgetType}` : ""}

USER REQUEST: ${prompt}

IMPORTANT: Return ONLY a valid JSON object. No markdown, no extra text.`;

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
      let suggestions = parsedResponse.suggestions || [];

      // Detect user language from prompt
      const userLanguage = /[ก-๙]/.test(prompt) ? "th" : "en";

      // Generate suggestions if not provided by AI
      if (!suggestions || suggestions.length === 0) {
        suggestions = generateSuggestions(
          generatedConfig,
          explanation,
          !!tableSchema,
          userLanguage
        );
      }

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

            // Fix widget type issues
            if (widget.type === "donut" || widget.type === "doughnut") {
              widget.type = "pie";
            }

            // Fix dataConfig issues
            if (widget.dataConfig) {
              // Fix orderBy format - convert string to array format
              if (
                widget.dataConfig.orderBy &&
                typeof widget.dataConfig.orderBy === "string"
              ) {
                const direction = widget.dataConfig.orderDirection || "DESC";
                widget.dataConfig.orderBy = [
                  {
                    field: widget.dataConfig.orderBy,
                    direction: direction.toUpperCase(),
                  },
                ];
                delete widget.dataConfig.orderDirection;
              }

              // Fix KPI valueField -> yField
              if (
                widget.type === "kpi" &&
                widget.dataConfig.valueField &&
                !widget.dataConfig.yField
              ) {
                widget.dataConfig.yField = widget.dataConfig.valueField;
                delete widget.dataConfig.valueField;
              }

              // Ensure groupBy for aggregated fields
              if (
                widget.dataConfig.aggregation &&
                widget.dataConfig.xField &&
                !widget.dataConfig.groupBy
              ) {
                widget.dataConfig.groupBy = [widget.dataConfig.xField];
              }
            }

            // Add tooltipConfig if missing
            if (
              !widget.tooltipConfig &&
              widget.dataConfig?.xField &&
              widget.dataConfig?.yField
            ) {
              widget.tooltipConfig = {
                enabled: true,
                format: `{${widget.dataConfig.xField}}: {${widget.dataConfig.yField}}`,
              };
            }

            return widget;
          }
        );
      }

      console.log(
        "📤 [generate-config] Sending config with",
        generatedConfig?.widgets?.length || 0,
        "widgets"
      );

      res.json({
        success: true,
        config: generatedConfig,
        explanation,
        suggestions,
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

    // Check if message is dashboard-related
    if (!isDashboardRelated(message)) {
      // ⭐ ตอบแบบเป็นธรรมชาติ พยายามเชื่อมโยงกับ Dashboard
      return res.json({
        response:
          '👋 ขอบคุณที่คุยกับผมนะครับ!\n\nแม้ว่าผมจะเชี่ยวชาญเฉพาะด้าน Dashboard แต่ผมยินดีที่จะคุยด้วยเสมอครับ ถ้าคุณมีข้อมูลที่อยากจะวิเคราะห์ หรืออยากทำ dashboard สวยๆ สักอัน ผมพร้อมช่วยเหลือนะครับ! 📊\n\n**ตัวอย่างเช่น:**\n- "ช่วยสร้าง dashboard แสดงยอดขายให้หน่อย"\n- "เพิ่ม bar chart เปรียบเทียบข้อมูล"\n- "ทำ KPI แสดงตัวเลขสำคัญ"\n\nมีอะไรให้ช่วยเรื่อง dashboard ไหมครับ? 😊',
        suggestions: [
          "ช่วยสร้าง dashboard แสดงยอดขายให้หน่อย",
          "เพิ่ม bar chart เปรียบเทียบข้อมูล",
          "ทำ KPI แสดงตัวเลขสำคัญ",
        ],
      });
    }

    // Get Gemini client (will initialize if needed)
    const geminiClient = getGeminiClient();

    // Default to gemini-2.5-flash (recommended) if not specified
    const selectedModel = model || "gemini-2.5-flash";

    const { currentConfig, tableSchema, dataSource, selectedTable } =
      context || {};

    // Try to get sample data if available
    // ⭐ SIMPLIFIED: Don't fetch sample data, work with config directly
    const systemPrompt = `You are an intelligent dashboard configuration assistant. You help users modify their dashboard configurations.

LANGUAGE: Match the user's language (Thai/English).

🎯 YOUR MAIN GOAL:
When user asks to modify config, return ONLY the changes in this format:

---CHANGES---
{
  "action": "update" | "add" | "remove",
  "targetType": "widget" | "filter" | "globalSettings" | "theme",
  "targetId": "widget_xxx" (if updating specific widget),
  "changes": {
    // Only the fields that changed
  },
  "explanation": "Brief explanation of what changed"
}
---END---

📋 EXAMPLES:

User: "เปลี่ยนสี widget แรกเป็นสีดำ"
Response:
ได้เลยครับ! ผมจะเปลี่ยนสีหลักของ widget แรกเป็นสีดำ

---CHANGES---
{
  "action": "update",
  "targetType": "widget",
  "targetId": "widget_advanced_bar_001",
  "changes": {
    "styleConfig.colors[0]": "#000000"
  },
  "explanation": "เปลี่ยนสีหลักของ Bar Chart เป็นสีดำ"
}
---END---

User: "เพิ่ม KPI แสดงยอดขายรวม"
Response:
ได้เลยครับ! ผมจะเพิ่ม KPI widget ใหม่

---CHANGES---
{
  "action": "add",
  "targetType": "widget",
  "newWidget": {
    "id": "widget_kpi_new_001",
    "title": "ยอดขายรวม",
    "type": "kpi",
    "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
    "dataConfig": {
      "table": "...",
      "yField": "totalFromBuyPrice",
      "aggregation": "sum"
    }
  },
  "explanation": "เพิ่ม KPI แสดงยอดขายรวม"
}
---END---

User: "ลบ widget ตัวสุดท้าย"
Response:
ได้เลยครับ! ผมจะลบ widget ตัวสุดท้าย

---CHANGES---
{
  "action": "remove",
  "targetType": "widget",
  "targetId": "widget_multiline_by_branch_001",
  "explanation": "ลบ Sales Trend by Branch widget"
}
---END---

⚠️ IMPORTANT:
- For simple greetings/questions: Just respond conversationally, NO ---CHANGES--- block
- For modifications: Always include ---CHANGES--- block with specific changes
- Never return the entire config, only what changed

WIDGET TYPES: bar, line, area, pie, doughnut, scatter, kpi, metric, progress, table, gauge

${
  currentConfig
    ? `\nCURRENT DASHBOARD CONFIG:\n${JSON.stringify(
        currentConfig,
        null,
        2
      )}\n\nWidgets: ${currentConfig.widgets?.length || 0}`
    : "\nNo dashboard config yet."
}

${tableSchema ? `\nTABLE SCHEMA:\n${JSON.stringify(tableSchema, null, 2)}` : ""}

Be concise and helpful. If user wants to modify config, return the COMPLETE updated config as JSON.`;

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

    // ⭐ Check if message contains modification keywords
    const modificationKeywords = [
      "เปลี่ยน",
      "แก้",
      "เพิ่ม",
      "ลบ",
      "สร้าง",
      "ปรับ",
      "อัพเดท",
      "change",
      "modify",
      "add",
      "remove",
      "create",
      "update",
      "delete",
    ];
    const hasModificationIntent = modificationKeywords.some((kw) =>
      message.toLowerCase().includes(kw.toLowerCase())
    );

    // Try to extract JSON config from the response
    // ⚠️ Only extract if user has modification intent
    let extractedConfig = null;
    let configChanges = null; // New: For partial changes

    if (!hasModificationIntent) {
      console.log("💬 Simple chat - not extracting config");
      console.log("📝 User message:", message);
    } else {
      console.log("🔧 Modification intent detected, extracting changes...");
      console.log("📝 AI Response length:", text.length);

      // ⭐ NEW: Try to find ---CHANGES--- block first (partial updates)
      const changesMatch = text.match(/---CHANGES---\s*([\s\S]*?)\s*---END---/);

      if (changesMatch) {
        try {
          const changesJson = changesMatch[1].trim();
          configChanges = JSON.parse(changesJson);
          console.log("✅ Extracted PARTIAL changes from AI response");
          console.log("📋 Change action:", configChanges.action);
          console.log(
            "🎯 Target:",
            configChanges.targetType,
            configChanges.targetId || ""
          );

          // Apply changes to current config
          if (currentConfig && configChanges) {
            const updatedConfig = applyConfigChanges(
              currentConfig,
              configChanges
            );
            if (updatedConfig) {
              extractedConfig = updatedConfig;
              console.log("✅ Applied changes to config");
            }
          }
        } catch (e) {
          console.log("⚠️ Found ---CHANGES--- block but couldn't parse");
          console.log("❌ Parse error:", e instanceof Error ? e.message : e);
        }
      }

      // Fallback: Try to find full config (legacy format)
      if (!extractedConfig && !configChanges) {
        // Try to find JSON code block first (```json ... ```)
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        let jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : text;

        // Try to match full dashboard config
        const jsonMatch = jsonText.match(
          /\{[\s\S]*?"layout"[\s\S]*?"widgets"[\s\S]*\}/
        );

        if (jsonMatch) {
          try {
            // Clean up any trailing content after the last }
            let jsonStr = jsonMatch[0];
            // Find the balanced closing brace
            let depth = 0;
            let endIndex = 0;
            for (let i = 0; i < jsonStr.length; i++) {
              if (jsonStr[i] === "{") depth++;
              else if (jsonStr[i] === "}") {
                depth--;
                if (depth === 0) {
                  endIndex = i + 1;
                  break;
                }
              }
            }
            if (endIndex > 0) {
              jsonStr = jsonStr.substring(0, endIndex);
            }

            extractedConfig = JSON.parse(jsonStr);
            console.log(
              "✅ Extracted FULL dashboard config from AI response (fallback)"
            );
          } catch (e) {
            console.log("⚠️ Found full config pattern but couldn't parse");
            console.log("❌ Parse error:", e instanceof Error ? e.message : e);
          }
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
          // Apply same fixes as in generate-config endpoint
          const fixedWidgets = widgets.map((widget: any) => {
            // Fix widget type issues
            if (widget.type === "donut" || widget.type === "doughnut") {
              widget.type = "pie";
            }

            // Fix dataConfig issues
            if (widget.dataConfig) {
              // Fix orderBy format
              if (
                widget.dataConfig.orderBy &&
                typeof widget.dataConfig.orderBy === "string"
              ) {
                const direction = widget.dataConfig.orderDirection || "DESC";
                widget.dataConfig.orderBy = [
                  {
                    field: widget.dataConfig.orderBy,
                    direction: direction.toUpperCase(),
                  },
                ];
                delete widget.dataConfig.orderDirection;
              }

              // Fix KPI valueField -> yField
              if (
                widget.type === "kpi" &&
                widget.dataConfig.valueField &&
                !widget.dataConfig.yField
              ) {
                widget.dataConfig.yField = widget.dataConfig.valueField;
                delete widget.dataConfig.valueField;
              }

              // Ensure groupBy for aggregated fields
              if (
                widget.dataConfig.aggregation &&
                widget.dataConfig.xField &&
                !widget.dataConfig.groupBy
              ) {
                widget.dataConfig.groupBy = [widget.dataConfig.xField];
              }

              // Add tooltipConfig if missing
              if (!widget.tooltipConfig) {
                const fields = [];
                if (widget.dataConfig.xField)
                  fields.push(widget.dataConfig.xField);
                if (widget.dataConfig.yField)
                  fields.push(widget.dataConfig.yField);
                widget.tooltipConfig = { fields };
              }
            }

            return widget;
          });

          extractedConfig = {
            widgets: fixedWidgets,
          };
          console.log(
            `✅ Extracted ${widgets.length} widget(s) from AI response`
          );
        }
      }
    } // ⭐ End of hasModificationIntent else block

    // ⭐ ENHANCED: If we extracted widgets, merge with currentConfig to create complete config
    let finalConfig = null;

    if (extractedConfig) {
      if (extractedConfig.layout && extractedConfig.widgets) {
        // It's already a complete config
        finalConfig = extractedConfig;
        console.log("✅ Using complete config from AI");
      } else if (extractedConfig.widgets && currentConfig) {
        // We have widgets, merge with existing config
        finalConfig = {
          ...currentConfig,
          widgets: extractedConfig.widgets,
        };
        console.log("✅ Merged widgets with current config");
      } else if (extractedConfig.widgets) {
        // No current config, create new one
        finalConfig = {
          layout: "grid",
          theme: "light",
          gridCols: 12,
          gridRowHeight: 100,
          widgets: extractedConfig.widgets,
        };
        console.log("✅ Created new config from widgets");
      }
    }

    // Generate suggestions based on response
    const suggestions = generateSuggestions(finalConfig || currentConfig, text);

    console.log("📤 Sending response with config:", finalConfig ? "YES" : "NO");
    if (finalConfig) {
      console.log("📊 Config widgets count:", finalConfig.widgets?.length || 0);
    }
    if (configChanges) {
      console.log("📝 Config changes:", JSON.stringify(configChanges, null, 2));
    }

    res.json({
      success: true,
      response: text,
      config: finalConfig, // Include complete config if found
      configChanges, // ⭐ NEW: Include partial changes for frontend to display
      suggestions,
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
