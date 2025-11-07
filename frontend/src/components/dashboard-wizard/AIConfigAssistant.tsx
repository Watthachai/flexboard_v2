"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, Lightbulb, Settings } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateConfigWithAI, chatWithAI } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  config?: any;
  suggestions?: string[];
  timestamp: Date;
  isTyping?: boolean;
}

interface AIConfigAssistantProps {
  tenantId: string;
  currentConfig?: any;
  tableSchema?: any;
  dataSource?: any;
  selectedTable?: string;
  onShowDiff?: (
    originalConfig: any,
    modifiedConfig: any,
    explanation?: string
  ) => void;
}

export function AIConfigAssistant({
  tenantId,
  currentConfig,
  tableSchema,
  dataSource,
  selectedTable,
  onShowDiff,
}: AIConfigAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: currentConfig?.widgets?.length
        ? `👋 สวัสดีครับ! ผมเห็นว่าคุณมี ${
            currentConfig.widgets.length
          } widget อยู่ใน dashboard แล้ว${
            selectedTable ? ` และเชื่อมต่อกับตาราง "${selectedTable}"` : ""
          } ผมสามารถช่วยเพิ่ม แก้ไข หรือจัดเรียงใหม่ได้ครับ${
            dataSource && selectedTable && tableSchema
              ? " รวมถึงเสนอแนะ widget ที่เหมาะสมกับข้อมูลของคุณ"
              : ""
          } คุณต้องการทำอะไรครับ?\n\n(I can also respond in English if you prefer!)`
        : !tableSchema
        ? `👋 สวัสดีครับ! ผมเป็น AI agent ที่จะช่วยสร้าง dashboard ให้คุณ\n\n**แต่ก่อนอื่น ผมขอดูข้อมูลในตารางของคุณก่อนนะครับ** เพื่อจะได้แนะนำ widget ที่เหมาะสมให้คุณ\n\n🔍 **ขั้นตอน:**\n1. ไปที่แท็บ **"Columns"** ด้านขวามือ\n2. ดูว่ามี field อะไรบ้างในตาราง\n3. กลับมาคุยกับผมใหม่ แล้วบอกว่าเห็น columns อะไรบ้าง\n\nหรือถ้าเห็น columns แล้ว สามารถบอกผมได้เลยครับ ว่ามี field อะไรบ้าง แล้วผมจะแนะนำ dashboard ที่เหมาะสมให้!\n\n(I can also respond in English if you prefer!)`
        : `👋 สวัสดีครับ! ผมเป็น AI agent ที่จะช่วยสร้าง dashboard ให้คุณ${
            selectedTable ? ` จากตาราง "${selectedTable}"` : ""
          }\n\n🎯 **จากข้อมูลที่เห็น** มี columns ที่น่าสนใจมากครับ! ผมสามารถช่วยสร้าง charts, KPIs และตั้งค่าต่างๆ ได้เลย พร้อมวิเคราะห์ข้อมูลจริงเพื่อแนะนำ visualization ที่เหมาะสม\n\nบอกมาเลยว่าอยากจะทำอะไรครับ! เช่น:\n- แสดงตัวเลขสำคัญเป็น KPI\n- เปรียบเทียบข้อมูลด้วย chart\n- แสดงแนวโน้มตามเวลา\n\n(I can also respond in English if you prefer!)`,
      timestamp: new Date(),
      isTyping: true,
      suggestions:
        dataSource && selectedTable && tableSchema
          ? [
              "สร้าง KPI แสดงตัวเลขสำคัญ",
              "สร้างกราฟแท่งเปรียบเทียบข้อมูล",
              "แสดงแนวโน้มตามเวลา",
            ]
          : !tableSchema
          ? [
              "ไปดู Available Columns ใน Columns tab",
              "บอกผมว่าเห็น field อะไรบ้างในตาราง",
              "ถามเกี่ยวกับ widget types ที่มี",
            ]
          : [
              "สร้าง dashboard ใหม่",
              "เพิ่ม chart ใหม่",
              "แสดงข้อมูลในรูปแบบ KPI",
            ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(
    null
  );
  const [displayedContent, setDisplayedContent] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Typing animation effect
  useEffect(() => {
    if (typingMessageIndex !== null) {
      const message = messages[typingMessageIndex];
      if (message && message.isTyping) {
        const fullContent = message.content;
        let currentIndex = 0;

        // Clear any existing interval
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }

        // Start typing animation
        typingIntervalRef.current = setInterval(() => {
          if (currentIndex <= fullContent.length) {
            setDisplayedContent(fullContent.slice(0, currentIndex));
            currentIndex++;

            // Auto scroll during typing
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          } else {
            // Typing complete
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
            }
            setTypingMessageIndex(null);
            setDisplayedContent("");

            // Mark message as no longer typing
            setMessages((prev) =>
              prev.map((msg, idx) => {
                if (idx === typingMessageIndex) {
                  const updatedMsg = { ...msg, isTyping: false };

                  // Schedule diff view update for next tick to avoid setState during render
                  if (updatedMsg.config && currentConfig && onShowDiff) {
                    console.log("🔄 Scheduling onShowDiff with:", {
                      currentConfig,
                      newConfig: updatedMsg.config,
                      currentConfigType: typeof currentConfig,
                      newConfigType: typeof updatedMsg.config,
                      hasLayout: !!updatedMsg.config.layout,
                      hasTheme: !!updatedMsg.config.theme,
                      hasWidgets: !!updatedMsg.config.widgets,
                      widgetCount: updatedMsg.config.widgets?.length || 0,
                      explanation: updatedMsg.content.slice(0, 100) + "...",
                    });

                    // Use setTimeout to defer the state update
                    setTimeout(() => {
                      onShowDiff(
                        currentConfig,
                        updatedMsg.config,
                        updatedMsg.content.slice(0, 100) + "..."
                      );
                    }, 0);
                  }
                  return updatedMsg;
                }
                return msg;
              })
            );
          }
        }); // Typing speed (10ms per character = very fast!)

        return () => {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
          }
        };
      }
    }
  }, [typingMessageIndex, messages, currentConfig, onShowDiff]);

  // Available Gemini models (updated June 2025)
  const models = [
    // Latest Generation (2.5)
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description: "Most advanced - Complex reasoning",
      badge: "Advanced",
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Best price-performance",
      badge: "Recommended",
    },
    {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash-Lite",
      description: "Ultra fast - Cost efficient",
      badge: "Fastest",
    },
    // Previous Generation (2.0)
    {
      id: "gemini-2.0-flash-exp",
      name: "Gemini 2.0 Flash Exp",
      description: "Experimental features",
      badge: "Experimental",
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Second gen workhorse",
      badge: "Stable",
    },
    {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash-Lite",
      description: "Second gen lightweight",
      badge: "Lite",
    },
    // Legacy (1.5)
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      description: "Legacy - High capability",
      badge: "Legacy",
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      description: "Legacy - Fast",
      badge: "Legacy",
    },
  ];

  // Suggested prompts (agent-based) - Thai & English
  const suggestions = currentConfig?.widgets?.length
    ? [
        "เพิ่ม bar chart แสดง top 10 สินค้าที่ขายดี",
        "แก้ KPI แรกให้แสดงค่าเฉลี่ยแทนผลรวม",
        "ลบ pie chart ออก",
        "เก็บ chart เดิมไว้ แต่เพิ่ม line chart สำหรับ trend",
      ]
    : [
        "สร้าง bar chart แสดง top 10 สินค้าที่ขายดี",
        "เพิ่ม KPI แสดงยอดขายรวม",
        "สร้าง line chart แสดง trend ยอดขายตามเวลา",
        "เพิ่ม pie chart แสดงยอดขายตามหมวดหมู่",
      ];

  // Start typing animation for welcome message on mount
  useEffect(() => {
    if (messages.length === 1 && messages[0].isTyping) {
      setTypingMessageIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Set initial thinking status
      setLoadingStatus("🧠 วิเคราะห์คำขอของคุณ...");

      // Check if user wants to generate/modify config or just ask questions
      const inputLower = input.toLowerCase();

      // Config modification keywords (English + Thai)
      const configModifyKeywords = [
        "add",
        "create",
        "generate",
        "make",
        "build",
        "change",
        "modify",
        "update",
        "edit",
        "adjust",
        "remove",
        "delete",
        "ลบ",
        "เพิ่ม",
        "สร้าง",
        "แก้",
        "เปลี่ยน",
        "ปรับ",
      ];

      // Question keywords (English + Thai)
      const questionKeywords = [
        "what",
        "how",
        "why",
        "when",
        "where",
        "who",
        "can",
        "should",
        "is",
        "are",
        "does",
        "explain",
        "tell me",
        "show me",
        "อะไร",
        "ยังไง",
        "ทำไม",
        "เมื่อไหร่",
        "ที่ไหน",
        "สามารถ",
        "ควร",
        "เป็น",
        "คือ",
        "มี",
        "อธิบาย",
        "บอก",
        "แสดง",
      ];

      const hasConfigKeyword = configModifyKeywords.some((keyword) =>
        inputLower.includes(keyword)
      );

      const hasQuestionKeyword = questionKeywords.some((keyword) =>
        inputLower.includes(keyword)
      );

      // If it's a question OR no config modification keywords, treat as chat
      const shouldGenerateConfig = hasConfigKeyword && !hasQuestionKeyword;

      if (shouldGenerateConfig) {
        // Generate/Modify configuration
        setLoadingStatus("⚙️ สร้าง Dashboard Configuration...");

        const result = await generateConfigWithAI(tenantId, {
          prompt: input.trim(),
          model: selectedModel,
          context: {
            tableSchema,
            currentConfig,
            dataSource,
            selectedTable,
          },
        });

        setLoadingStatus("✨ เตรียมแสดงผล...");

        // Use AI's explanation
        const explanation =
          result.explanation ||
          `ผม ${
            currentConfig ? "ปรับแต่ง" : "สร้าง"
          } configuration ตามที่คุณขอแล้วครับ\n\n${
            result.config.widgets
              ? `📊 ${result.config.widgets.length} widget(s)`
              : "Configuration พร้อมแล้ว"
          }`;

        const assistantMessage: Message = {
          role: "assistant",
          content: explanation,
          config: result.config,
          suggestions: result.suggestions || [],
          timestamp: new Date(),
          isTyping: true,
        };

        setMessages((prev) => {
          const newMessages = [...prev, assistantMessage];
          setTypingMessageIndex(newMessages.length - 1);
          return newMessages;
        });
      } else {
        // General chat
        setLoadingStatus("💬 ประมวลผลคำถามของคุณ...");

        const history = messages
          .filter((m) => !m.config) // Don't include config messages in history
          .map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          }));

        setLoadingStatus("🤖 ปรึกษากับ AI Engine...");

        const result = await chatWithAI(tenantId, {
          message: input.trim(),
          model: selectedModel,
          history,
          context: {
            currentConfig,
            tableSchema,
            dataSource,
            selectedTable,
          },
        });

        setLoadingStatus("💡 เตรียมคำตอบ...");

        console.log("🔍 Chat result:", result);
        console.log("🔍 Config from backend:", result.config);

        const assistantMessage: Message = {
          role: "assistant",
          content: result.response,
          config: result.config,
          suggestions: result.suggestions || [],
          timestamp: new Date(),
          isTyping: true,
        };

        setMessages((prev) => {
          const newMessages = [...prev, assistantMessage];
          setTypingMessageIndex(newMessages.length - 1);
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      toast.error(error.message || "Failed to get response from AI");

      setLoadingStatus("❌ เกิดข้อผิดพลาด...");

      const errorMessage: Message = {
        role: "assistant",
        content: `ขออภัยครับ เกิดข้อผิดพลาด: ${
          error.message || "ไม่สามารถประมวลผลคำขอได้"
        } กรุณาลองใหม่อีกครั้งครับ\n\n(Sorry, I encountered an error. Please try again.)`,
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((prev) => {
        const newMessages = [...prev, errorMessage];
        setTypingMessageIndex(newMessages.length - 1);
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  // Function to automatically show columns to AI
  const handleShowColumnsToAI = () => {
    if (!tableSchema?.columns || tableSchema.columns.length === 0) {
      toast.error("ไม่พบข้อมูล columns กรุณาเลือกตารางก่อน");
      return;
    }

    const columnsInfo = tableSchema.columns
      .map((col: any) => `${col.name} (${col.type})`)
      .join(", ");

    const userMessage = `นี่คือ columns ที่ผมเห็นในตาราง ${selectedTable}: ${columnsInfo}`;

    setInput(userMessage);
    // Show thinking status immediately
    setLoadingStatus("📊 กำลังส่งข้อมูล columns ให้ AI...");
    // Auto-send the message after a short delay
    setTimeout(() => {
      handleSend();
    }, 500);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Config Assistant
            {currentConfig?.widgets?.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {currentConfig.widgets.length} widget
                {currentConfig.widgets.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[280px] h-9">
                <Settings className="h-4 w-4 mr-2" />
                <SelectValue>
                  <div className="flex flex-col items-start">
                    <span className="text-sm">
                      {models.find((m) => m.id === selectedModel)?.name ||
                        selectedModel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {models.find((m) => m.id === selectedModel)?.description}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-[350px]">
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="py-3">
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm">
                          {model.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      </div>
                      <Badge
                        variant={
                          model.badge === "Recommended"
                            ? "default"
                            : model.badge === "Advanced"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs shrink-0 ml-2"
                      >
                        {model.badge}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {/* Message Content with Markdown */}
                  <div className="text-sm prose prose-sm max-w-none">
                    {message.isTyping && index === typingMessageIndex ? (
                      <>
                        {displayedContent}
                        <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse" />
                      </>
                    ) : (
                      <ReactMarkdown
                        components={{
                          // Inline code (for colors)
                          code: ({ className, children, ...props }) => {
                            // Check if this is inline code by looking at className
                            const isInline = !className?.includes("language-");
                            return isInline ? (
                              <code
                                className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-800 text-white"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <code
                                className="block px-2 py-1 rounded text-xs font-mono bg-gray-800 text-white overflow-x-auto"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          // Bold text
                          strong: ({ children, ...props }) => (
                            <strong className="font-bold" {...props}>
                              {children}
                            </strong>
                          ),
                          // Lists
                          ul: ({ children, ...props }) => (
                            <ul className="list-disc ml-4 space-y-1" {...props}>
                              {children}
                            </ul>
                          ),
                          li: ({ children, ...props }) => (
                            <li className="text-sm" {...props}>
                              {children}
                            </li>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Show suggestion badge if config is available */}
                  {message.config && !message.isTyping && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <p className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Configuration Ready
                      </p>
                      <p className="text-blue-700 text-xs">
                        {currentConfig
                          ? "Check the diff view in the editor to review changes →"
                          : "This configuration has been generated and can be applied →"}
                      </p>
                    </div>
                  )}

                  {/* Show suggestions if available */}
                  {message.suggestions &&
                    message.suggestions.length > 0 &&
                    !message.isTyping && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          คำแนะนำถัดไป / Next Suggestions
                        </p>
                        <div className="space-y-1">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                // Special handling for column suggestion
                                if (
                                  suggestion.includes("Available Columns") &&
                                  tableSchema?.columns
                                ) {
                                  handleShowColumnsToAI();
                                } else {
                                  setInput(suggestion);
                                }
                              }}
                              className="block w-full text-left text-xs text-green-700 hover:text-green-900 hover:bg-green-100 p-2 rounded border border-green-200 hover:border-green-300 transition-colors"
                            >
                              💡 {suggestion}
                            </button>
                          ))}

                          {/* Show columns button if no table schema and it's the first conversation */}
                          {!tableSchema &&
                            tableSchema?.columns?.length === 0 &&
                            messages.length <= 2 && (
                              <button
                                onClick={handleShowColumnsToAI}
                                className="block w-full text-left text-xs bg-blue-100 text-blue-700 hover:text-blue-900 hover:bg-blue-200 p-2 rounded border border-blue-200 hover:border-blue-300 transition-colors font-medium"
                              >
                                🔍 แสดง Columns ให้ AI ดู (Auto-send columns
                                info)
                              </button>
                            )}
                        </div>
                      </div>
                    )}

                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {/* Typing indicator while loading */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {loadingStatus || "กำลังคิด..."}
                      </span>
                      <span className="text-xs text-gray-500">
                        AI กำลังประมวลผล
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {messages.length === 1 && !isLoading && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <Lightbulb className="h-4 w-4" />
              <span className="font-medium">💡 ลองถามแบบนี้:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                } else if (e.key === "Enter" && e.shiftKey) {
                  // Allow Shift+Enter for new line
                  return;
                }
              }}
              placeholder="บอกมาเลยว่าอยากสร้างอะไร... (Thai or English)&#10;กด Shift+Enter เพื่อขึ้นบรรทัดใหม่"
              disabled={isLoading}
              className="flex-1 resize-none min-h-[60px] max-h-[120px]"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="mb-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
