/**
 * Chat Service - เรียก Backend API แทน Firestore โดยตรง
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  config?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  tenantId: string;
  dashboardId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    totalMessages: number;
    lastUserMessage?: string;
    currentConfig?: any;
  };
}

export class ChatService {
  private static API_BASE =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

  /**
   * Get Firebase ID Token
   */
  private static async getIdToken(): Promise<string> {
    const { auth } = await import("./firebase");
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }
    return await user.getIdToken();
  }

  /**
   * สร้าง chat session ใหม่สำหรับ dashboard
   */
  static async createSession(
    userId: string,
    tenantId: string,
    dashboardId: string,
    initialMessage?: string
  ): Promise<string> {
    const response = await fetch(
      `${this.API_BASE}/tenants/${tenantId}/dashboards/${dashboardId}/chat-sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getIdToken()}`,
        },
        body: JSON.stringify({ initialMessage }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create session");
    }

    const data = await response.json();
    return data.sessionId;
  }

  /**
   * เพิ่มข้อความใน session
   */
  static async addMessage(
    tenantId: string,
    sessionId: string,
    message: Omit<ChatMessage, "id" | "timestamp">
  ): Promise<void> {
    const response = await fetch(
      `${this.API_BASE}/tenants/${tenantId}/chat-sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getIdToken()}`,
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add message");
    }
  }

  /**
   * ดึง chat sessions ของ dashboard
   */
  static async getDashboardSessions(
    tenantId: string,
    dashboardId: string
  ): Promise<ChatSession[]> {
    const response = await fetch(
      `${this.API_BASE}/tenants/${tenantId}/dashboards/${dashboardId}/chat-sessions`,
      {
        headers: {
          Authorization: `Bearer ${await this.getIdToken()}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch sessions");
    }

    const data = await response.json();
    return data.sessions.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages:
        session.messages?.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })) || [],
    }));
  }

  /**
   * ดึง session เดียว
   */
  static async getSession(
    tenantId: string,
    sessionId: string
  ): Promise<ChatSession | null> {
    const response = await fetch(
      `${this.API_BASE}/tenants/${tenantId}/chat-sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${await this.getIdToken()}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch session");
    }

    const data = await response.json();
    return {
      ...data.session,
      createdAt: new Date(data.session.createdAt),
      updatedAt: new Date(data.session.updatedAt),
      messages:
        data.session.messages?.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })) || [],
    };
  }

  /**
   * อัพเดท session title
   */
  static async updateSessionTitle(
    tenantId: string,
    sessionId: string,
    title: string
  ): Promise<void> {
    const response = await fetch(
      `${this.API_BASE}/tenants/${tenantId}/chat-sessions/${sessionId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getIdToken()}`,
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update session title");
    }
  }

  /**
   * ลบ session
   */
  static async deleteSession(
    tenantId: string,
    sessionId: string
  ): Promise<void> {
    const response = await fetch(
      `${this.API_BASE}/tenants/${tenantId}/chat-sessions/${sessionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await this.getIdToken()}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete session");
    }
  }

  /**
   * ค้นหา sessions ใน dashboard
   */
  static async searchSessions(
    tenantId: string,
    dashboardId: string,
    searchQuery: string
  ): Promise<ChatSession[]> {
    const allSessions = await this.getDashboardSessions(tenantId, dashboardId);

    if (!searchQuery.trim()) {
      return allSessions;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return allSessions.filter((session) => {
      if (session.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      return session.messages.some((msg) =>
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Export session เป็น JSON
   */
  static async exportSession(
    tenantId: string,
    sessionId: string
  ): Promise<string> {
    const session = await this.getSession(tenantId, sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    return JSON.stringify(session, null, 2);
  }

  /**
   * Export sessions ทั้งหมดของ dashboard
   */
  static async exportDashboardSessions(
    tenantId: string,
    dashboardId: string
  ): Promise<string> {
    const sessions = await this.getDashboardSessions(tenantId, dashboardId);
    return JSON.stringify(sessions, null, 2);
  }

  // TODO: Implement import session feature in backend
  // static async importSession(...): Promise<string> { }
}
