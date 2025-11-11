// Hook สำหรับจัดการ Chat History แบบ Dashboard-specific
import { useState, useEffect, useCallback } from "react";
import { ChatService, ChatSession, ChatMessage } from "@/lib/chatService";

interface UseChatHistoryProps {
  userId: string;
  tenantId: string;
  dashboardId: string;
}

export function useChatHistory({
  userId,
  tenantId,
  dashboardId,
}: UseChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // โหลด sessions ของ dashboard นี้
  const loadSessions = useCallback(async () => {
    if (!tenantId || !dashboardId) return;
    setLoading(true);
    try {
      const dashboardSessions = await ChatService.getDashboardSessions(
        tenantId,
        dashboardId
      );
      setSessions(dashboardSessions);
    } catch (error: any) {
      console.error("Failed to load sessions:", error);
      // Show user-friendly message for index building
      if (error.message?.includes("Database index is being created")) {
        console.warn(
          "⏳ Firestore index is still building. Chat history will be available soon."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, dashboardId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createNewSession = async (initialMessage?: string) => {
    try {
      const sessionId = await ChatService.createSession(
        userId,
        tenantId,
        dashboardId,
        initialMessage
      );
      setCurrentSessionId(sessionId);
      await loadSessions();
      return sessionId;
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const session = await ChatService.getSession(tenantId, sessionId);
      setCurrentSessionId(sessionId);
      return session;
    } catch (error) {
      console.error("Failed to load session:", error);
      throw error;
    }
  };

  const saveMessage = async (
    sessionId: string,
    message: Omit<ChatMessage, "id" | "timestamp">
  ) => {
    try {
      await ChatService.addMessage(tenantId, sessionId, message);
      await loadSessions(); // Refresh sessions list
    } catch (error) {
      console.error("Failed to save message:", error);
      throw error;
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      await ChatService.updateSessionTitle(tenantId, sessionId, title);
      await loadSessions();
    } catch (error) {
      console.error("Failed to update session title:", error);
      throw error;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await ChatService.deleteSession(tenantId, sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      await loadSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      throw error;
    }
  };

  const exportSession = async (sessionId: string) => {
    try {
      return await ChatService.exportSession(tenantId, sessionId);
    } catch (error) {
      console.error("Failed to export session:", error);
      throw error;
    }
  };

  const exportAllSessions = async () => {
    try {
      return await ChatService.exportDashboardSessions(tenantId, dashboardId);
    } catch (error) {
      console.error("Failed to export all sessions:", error);
      throw error;
    }
  };

  // TODO: Import feature not yet implemented
  // const importSession = async (jsonData: string) => { ... }

  const searchSessions = async (query: string) => {
    try {
      return await ChatService.searchSessions(tenantId, dashboardId, query);
    } catch (error) {
      console.error("Failed to search sessions:", error);
      return [];
    }
  };

  const clearCurrentSession = () => {
    setCurrentSessionId(null);
  };

  return {
    sessions,
    currentSessionId,
    loading,
    createNewSession,
    loadSession,
    saveMessage,
    updateSessionTitle,
    deleteSession,
    exportSession,
    exportAllSessions,
    // importSession, // TODO: Not yet implemented
    searchSessions,
    refreshSessions: loadSessions,
    clearCurrentSession, // ⭐ NEW: Clear current session
  };
}
