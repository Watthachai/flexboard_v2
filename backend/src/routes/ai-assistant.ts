import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeQuery } from "../utils/database-connectors";

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

  const lowerPrompt = prompt.toLowerCase();
  return dashboardKeywords.some((keyword) =>
    lowerPrompt.includes(keyword.toLowerCase())
  );
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
        return res.json({
          explanation:
            "ฉันเป็น AI ที่เชี่ยวชาญเฉพาะด้านการสร้างและจัดการ Dashboard เท่านั้น กรุณาถามคำถามที่เกี่ยวข้องกับ Dashboard, Chart, Widget, หรือการแสดงผลข้อมูลครับ",
          config: null,
          suggestions: [
            "สร้าง dashboard ใหม่",
            "เพิ่ม chart ใหม่",
            "แสดงข้อมูลในรูปแบบ KPI",
          ],
        });
      }

      // Get datasource schema and sample data if provided
      const {
        tableSchema,
        currentConfig,
        widgetType,
        dataSource,
        selectedTable,
      } = context || {};

      // If no table schema is provided and user wants to create dashboard, ask to see columns first
      if (
        !tableSchema &&
        !currentConfig &&
        (prompt.includes("สร้าง") ||
          prompt.includes("create") ||
          prompt.includes("dashboard"))
      ) {
        return res.json({
          explanation:
            "ผมขอดูข้อมูลในตารางของคุณก่อนนะครับ เพื่อจะได้แนะนำ widget ที่เหมาะสมให้คุณครับ\n\nขั้นตอน:\n1. ไปที่ Columns tab ด้านขวา\n2. ดู Available Columns ที่มี\n3. กลับมาคุยกับผมใหม่ แล้วบอกว่าเห็น columns อะไรบ้าง\n\nหรือถ้าเห็น columns แล้ว สามารถบอกผมได้เลยว่ามี field อะไรบ้าง แล้วผมจะแนะนำ dashboard ที่เหมาะสมให้ครับ",
          config: null,
          suggestions: [
            "ดู Available Columns ใน Columns tab",
            "บอกผมว่าเห็น field อะไรบ้างในตาราง",
            "ถามเกี่ยวกับ widget types ที่มี",
          ],
        });
      }

      // Try to get sample data if we have data source and table
      let sampleData = null;
      if (dataSource && selectedTable) {
        console.log(
          `🔍 [AI Assistant] Fetching sample data from ${selectedTable}...`
        );
        sampleData = await getSampleData(dataSource, selectedTable, 3);
        if (sampleData.success && sampleData.data) {
          console.log(
            `✅ [AI Assistant] Got ${sampleData.data.length} sample records`
          );
        } else {
          console.log(
            `❌ [AI Assistant] Failed to get sample data: ${
              sampleData.error || "Unknown error"
            }`
          );
        }
      }

      // Get Gemini client (will initialize if needed)
      const geminiClient = getGeminiClient();

      // Default to gemini-2.5-flash (recommended) if not specified
      const selectedModel = model || "gemini-2.5-flash";

      // Build system prompt with context
      const systemPrompt = `You are an intelligent dashboard configuration agent with conversational capabilities. You work incrementally with users to build and refine dashboards through natural conversation.

CONVERSATION FLOW STRATEGY:
1. If this is the first interaction and no columns are provided: ASK TO SEE COLUMNS FIRST
2. If columns are provided: ANALYZE and SUGGEST appropriate visualizations
3. In follow-up messages: BUILD on previous suggestions and refine based on user feedback

LANGUAGE SUPPORT:
- You can understand and respond in both English and Thai (ภาษาไทย)
- If user asks in Thai, respond in Thai
- If user asks in English, respond in English
- Your explanations should match the user's language

CONVERSATION STARTER MODE:
If no table schema or current config is provided, respond in this conversational format:
{
  "explanation": "ผมขอดูข้อมูลในตารางของคุณก่อนนะครับ ว่ามี column อะไรบ้าง เพื่อจะได้แนะนำ widget ที่เหมาะสมให้คุณครับ กรุณาเลือกตารางและดูข้อมูลใน Columns tab ก่อนนะครับ",
  "config": null,
  "suggestions": [
    "เลือกตารางและดู Available Columns",
    "กลับมาคุยกับผมใหม่หลังจากเห็น columns แล้ว",
    "ถามเกี่ยวกับ widget types ที่มี"
  ]
}

COLUMN ANALYSIS MODE:
When you have table schema, provide detailed analysis:
{
  "explanation": "จากข้อมูลที่เห็น มี columns ที่น่าสนใจมากครับ! เช่น dataDate สำหรับแกนเวลา, qtyFromThisDoc และ totalFromBuyPrice สำหรับแสดงยอดและจำนวน, prodName และ prodGrp สำหรับจัดกลุ่มสินค้า แนะนำให้เริ่มจาก KPI card แสดงยอดรวม + Bar chart เปรียบเทียบสินค้า + Line chart แสดงแนวโน้มตามวันที่ครับ",
  "config": {
    // Generated based on available columns
  },
  "suggestions": [
    "เพิ่ม Time series chart ด้วย dataDate",
    "สร้าง Product comparison ด้วย prodName", 
    "แสดง Age analysis ด้วย ageBucket"
  ]
}

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
You must return a JSON object with THREE parts:
{
  "explanation": "Brief explanation of what you're doing in the same language as user's request (e.g., 'I'm keeping your existing 2 KPI widgets and adding a new bar chart to show sales by product.' or 'ผมจะเก็บ KPI widget 2 อันที่มีอยู่ และเพิ่ม bar chart ใหม่เพื่อแสดงยอดขายตามสินค้า')",
  "config": {
    "layout": "grid",
    "theme": "light",
    "gridCols": 12,
    "gridRowHeight": 100,
    "widgets": [...]
  },
  "suggestions": [
    "คำแนะนำการปรับปรุงหรือเพิ่มเติมถัดไป",
    "Next improvement or addition suggestion",
    "อีกหนึ่งข้อเสนอแนะ"
  ]
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
  "type": "bar|line|area|pie|doughnut|scatter|kpi|metric|progress|table|gauge",
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
    "showLabels": true,
    "prefix": "฿",
    "suffix": " units"
  },
  "tooltipConfig": {
    "enabled": true,
    "format": "{fieldName}: {value}"
  },
  "visible": true
}

WIDGET TYPES (All 11 supported):
- bar: Bar chart for comparing categories
- line: Line chart for trends over time
- area: Area chart for trend visualization with fill
- pie: Pie chart for part-to-whole relationships (limit 5-8 slices)
- doughnut: Doughnut chart (same as pie with center hole)
- scatter: Scatter plot for correlation analysis (needs both xField and yField)
- kpi: Single key metric with prefix/suffix
- metric: Advanced metric card with trend indication
- progress: Progress bar for completion rates
- table: Detailed tabular data
- gauge: Progress/capacity metrics with dial visualization

CRITICAL RULES:
1. Support ALL 11 widget types: bar, line, area, pie, doughnut, scatter, kpi, metric, progress, table, gauge
2. orderBy MUST be array format: [{ "field": "column", "direction": "ASC|DESC" }]
3. ALWAYS include "groupBy" when using aggregation with xField
4. For KPI widgets, use "yField" for the value field (not "valueField")
5. Include tooltipConfig for better user experience
6. For scatter plots, REQUIRE both xField and yField

SMART POSITIONING:
- When adding widgets to existing config, calculate positions to avoid overlap
- Use available space efficiently
- Keep existing widget positions unless user asks to reorganize

AGGREGATION + GROUP BY:
- ALWAYS use "aggregation" when using "groupBy"
- Example: {"yField": "totalSales", "aggregation": "sum", "groupBy": ["productName"]}

CONVERSATIONAL EXAMPLES:
User: "สร้าง dashboard ให้หน่อย"
AI: "ผมขอดูข้อมูลในตารางของคุณก่อนนะครับ ว่ามี column อะไรบ้าง เพื่อจะได้แนะนำ widget ที่เหมาะสมให้คุณครับ"

User (after seeing columns): "มี dataDate, corp, prodName, qtyFromThisDoc อะไรแบบนี้"
AI: "เยี่ยมเลยครับ! จากข้อมูลที่เห็น แนะนำให้เริ่มด้วย 1) KPI card แสดงยอดรวม qtyFromThisDoc 2) Bar chart เปรียบเทียบ quantity ตาม prodName 3) Line chart แสดงแนวโน้ม quantity ตาม dataDate เป็นอย่างไรครับ?"

${
  tableSchema
    ? `\nAVAILABLE DATABASE SCHEMA:\n${JSON.stringify(tableSchema, null, 2)}`
    : ""
}

${
  sampleData &&
  sampleData.success &&
  sampleData.data &&
  sampleData.data.length > 0
    ? `\nSAMPLE DATA FROM TABLE "${selectedTable}" (${
        sampleData.data.length
      } records):\n${JSON.stringify(
        sampleData.data,
        null,
        2
      )}\n\nUse this sample data to understand the actual data structure and suggest appropriate visualizations.`
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

      res.json({
        success: true,
        config: generatedConfig,
        explanation,
        suggestions,
        prompt,
        model: selectedModel,
        sampleDataUsed: sampleData?.success || false,
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
      return res.json({
        response:
          "ฉันเป็น AI ที่เชี่ยวชาญเฉพาะด้านการสร้างและจัดการ Dashboard เท่านั้น กรุณาถามคำถามที่เกี่ยวข้องกับ Dashboard, Chart, Widget, หรือการแสดงผลข้อมูลครับ",
        suggestions: [
          "สร้าง dashboard ใหม่",
          "เพิ่ม chart ใหม่",
          "แสดงข้อมูลในรูปแบบ KPI",
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
    let sampleData = null;
    if (dataSource && selectedTable) {
      sampleData = await getSampleData(dataSource, selectedTable, 3);
    }

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

CRITICAL CONFIG RULES:
1. ALWAYS use "pie" instead of "donut" or "doughnut"
2. orderBy MUST be array format: [{ "field": "column", "direction": "ASC|DESC" }]
3. ALWAYS include "groupBy" when using aggregation with xField
4. For KPI widgets, use "yField" for the value field (not "valueField")
5. Include tooltipConfig for better user experience

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
    ? `\nAVAILABLE DATABASE SCHEMA:\n${JSON.stringify(tableSchema, null, 2)}`
    : ""
}

${
  sampleData &&
  sampleData.success &&
  sampleData.data &&
  sampleData.data.length > 0
    ? `\nSAMPLE DATA FROM TABLE "${selectedTable}" (${
        sampleData.data.length
      } records):\n${JSON.stringify(
        sampleData.data,
        null,
        2
      )}\n\nUse this sample data to provide better suggestions based on actual data.`
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

    // Generate suggestions based on response
    const suggestions = generateSuggestions(
      extractedConfig || currentConfig,
      text
    );

    res.json({
      success: true,
      response: text,
      config: extractedConfig, // Include config if found
      suggestions,
      model: selectedModel,
      sampleDataUsed: sampleData?.success || false,
    });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({
      error: error.message || "Failed to process chat message",
    });
  }
});

export default router;
