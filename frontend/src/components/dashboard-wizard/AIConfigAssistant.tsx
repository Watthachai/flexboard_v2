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
  X,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileCode,
  Search,
  Pencil,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";

// ⭐ Agent Step Interface - แสดง process แบบ step-by-step
interface AgentStep {
  id: string;
  type: "read" | "analyze" | "edit" | "complete";
  title: string;
  description?: string;
  status: "pending" | "running" | "complete" | "error";
  details?: string;
  timestamp?: Date;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  config?: any;
  configChanges?: ConfigChanges; // ⭐ NEW: Partial changes info
  suggestions?: string[];
  timestamp: Date;
  isTyping?: boolean;
  agentSteps?: AgentStep[]; // ⭐ NEW: Agent steps for this message
}

// ⭐ NEW: Interface for partial config changes
interface ConfigChanges {
  action: "update" | "add" | "remove";
  targetType: "widget" | "filter" | "globalSettings" | "theme";
  targetId?: string;
  changes?: Record<string, any>;
  newWidget?: any;
  newFilter?: any;
  explanation?: string;
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

// ⭐ Agent Steps Display Component - แสดง process แบบ Copilot
function AgentStepsDisplay({ steps }: { steps: AgentStep[] }) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getStepIcon = (step: AgentStep) => {
    if (step.status === "running") {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    }
    if (step.status === "complete") {
      return <Check className="h-3.5 w-3.5 text-green-500" />;
    }
    if (step.status === "error") {
      return <X className="h-3.5 w-3.5 text-red-500" />;
    }

    // Pending - show type icon
    switch (step.type) {
      case "read":
        return <Eye className="h-3.5 w-3.5 text-gray-400" />;
      case "analyze":
        return <Search className="h-3.5 w-3.5 text-gray-400" />;
      case "edit":
        return <Pencil className="h-3.5 w-3.5 text-gray-400" />;
      default:
        return <FileCode className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-1 mb-2">
      {steps.map((step) => (
        <Collapsible
          key={step.id}
          open={expandedSteps.has(step.id)}
          onOpenChange={() => toggleStep(step.id)}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-1.5 hover:bg-gray-100 rounded text-xs group">
            {getStepIcon(step)}
            <span
              className={`flex-1 ${
                step.status === "complete"
                  ? "text-gray-600"
                  : step.status === "running"
                  ? "text-blue-600 font-medium"
                  : "text-gray-500"
              }`}
            >
              {step.title}
            </span>
            {step.details &&
              (expandedSteps.has(step.id) ? (
                <ChevronDown className="h-3 w-3 text-gray-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
              ))}
          </CollapsibleTrigger>
          {step.details && (
            <CollapsibleContent>
              <div className="ml-6 pl-2 border-l-2 border-gray-200 text-xs text-gray-500 py-1">
                <pre className="whitespace-pre-wrap font-mono text-[10px] bg-gray-50 p-2 rounded">
                  {step.details}
                </pre>
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      ))}
    </div>
  );
}

// ⭐ Helper: Parse ---CHANGES--- block from AI response
function parseChangesFromResponse(response: string): {
  cleanResponse: string;
  parsedChanges: ConfigChanges | null;
} {
  // More flexible regex - handle various formatting from AI
  const changesMatch = response.match(
    /---CHANGES---\s*(\{[\s\S]*?\})\s*---END---/
  );

  if (changesMatch) {
    try {
      const changesJson = changesMatch[1].trim();
      const parsedChanges = JSON.parse(changesJson) as ConfigChanges;
      // Remove the ---CHANGES--- block from the response
      const cleanResponse = response
        .replace(/---CHANGES---[\s\S]*?---END---/g, "")
        .trim();
      return { cleanResponse, parsedChanges };
    } catch {
      // Still try to clean the response even if parse fails
      const cleanResponse = response
        .replace(/---CHANGES---[\s\S]*?---END---/g, "")
        .trim();
      return { cleanResponse, parsedChanges: null };
    }
  }

  // Try alternative format without markers (just find JSON object with action/targetType)
  const jsonMatch = response.match(
    /\{\s*"action"\s*:\s*"(update|add|remove)"[\s\S]*?"targetType"[\s\S]*?\}/
  );
  if (jsonMatch) {
    try {
      const parsedChanges = JSON.parse(jsonMatch[0]) as ConfigChanges;
      const cleanResponse = response.replace(jsonMatch[0], "").trim();
      return { cleanResponse, parsedChanges };
    } catch {
      // Ignore parse errors
    }
  }

  return { cleanResponse: response, parsedChanges: null };
}

// ⭐ NEW: Component สำหรับแสดง Config Changes แบบสวยๆ
function ConfigChangesDisplay({ changes }: { changes: ConfigChanges }) {
  const getActionIcon = () => {
    switch (changes.action) {
      case "add":
        return <span className="text-green-500">➕</span>;
      case "remove":
        return <span className="text-red-500">➖</span>;
      case "update":
        return <span className="text-blue-500">✏️</span>;
      default:
        return null;
    }
  };

  const getActionText = () => {
    switch (changes.action) {
      case "add":
        return "เพิ่ม";
      case "remove":
        return "ลบ";
      case "update":
        return "แก้ไข";
      default:
        return changes.action;
    }
  };

  return (
    <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 my-2">
      <div className="flex items-center gap-2 mb-2">
        {getActionIcon()}
        <span className="font-medium text-sm text-blue-800">
          {getActionText()} {changes.targetType}
          {changes.targetId && (
            <code className="ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs">
              {changes.targetId}
            </code>
          )}
        </span>
      </div>

      {changes.explanation && (
        <p className="text-xs text-gray-600 mb-2">{changes.explanation}</p>
      )}

      {changes.changes && Object.keys(changes.changes).length > 0 && (
        <div className="bg-white rounded p-2 border border-blue-100">
          <div className="text-xs font-medium text-gray-500 mb-1">
            การเปลี่ยนแปลง:
          </div>
          <div className="space-y-1">
            {Object.entries(changes.changes).map(([key, value]) => (
              <div key={key} className="flex items-center text-xs font-mono">
                <span className="text-purple-600 mr-1">{key}:</span>
                <span className="text-green-600">
                  {typeof value === "string" ? (
                    value.startsWith("#") ? (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block w-3 h-3 rounded border"
                          style={{ backgroundColor: value }}
                        />
                        {value}
                      </span>
                    ) : (
                      `"${value}"`
                    )
                  ) : (
                    JSON.stringify(value)
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.newWidget && (
        <div className="bg-white rounded p-2 border border-green-100 mt-2">
          <div className="text-xs font-medium text-green-600 mb-1">
            Widget ใหม่:
          </div>
          <div className="text-xs font-mono">
            <div>
              <span className="text-gray-500">ID:</span> {changes.newWidget.id}
            </div>
            <div>
              <span className="text-gray-500">Type:</span>{" "}
              {changes.newWidget.type}
            </div>
            <div>
              <span className="text-gray-500">Title:</span>{" "}
              {changes.newWidget.title}
            </div>
          </div>
        </div>
      )}

      {/* ⭐ Action footer */}
      <div className="mt-3 pt-2 border-t border-blue-100 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-xs text-blue-700">
          ดู Diff view เพื่อยืนยันการเปลี่ยนแปลง →
        </span>
      </div>
    </div>
  );
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
  // ⭐ Agent steps state - สำหรับแสดง real-time process
  const [currentAgentSteps, setCurrentAgentSteps] = useState<AgentStep[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: currentConfig?.widgets?.length
        ? `👋 สวัสดีครับ! ผมเห็นว่าคุณมี **${
            currentConfig.widgets.length
          } widget** อยู่ใน dashboard แล้ว

📊 **Widget ที่มี:**
${currentConfig.widgets
  .slice(0, 5)
  .map((w: any, i: number) => `${i + 1}. ${w.title || w.id} (${w.type})`)
  .join("\n")}${
            currentConfig.widgets.length > 5
              ? `\n...และอีก ${currentConfig.widgets.length - 5} widgets`
              : ""
          }

ผมสามารถช่วย **แก้ไข config** ให้คุณได้ทันที เช่น:
- เปลี่ยนสี, ขนาด, ตำแหน่ง widget
- เพิ่ม/ลบ widget
- แก้ไข dataConfig, styleConfig

บอกมาเลยว่าอยากแก้อะไรครับ! 🎯`
        : `👋 สวัสดีครับ! ผมเป็น AI ที่จะช่วย**สร้างและแก้ไข Dashboard Config** ให้คุณ

🎯 **สิ่งที่ผมทำได้:**
- สร้าง widget ใหม่ (bar, line, pie, metric, table, gauge...)
- แก้ไข config ที่มีอยู่
- ปรับ style, สี, ขนาด
- เพิ่ม/ลบ/แก้ไข dataConfig

${selectedTable ? `📋 **ตารางที่เลือก:** \`${selectedTable}\`` : ""}
${
  tableSchema?.columns
    ? `\n📊 **Columns ที่มี:** ${tableSchema.columns
        .slice(0, 5)
        .map((c: any) => c.name)
        .join(", ")}${tableSchema.columns.length > 5 ? "..." : ""}`
    : ""
}

บอกมาเลยว่าอยากสร้างอะไรครับ! เช่น:
- "สร้าง bar chart แสดง top 10 สินค้า"
- "เพิ่ม KPI แสดงยอดรวม"
- "สร้าง dashboard ให้หน่อย"`,
      timestamp: new Date(),
      isTyping: true,
      suggestions: currentConfig?.widgets?.length
        ? [
            "เปลี่ยนสี widget แรกเป็นสีน้ำเงิน",
            "เพิ่ม line chart แสดง trend",
            "ลบ widget สุดท้าย",
          ]
        : [
            "สร้าง bar chart แสดง top 10",
            "เพิ่ม KPI แสดงยอดรวม",
            "สร้าง dashboard พื้นฐาน",
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
  const [sessionInitialized, setSessionInitialized] = useState(false); // ⭐ Flag to prevent re-loading

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

            // Auto scroll during typing - ใช้ viewport element ของ ScrollArea
            if (scrollRef.current) {
              const viewport = scrollRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
              );
              if (viewport) {
                viewport.scrollTo({
                  top: viewport.scrollHeight,
                  behavior: "smooth",
                });
              }
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
                  if (updatedMsg.config && onShowDiff) {
                    // Use setTimeout to defer the state update
                    // ใช้ default empty config ถ้าไม่มี currentConfig
                    const baseConfig = currentConfig || {
                      layout: "grid",
                      theme: "light",
                      gridCols: 12,
                      gridRowHeight: 100,
                      widgets: [],
                    };

                    setTimeout(() => {
                      onShowDiff(
                        baseConfig,
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
        }, 15); // ⭐ เพิ่มความเร็วให้นุ่มนวลขึ้น (15ms แทน 10ms)

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

    // ⭐ Skip if session already initialized
    if (sessionInitialized) {
      return;
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
        setIsLoadingSession(false);
        setSessionInitialized(true);
        return;
      }

      // ตั้ง lock
      localStorage.setItem(lockKey, now.toString());

      try {
        // รอให้ sessions โหลดเสร็จก่อน
        if (chatHistory.loading) {
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
            await handleLoadSession(lastSessionId);
            localStorage.removeItem(lockKey);
            setSessionInitialized(true);
            setTimeout(() => setIsLoadingSession(false), 500);
            return;
          } else {
            localStorage.removeItem(storageKey);
          }
        }

        // ถ้าไม่มี lastSessionId แต่มี sessions อยู่ ให้ load session ล่าสุด
        if (chatHistory.sessions.length > 0) {
          const latestSession = chatHistory.sessions[0];
          await handleLoadSession(latestSession.id);
          localStorage.removeItem(lockKey);
          setSessionInitialized(true);
          setTimeout(() => setIsLoadingSession(false), 500);
          return;
        }

        // ไม่สร้าง session ใหม่ - ให้รอจนกว่า user จะส่งข้อความครั้งแรก
        localStorage.removeItem(lockKey);
        setSessionInitialized(true);
        setTimeout(() => setIsLoadingSession(false), 500);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        localStorage.removeItem(lockKey);
        setSessionInitialized(true);
        setTimeout(() => setIsLoadingSession(false), 500);
      }
    };

    // เรียกใช้งานเฉพาะครั้งแรกเมื่อ sessions โหลดเสร็จแล้ว
    // ⭐ ไม่ trigger อีกครั้งหลังจาก session loaded แล้ว
    if (
      !chatHistory.loading &&
      user?.uid &&
      isLoadingSession &&
      !sessionInitialized
    ) {
      initSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory.loading, user?.uid, isLoadingSession, sessionInitialized]);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive (smooth scroll)
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages, messages.length]); // ⭐ Track both messages and length for better reactivity

  // ⭐ NEW: Auto-scroll during typing animation
  useEffect(() => {
    if (typingMessageIndex !== null && displayedContent && scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [displayedContent, typingMessageIndex]);

  // ⭐ NEW: Auto-scroll to bottom when loading is done (after session load)
  useEffect(() => {
    if (!isLoadingSession && messages.length > 0) {
      // ใช้ setTimeout เพื่อให้แน่ใจว่า DOM render เสร็จแล้ว
      const scrollToBottom = () => {
        if (scrollRef.current) {
          // ScrollArea ของ shadcn/ui ใช้ viewport element
          const viewport = scrollRef.current.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          } else {
            // fallback ถ้าหาไม่เจอ
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }
      };

      // เรียกหลายรอบเพื่อให้แน่ใจว่าได้ scroll
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 600);
    }
  }, [isLoadingSession, messages.length]);

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

    // สร้าง session ถ้ายังไม่มี (เมื่อส่งข้อความครั้งแรก)
    let sessionId = chatHistory.currentSessionId;
    let isNewSession = false;

    if (!sessionId && user?.uid) {
      try {
        sessionId = await chatHistory.createNewSession(userMessage.content);
        isNewSession = true;

        // บันทึก session ลง localStorage
        const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
        localStorage.setItem(storageKey, sessionId);
      } catch (error) {
        console.error("Failed to create session:", error);
      }
    }

    // Auto-save user message (ถ้ามี session แล้ว และไม่ใช่ session ใหม่)
    if (sessionId && !isNewSession) {
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

      // Question keywords that likely DON'T need config modification
      const pureQuestionKeywords = [
        "what is",
        "how does",
        "why",
        "explain",
        "tell me about",
        "อะไรคือ",
        "คืออะไร",
        "อธิบาย",
        "หมายความว่า",
      ];

      // Keywords for creating NEW config from scratch
      const createNewKeywords = [
        "สร้าง dashboard",
        "create dashboard",
        "new dashboard",
        "สร้างใหม่",
        "เริ่มใหม่",
        "start fresh",
      ];

      const hasConfigKeyword = configModifyKeywords.some((keyword) =>
        inputLower.includes(keyword)
      );

      const isPureQuestion = pureQuestionKeywords.some((keyword) =>
        inputLower.includes(keyword)
      );

      const wantsNewDashboard = createNewKeywords.some((keyword) =>
        inputLower.includes(keyword)
      );

      // ⭐ Greeting keywords - ไม่ต้องทำอะไรพิเศษ แค่ตอบกลับ
      const greetingKeywords = [
        "สวัสดี",
        "หวัดดี",
        "ดีครับ",
        "ดีค่ะ",
        "hello",
        "hi",
        "hey",
        "ขอบคุณ",
        "thank",
      ];

      const isGreeting = greetingKeywords.some((keyword) =>
        inputLower.includes(keyword)
      );

      // ⭐ SMART LOGIC:
      // - คำทักทาย → chat ธรรมดา (ไม่แสดง agent steps)
      // - มี config + ต้องการแก้ → chat with agent steps
      // - ไม่มี config + ต้องการสร้าง → generate with agent steps
      // - คำถามทั่วไป → chat ธรรมดา
      const hasExistingConfig = currentConfig?.widgets?.length > 0;
      const shouldUseChat =
        hasExistingConfig && hasConfigKeyword && !wantsNewDashboard;
      const shouldGenerate =
        !isGreeting &&
        !isPureQuestion &&
        (!hasExistingConfig || wantsNewDashboard) &&
        hasConfigKeyword;
      const isSimpleChat =
        isGreeting ||
        isPureQuestion ||
        (!hasConfigKeyword && !wantsNewDashboard);

      // AGENT STEPS - Initialize steps for this operation
      const initSteps: AgentStep[] = [];

      if (isSimpleChat) {
        // ⭐ SIMPLE CHAT - ไม่มี agent steps (สำหรับทักทาย, คำถามทั่วไป)
        // ⚠️ ไม่ส่ง config ไปเพื่อป้องกัน AI แก้ไขโดยไม่ได้ตั้งใจ
        setLoadingStatus("💬 ตอบกลับ...");

        const history = messages
          .filter((m) => !m.config)
          .slice(-6)
          .map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          }));

        const result = await chatWithAI(tenantId, {
          message: input.trim(),
          model: selectedModel,
          history,
          context: {
            // ⭐ ไม่ส่ง config ไป - แค่ตอบกลับธรรมดา
            tableSchema,
            selectedTable,
          },
        });

        const assistantMessage: Message = {
          role: "assistant",
          content: result.response,
          suggestions: result.suggestions || [],
          timestamp: new Date(),
          isTyping: false,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (sessionId) {
          autoSaveAssistantMessage(sessionId, assistantMessage);
        }
      } else if (shouldUseChat) {
        // ⭐ MODIFY existing config via chat (faster, partial updates)

        // Set agent steps
        initSteps.push(
          {
            id: "read",
            type: "read",
            title: "อ่าน Config ปัจจุบัน",
            status: "running",
            details: `${currentConfig?.widgets?.length || 0} widgets`,
          },
          {
            id: "analyze",
            type: "analyze",
            title: "วิเคราะห์คำขอ",
            status: "pending",
          },
          {
            id: "edit",
            type: "edit",
            title: "แก้ไข Config",
            status: "pending",
          },
          {
            id: "diff",
            type: "complete",
            title: "แสดง Diff",
            status: "pending",
          }
        );
        setCurrentAgentSteps(initSteps);
        setLoadingStatus("📖 อ่าน Config ปัจจุบัน...");

        // Step 1: Read config - complete
        await new Promise((r) => setTimeout(r, 200));
        setCurrentAgentSteps((prev) =>
          prev.map((s) =>
            s.id === "read"
              ? { ...s, status: "complete" }
              : s.id === "analyze"
              ? { ...s, status: "running" }
              : s
          )
        );
        setLoadingStatus("🔍 วิเคราะห์คำขอ...");

        const history = messages
          .filter((m) => !m.config)
          .slice(-6) // Keep last 6 messages for context
          .map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          }));

        // Step 2: Analyze - complete, Edit - running
        setCurrentAgentSteps((prev) =>
          prev.map((s) =>
            s.id === "analyze"
              ? { ...s, status: "complete" }
              : s.id === "edit"
              ? { ...s, status: "running" }
              : s
          )
        );
        setLoadingStatus("✏️ กำลังแก้ไข Config...");

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

        // Parse ---CHANGES--- block from response
        const { cleanResponse, parsedChanges } = parseChangesFromResponse(
          result.response
        );

        // Use parsed changes if available, otherwise use from API
        const finalConfigChanges = parsedChanges || result.configChanges;

        // Step 3: Edit complete, Diff running
        setCurrentAgentSteps((prev) =>
          prev.map((s) =>
            s.id === "edit"
              ? {
                  ...s,
                  status: "complete",
                  details:
                    result.config || finalConfigChanges
                      ? `แก้ไขสำเร็จ`
                      : "ไม่มีการเปลี่ยนแปลง",
                }
              : s.id === "diff"
              ? { ...s, status: result.config ? "running" : "complete" }
              : s
          )
        );
        setLoadingStatus("✨ เตรียมแสดงผล...");

        const assistantMessage: Message = {
          role: "assistant",
          content: cleanResponse,
          config: result.config,
          configChanges: finalConfigChanges,
          suggestions: result.suggestions || [],
          timestamp: new Date(),
          isTyping: false,
          agentSteps: initSteps.map((s) => ({
            ...s,
            status: "complete" as const,
          })),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Trigger diff if config was modified
        if (result.config && onShowDiff) {
          setCurrentAgentSteps((prev) =>
            prev.map((s) =>
              s.id === "diff" ? { ...s, status: "complete" } : s
            )
          );
          setTimeout(() => {
            onShowDiff(
              currentConfig,
              result.config,
              result.response?.slice(0, 100) + "..."
            );
          }, 100);
        }

        // Clear agent steps after completion
        setTimeout(() => setCurrentAgentSteps([]), 500);

        // Auto-save
        if (sessionId) {
          autoSaveAssistantMessage(sessionId, assistantMessage);
        }
      } else if (shouldGenerate) {
        // ⭐ GENERATE new config (for new dashboards or major changes)

        // Set agent steps for generate
        initSteps.push(
          {
            id: "analyze",
            type: "analyze",
            title: "วิเคราะห์ความต้องการ",
            status: "running",
          },
          {
            id: "schema",
            type: "read",
            title: "ตรวจสอบ Schema",
            status: "pending",
            details: tableSchema
              ? `${tableSchema.columns?.length || 0} columns`
              : "ไม่มี schema",
          },
          {
            id: "generate",
            type: "edit",
            title: "สร้าง Dashboard",
            status: "pending",
          },
          {
            id: "diff",
            type: "complete",
            title: "แสดง Diff",
            status: "pending",
          }
        );
        setCurrentAgentSteps(initSteps);
        setLoadingStatus("🔍 วิเคราะห์ความต้องการ...");

        await new Promise((r) => setTimeout(r, 300));
        setCurrentAgentSteps((prev) =>
          prev.map((s) =>
            s.id === "analyze"
              ? { ...s, status: "complete" }
              : s.id === "schema"
              ? { ...s, status: "running" }
              : s
          )
        );
        setLoadingStatus("📋 ตรวจสอบ Schema...");

        await new Promise((r) => setTimeout(r, 200));
        setCurrentAgentSteps((prev) =>
          prev.map((s) =>
            s.id === "schema"
              ? { ...s, status: "complete" }
              : s.id === "generate"
              ? { ...s, status: "running" }
              : s
          )
        );
        setLoadingStatus("🎨 สร้าง Dashboard ใหม่...");

        const result = await generateConfigWithAI(tenantId, {
          prompt: input.trim(),
          model: selectedModel,
          context: {
            tableSchema,
            currentConfig: wantsNewDashboard ? null : currentConfig,
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
            result.config?.widgets
              ? `📊 ${result.config.widgets.length} widget(s)`
              : "Configuration พร้อมแล้ว"
          }`;

        const assistantMessage: Message = {
          role: "assistant",
          content: explanation,
          config: result.config,
          suggestions: result.suggestions || [],
          timestamp: new Date(),
          isTyping: false,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // TRIGGER DIFF IMMEDIATELY if we have config
        // Update step: generate complete
        setCurrentAgentSteps((prev) =>
          prev.map((s) =>
            s.id === "generate"
              ? {
                  ...s,
                  status: "complete",
                  details: `${
                    result.config?.widgets?.length || 0
                  } widgets สร้างแล้ว`,
                }
              : s.id === "diff"
              ? { ...s, status: "running" }
              : s
          )
        );

        if (result.config && onShowDiff) {
          const baseConfig = currentConfig || {
            layout: "grid",
            theme: "light",
            gridCols: 12,
            gridRowHeight: 100,
            widgets: [],
          };

          // Update step: diff complete
          setCurrentAgentSteps((prev) =>
            prev.map((s) =>
              s.id === "diff" ? { ...s, status: "complete" } : s
            )
          );

          // Trigger diff immediately
          setTimeout(() => {
            onShowDiff(
              baseConfig,
              result.config,
              explanation.slice(0, 100) + "..."
            );
          }, 100);
        } else {
          setCurrentAgentSteps((prev) =>
            prev.map((s) =>
              s.id === "diff"
                ? { ...s, status: "complete", details: "ไม่มี config" }
                : s
            )
          );
        }

        // Clear agent steps after completion
        setTimeout(() => setCurrentAgentSteps([]), 500);

        // Auto-save assistant message
        if (sessionId) {
          autoSaveAssistantMessage(sessionId, assistantMessage);
        }
      }
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      toast.error(error.message || "Failed to get response from AI");

      setLoadingStatus("❌ เกิดข้อผิดพลาด...");
      setCurrentAgentSteps([]); // Clear agent steps on error

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

        setMessages(loadedMessages);
        setCurrentSessionTitle(session.title);
        setShowHistoryDialog(false);

        // บันทึก session ที่เปิดลง localStorage
        const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
        localStorage.setItem(storageKey, sessionId);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("ไม่สามารถโหลด Chat History ได้");
    }
  };

  const handleNewChat = async () => {
    try {
      // ⭐ ไม่สร้าง session ทันที - รอให้ user พิมพ์ก่อน
      setCurrentSessionTitle(null);

      // ⭐ Clear current session
      chatHistory.clearCurrentSession();

      setMessages([
        {
          role: "assistant",
          content: `👋 เริ่มการสนทนาใหม่! ผมพร้อมช่วยสร้าง dashboard ให้คุณแล้วครับ\n\nบอกมาเลยว่าอยากจะทำอะไร เช่น:\n- สร้าง chart ใหม่\n- แก้ไข widget ที่มีอยู่\n- ดูสรุป dashboard config\n\n(I can also respond in English if you prefer!)`,
          timestamp: new Date(),
          isTyping: false,
        },
      ]);

      // ⭐ ลบ session เก่าออกจาก localStorage (รอสร้างใหม่ตอน user ส่งข้อความ)
      const storageKey = `lastChatSession_${tenantId}_${dashboardId}`;
      localStorage.removeItem(storageKey);

      toast.success("เริ่ม Chat ใหม่แล้ว!");
    } catch (error) {
      console.error("Failed to create new chat:", error);
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
                {messages.map((message, index) => {
                  // ⭐ Use stored configChanges directly - don't re-parse
                  // Only parse if message.configChanges is not available (legacy messages)
                  let displayContent = message.content;
                  let displayChanges: ConfigChanges | undefined =
                    message.configChanges;

                  // Only parse for assistant messages without stored configChanges
                  if (message.role === "assistant" && !message.configChanges) {
                    const { cleanResponse, parsedChanges } =
                      parseChangesFromResponse(message.content);
                    displayContent = cleanResponse;
                    displayChanges = parsedChanges || undefined;
                  }

                  return (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
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
                              {displayContent}
                            </ReactMarkdown>
                          )}
                        </div>

                        {/* ⭐ NEW: Show config changes if available */}
                        {displayChanges && !message.isTyping && (
                          <ConfigChangesDisplay changes={displayChanges} />
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
                                      🔍 แสดง Columns ให้ AI ดู (Auto-send
                                      columns info)
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
                  );
                })}
                {/* ⭐ Agent Steps & Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-[90%]">
                      {/* Agent Steps Display */}
                      {currentAgentSteps.length > 0 && (
                        <AgentStepsDisplay steps={currentAgentSteps} />
                      )}

                      {/* Status indicator */}
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                        <span className="text-xs font-medium">
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
