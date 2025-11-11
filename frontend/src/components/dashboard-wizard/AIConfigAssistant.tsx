"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  Loader2,
  Lightbulb,
  Settings,
  History,
  Save,
  FolderOpen,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
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
import { useChatHistory } from "@/hooks/useChatHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

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
  dashboardId?: string; // NEW: Dashboard ID for chat history
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
  dashboardId = "temp-dashboard", // Default ถ้ายังไม่มี dashboard ID
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

  // ===== NEW: Chat History States =====
  const { user } = useAuth();
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string | null>(
    null
  );
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true); // ⭐ NEW: Loading state

  const chatHistory = useChatHistory({
    userId: user?.uid || "anonymous",
    tenantId,
    dashboardId,
  });

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

    // Auto-load last session (ไม่สร้างใหม่จนกว่า user จะส่งข้อความ)
    const initSession = async () => {
      // ถ้ายังไม่มี user ให้ข้าม
      if (!user?.uid) {
        // ⭐ รอ 0.5 วินาทีก่อนปิด loading เพื่อให้ transition นุ่มนวล
        setTimeout(() => setIsLoadingSession(false), 500);
        return;
      }

      // ใช้ localStorage เป็น lock
      const lockKey = `chatSessionLock_${tenantId}_${dashboardId}`;
      const now = Date.now();
      const lockTime = localStorage.getItem(lockKey);

      // ถ้ามี lock อยู่และยังไม่หมดอายุ (5 วินาที) ให้ข้าม
      if (lockTime && now - parseInt(lockTime) < 5000) {
        console.log("🔒 Session initialization locked, skipping...");
        setIsLoadingSession(false);
        return;
      }

      // ตั้ง lock
      localStorage.setItem(lockKey, now.toString());

      try {
        // รอให้ sessions โหลดเสร็จก่อน
        if (chatHistory.loading) {
          console.log("⏳ Waiting for sessions to load...");
          localStorage.removeItem(lockKey);
          return; // ยังไม่ปิด loading ให้รอต่อ
        }

        // เช็คว่ามี lastSessionId ใน localStorage หรือไม่
        const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
        const lastSessionId = localStorage.getItem(storageKey);

        // ถ้ามี lastSessionId ให้ลอง load session นั้น
        if (lastSessionId) {
          const sessionExists = chatHistory.sessions.find(
            (s) => s.id === lastSessionId
          );
          if (sessionExists) {
            console.log("📂 Loading last active session:", lastSessionId);
            await handleLoadSession(lastSessionId);
            localStorage.removeItem(lockKey);
            // ⭐ รอ 0.5 วินาทีก่อนปิด loading เพื่อให้ transition นุ่มนวล
            setTimeout(() => setIsLoadingSession(false), 500);
            return;
          } else {
            console.log("🗑️ Last session not found, removing...");
            localStorage.removeItem(storageKey);
          }
        }

        // ถ้าไม่มี lastSessionId แต่มี sessions อยู่ ให้ load session ล่าสุด
        if (chatHistory.sessions.length > 0) {
          const latestSession = chatHistory.sessions[0];
          console.log("📂 Loading latest session:", latestSession.id);
          await handleLoadSession(latestSession.id);
          localStorage.removeItem(lockKey);
          // ⭐ รอ 0.5 วินาทีก่อนปิด loading เพื่อให้ transition นุ่มนวล
          setTimeout(() => setIsLoadingSession(false), 500);
          return;
        }

        // ✅ ไม่สร้าง session ใหม่ - ให้รอจนกว่า user จะส่งข้อความครั้งแรก
        console.log("💬 No session found - waiting for first message");
        localStorage.removeItem(lockKey);
        // ⭐ รอ 0.5 วินาทีก่อนปิด loading เพื่อให้ transition นุ่มนวล
        setTimeout(() => setIsLoadingSession(false), 500);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        localStorage.removeItem(lockKey);
        setTimeout(() => setIsLoadingSession(false), 500);
      }
    };

    // เรียกใช้งานเมื่อ sessions โหลดเสร็จแล้ว
    if (!chatHistory.loading && user?.uid) {
      initSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory.loading, chatHistory.sessions.length, user?.uid]);

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

    // ✅ สร้าง session ถ้ายังไม่มี (เมื่อส่งข้อความครั้งแรก)
    let sessionId = chatHistory.currentSessionId;
    if (!sessionId && user?.uid) {
      try {
        console.log("✨ Creating new session with first message...");
        sessionId = await chatHistory.createNewSession(userMessage.content);

        // บันทึก session ลง localStorage
        const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
        localStorage.setItem(storageKey, sessionId);

        console.log("✅ Created session:", sessionId);
      } catch (error) {
        console.error("Failed to create session:", error);
      }
    }

    // Auto-save user message (ถ้ามี session แล้ว)
    if (sessionId) {
      try {
        await chatHistory.saveMessage(sessionId, {
          role: "user",
          content: userMessage.content,
        });
      } catch (error) {
        console.error("Failed to auto-save user message:", error);
      }
    }

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

        // Auto-save assistant message
        if (sessionId) {
          autoSaveAssistantMessage(sessionId, assistantMessage);
        }
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

        // Auto-save assistant message
        if (sessionId) {
          autoSaveAssistantMessage(sessionId, assistantMessage);
        }
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

  // ===== NEW: Chat History Functions =====
  const autoSaveAssistantMessage = async (
    sessionId: string,
    message: Message
  ) => {
    if (sessionId) {
      try {
        await chatHistory.saveMessage(sessionId, {
          role: "assistant",
          content: message.content,
          config: message.config,
        });
      } catch (error) {
        console.error("Failed to auto-save assistant message:", error);
      }
    }
  };

  const handleSaveCurrentSession = async () => {
    if (!chatHistory.currentSessionId || messages.length === 0) return;

    try {
      // Save all messages to current session
      for (const msg of messages) {
        await chatHistory.saveMessage(chatHistory.currentSessionId, {
          role: msg.role,
          content: msg.content,
          config: msg.config,
        });
      }
      toast.success("บันทึก Chat History แล้ว!");
    } catch (error) {
      console.error("Failed to save session:", error);
      toast.error("ไม่สามารถบันทึก Chat History ได้");
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      const session = await chatHistory.loadSession(sessionId);
      if (session) {
        console.log("📂 Loaded session:", session);
        console.log("📝 Messages in session:", session.messages);

        // Convert to Message format
        const loadedMessages: Message[] = session.messages.map((msg: any) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          config: msg.config,
          timestamp:
            typeof msg.timestamp === "string"
              ? new Date(msg.timestamp)
              : msg.timestamp,
          isTyping: false,
        }));

        console.log("✅ Converted messages:", loadedMessages);

        setMessages(loadedMessages);
        setCurrentSessionTitle(session.title);
        setShowHistoryDialog(false);

        // บันทึก session ที่เปิดลง localStorage
        const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
        localStorage.setItem(storageKey, sessionId);

        toast.success(`โหลด "${session.title}" แล้ว`);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("ไม่สามารถโหลด Chat History ได้");
    }
  };

  const handleNewChat = async () => {
    try {
      setIsLoadingSession(true); // แสดง loading
      const sessionId = await chatHistory.createNewSession(
        "New Dashboard Chat"
      );
      setCurrentSessionTitle("New Chat");
      setMessages([
        {
          role: "assistant",
          content: `👋 เริ่มการสนทนาใหม่! พร้อมช่วยสร้าง dashboard แล้วครับ`,
          timestamp: new Date(),
          isTyping: false,
        },
      ]);

      // บันทึก session ใหม่ลง localStorage
      const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
      localStorage.setItem(storageKey, sessionId);

      setIsLoadingSession(false); // ปิด loading
      toast.success("เริ่ม Chat ใหม่แล้ว!");
    } catch (error) {
      console.error("Failed to create new session:", error);
      setIsLoadingSession(false); // ปิด loading แม้ error
      toast.error("ไม่สามารถสร้าง Chat ใหม่ได้");
    }
  };

  const handleExportSession = async () => {
    if (!chatHistory.currentSessionId) {
      toast.error("ยังไม่มี session ที่จะ export");
      return;
    }

    try {
      const jsonData = await chatHistory.exportSession(
        chatHistory.currentSessionId
      );
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${
        currentSessionTitle || "session"
      }-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export สำเร็จ!");
    } catch (error) {
      console.error("Failed to export session:", error);
      toast.error("ไม่สามารถ export ได้");
    }
  };

  const handleImportSession = async () => {
    // TODO: Implement import feature in backend
    toast.info("Import feature coming soon!");
    return;

    /* 
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await chatHistory.importSession(text);
        toast.success("Import สำเร็จ!");
        chatHistory.refreshSessions();
      } catch (error) {
        console.error("Failed to import session:", error);
        toast.error("ไม่สามารถ import ได้");
      }
    };
    input.click();
    */
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await chatHistory.deleteSession(sessionId);
      toast.success("ลบ session แล้ว!");
      setDeleteSessionId(null);
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("ไม่สามารถลบ session ได้");
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
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-base">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Assistant
              {currentConfig?.widgets?.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {currentConfig.widgets.length} widget
                  {currentConfig.widgets.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {/* Chat History Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleNewChat} className="text-xs">
                    <Save className="h-3.5 w-3.5 mr-2" />
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSaveCurrentSession}
                    className="text-xs"
                  >
                    <Save className="h-3.5 w-3.5 mr-2" />
                    Save Current
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowHistoryDialog(true)}
                    className="text-xs"
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-2" />
                    Load Session
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleExportSession}
                    className="text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleImportSession}
                    className="text-xs"
                  >
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Import
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Model Selection - Compact */}
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[140px] h-7 text-xs">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue>
                    {models
                      .find((m) => m.id === selectedModel)
                      ?.name.replace("Gemini ", "") || selectedModel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[280px]">
                  {models.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className="py-2"
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium text-xs">
                            {model.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
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
                          className="text-[9px] shrink-0 ml-1 px-1 py-0"
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
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {/* ⭐ Loading Indicator */}
            {isLoadingSession ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                  <p className="text-sm text-gray-600">
                    Loading chat history...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-2.5 ${
                        message.role === "user"
                          ? "bg-blue-600 text-white text-sm"
                          : "bg-gray-100 text-gray-900 text-sm"
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
                                const isInline =
                                  !className?.includes("language-");
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
                                <ul
                                  className="list-disc ml-4 space-y-1"
                                  {...props}
                                >
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
                                      suggestion.includes(
                                        "Available Columns"
                                      ) &&
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

                      <div className="text-[10px] opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Typing indicator while loading */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                          <span
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                        <span className="text-xs">
                          {loadingStatus || "กำลังคิด..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Suggestions */}
          {!isLoadingSession && messages.length === 1 && !isLoading && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-600">
                <Lightbulb className="h-3 w-3" />
                <span className="font-medium">ลองถาม:</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-[11px] h-auto py-1.5 justify-start text-left"
                  >
                    💡 {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-3">
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
                placeholder="บอกมาเลยว่าอยากสร้างอะไร..."
                disabled={isLoading}
                className="flex-1 resize-none min-h-[50px] max-h-[100px] text-sm"
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

      {/* Chat History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Chat History</DialogTitle>
            <DialogDescription>
              Load previous conversations for this dashboard
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {chatHistory.loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading sessions...
                </div>
              ) : chatHistory.sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No chat history yet
                </div>
              ) : (
                chatHistory.sessions.map((session) => {
                  // เช็คว่าเป็น active session หรือไม่
                  const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
                  const activeSessionId = localStorage.getItem(storageKey);
                  const isActive = session.id === activeSessionId;

                  return (
                    <div
                      key={session.id}
                      className={`flex items-center gap-2 p-3 border rounded-lg ${
                        isActive
                          ? "bg-blue-50 border-blue-300"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start text-left h-auto p-2"
                        onClick={() => handleLoadSession(session.id)}
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="flex items-center gap-2 w-full">
                            <span
                              className={`font-medium ${
                                isActive ? "text-blue-700" : ""
                              }`}
                            >
                              {session.title}
                            </span>
                            {isActive && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {session.messages.length} messages •{" "}
                            {new Date(session.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteSessionId(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteSessionId}
        onOpenChange={() => setDeleteSessionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ chat session นี้?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                deleteSessionId && handleDeleteSession(deleteSessionId)
              }
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
