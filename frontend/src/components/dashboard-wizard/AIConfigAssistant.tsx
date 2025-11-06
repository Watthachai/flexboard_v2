"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Lightbulb,
  Wand2,
  Settings,
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

interface Message {
  role: "user" | "assistant";
  content: string;
  config?: any;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIConfigAssistantProps {
  tenantId: string;
  currentConfig?: any;
  tableSchema?: any;
  onApplyConfig?: (config: any) => void;
}

export function AIConfigAssistant({
  tenantId,
  currentConfig,
  tableSchema,
  onApplyConfig,
}: AIConfigAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: currentConfig?.widgets?.length
        ? `👋 สวัสดีครับ! ผมเห็นว่าคุณมี ${currentConfig.widgets.length} widget อยู่ใน dashboard แล้ว ผมสามารถช่วยเพิ่ม แก้ไข หรือจัดเรียงใหม่ได้ครับ คุณต้องการทำอะไรครับ?\n\n(I can also respond in English if you prefer!)`
        : "👋 สวัสดีครับ! ผมเป็น AI agent ที่จะช่วยสร้าง dashboard ให้คุณ สามารถสร้าง charts, KPIs และตั้งค่าต่างๆ ได้เลย บอกมาเลยว่าอยากจะทำอะไรครับ!\n\n(I can also respond in English if you prefer!)",
      timestamp: new Date(),
      isTyping: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
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
              prev.map((msg, idx) =>
                idx === typingMessageIndex ? { ...msg, isTyping: false } : msg
              )
            );
          }
        }, 10); // Typing speed (10ms per character = very fast!)

        return () => {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
          }
        };
      }
    }
  }, [typingMessageIndex, messages]);

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
      // Check if user wants to generate config or just chat
      const generateKeywords = [
        "create",
        "add",
        "make",
        "generate",
        "build",
        "show",
      ];
      const isGenerateRequest = generateKeywords.some((keyword) =>
        input.toLowerCase().includes(keyword)
      );

      if (isGenerateRequest) {
        // Generate configuration
        const result = await generateConfigWithAI(tenantId, {
          prompt: input.trim(),
          model: selectedModel,
          context: {
            tableSchema,
            currentConfig,
          },
        });

        // Use AI's explanation or generate summary
        const explanation =
          result.explanation ||
          `I've generated a configuration based on your request. Here's what I created:\n\n${
            result.config.widgets
              ? `📊 ${
                  result.config.widgets.length
                } widget(s)\n${result.config.widgets
                  .map(
                    (w: any, i: number) =>
                      `${i + 1}. ${w.title} (${w.type} chart)`
                  )
                  .join("\n")}`
              : "Configuration ready"
          }\n\nYou can preview the JSON below or apply it directly to your dashboard.`;

        const assistantMessage: Message = {
          role: "assistant",
          content: explanation,
          config: result.config,
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
        const history = messages
          .filter((m) => !m.config) // Don't include config messages in history
          .map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          }));

        const result = await chatWithAI(tenantId, {
          message: input.trim(),
          model: selectedModel,
          history,
          context: { currentConfig, tableSchema },
        });

        const assistantMessage: Message = {
          role: "assistant",
          content: result.response,
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
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleCopyConfig = (config: any, index: number) => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedIndex(index);
    toast.success("Configuration copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApplyConfig = (config: any) => {
    if (onApplyConfig) {
      onApplyConfig(config);
      toast.success("Configuration applied to editor!");
    } else {
      toast.error("Apply function not available");
    }
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
                  <div className="whitespace-pre-wrap text-sm">
                    {message.isTyping && index === typingMessageIndex
                      ? displayedContent
                      : message.content}
                    {message.isTyping && index === typingMessageIndex && (
                      <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse" />
                    )}
                  </div>

                  {/* Config Preview - show only after typing is done */}
                  {message.config && !message.isTyping && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded p-2 border border-gray-300">
                        <pre className="text-xs overflow-x-auto max-h-40">
                          {JSON.stringify(message.config, null, 2)}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            handleCopyConfig(message.config, index)
                          }
                          className="flex-1"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy JSON
                            </>
                          )}
                        </Button>
                        {onApplyConfig && (
                          <Button
                            size="sm"
                            onClick={() => handleApplyConfig(message.config)}
                            className="flex-1"
                          >
                            <Wand2 className="h-3 w-3 mr-1" />
                            Apply to Editor
                          </Button>
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
                    <span>กำลังคิด...</span>
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
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="บอกมาเลยว่าอยากสร้างอะไร... (Thai or English)"
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
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
