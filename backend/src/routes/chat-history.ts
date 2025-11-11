import { Router, Request, Response } from "express";
import { db } from "../index";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

// ===== Chat History Routes =====

/**
 * GET /tenants/:tenantId/dashboards/:dashboardId/chat-sessions
 * ดึง chat sessions ทั้งหมดของ dashboard
 */
router.get(
  "/tenants/:tenantId/dashboards/:dashboardId/chat-sessions",
  async (req: Request, res: Response) => {
    try {
      const { tenantId, dashboardId } = req.params;
      const userId = (req as any).user?.uid; // จาก auth middleware

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const sessionsRef = db.collection(`tenants/${tenantId}/chatSessions`);
      const snapshot = await sessionsRef
        .where("dashboardId", "==", dashboardId)
        .where("userId", "==", userId)
        .orderBy("updatedAt", "desc")
        .get();

      const sessions = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt:
            data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          messages:
            data.messages?.map((msg: any) => ({
              ...msg,
              timestamp:
                msg.timestamp?.toDate?.()?.toISOString() || msg.timestamp,
            })) || [],
        };
      });

      res.json({ sessions });
    } catch (error: any) {
      console.error("Error fetching chat sessions:", error);

      // Check if it's an index error
      if (error.code === 9 && error.message.includes("requires an index")) {
        return res.status(503).json({
          error:
            "Database index is being created. Please wait 1-2 minutes and try again.",
          indexUrl: error.message.match(/https:\/\/[^\s]+/)?.[0],
        });
      }

      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /tenants/:tenantId/dashboards/:dashboardId/chat-sessions
 * สร้าง chat session ใหม่
 */
router.post(
  "/tenants/:tenantId/dashboards/:dashboardId/chat-sessions",
  async (req: Request, res: Response) => {
    try {
      const { tenantId, dashboardId } = req.params;
      const { initialMessage } = req.body;
      const userId = (req as any).user?.uid;

      console.log("📝 Creating session with initialMessage:", initialMessage);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const now = new Date();
      const title = initialMessage
        ? generateSimpleTitle(initialMessage)
        : "New Chat";

      console.log("📌 Generated title:", title);

      const sessionData = {
        userId,
        tenantId,
        dashboardId,
        title,
        messages: initialMessage
          ? [
              {
                id: Date.now().toString(),
                role: "user",
                content: initialMessage,
                timestamp: now,
              },
            ]
          : [],
        createdAt: now,
        updatedAt: now,
        metadata: {
          totalMessages: initialMessage ? 1 : 0,
          lastUserMessage: initialMessage || "",
        },
      };

      const docRef = await db
        .collection(`tenants/${tenantId}/chatSessions`)
        .add(sessionData);

      res.json({
        sessionId: docRef.id,
        session: { id: docRef.id, ...sessionData },
      });
    } catch (error: any) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /tenants/:tenantId/chat-sessions/:sessionId
 * ดึง chat session เดียว
 */
router.get(
  "/tenants/:tenantId/chat-sessions/:sessionId",
  async (req: Request, res: Response) => {
    try {
      const { tenantId, sessionId } = req.params;
      const userId = (req as any).user?.uid;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const docRef = db.doc(`tenants/${tenantId}/chatSessions/${sessionId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Session not found" });
      }

      const sessionData = doc.data();

      // ตรวจสอบว่า user เป็นเจ้าของ session
      if (sessionData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Convert Firestore Timestamps to ISO strings
      const formattedSession = {
        id: doc.id,
        ...sessionData,
        createdAt:
          sessionData?.createdAt?.toDate?.()?.toISOString() ||
          sessionData?.createdAt,
        updatedAt:
          sessionData?.updatedAt?.toDate?.()?.toISOString() ||
          sessionData?.updatedAt,
        messages:
          sessionData?.messages?.map((msg: any) => ({
            ...msg,
            timestamp:
              msg.timestamp?.toDate?.()?.toISOString() || msg.timestamp,
          })) || [],
      };

      res.json({
        session: formattedSession,
      });
    } catch (error: any) {
      console.error("Error fetching chat session:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /tenants/:tenantId/chat-sessions/:sessionId/messages
 * เพิ่มข้อความใน session
 */
router.post(
  "/tenants/:tenantId/chat-sessions/:sessionId/messages",
  async (req: Request, res: Response) => {
    try {
      const { tenantId, sessionId } = req.params;
      const { role, content, config } = req.body;
      const userId = (req as any).user?.uid;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const docRef = db.doc(`tenants/${tenantId}/chatSessions/${sessionId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Session not found" });
      }

      const sessionData = doc.data();

      if (sessionData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const newMessage: any = {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
      };

      // Only add config if it's defined
      if (config !== undefined) {
        newMessage.config = config;
      }

      const updatedMessages = [...(sessionData?.messages || []), newMessage];

      await docRef.update({
        messages: updatedMessages,
        updatedAt: new Date(),
        "metadata.totalMessages": updatedMessages.length,
        ...(role === "user" && {
          "metadata.lastUserMessage": content,
        }),
        ...(config && {
          "metadata.currentConfig": config,
        }),
      });

      // ⭐ ลบ auto-update title ออก - เพราะเราตั้ง title ไว้ตอนสร้างแล้ว
      // Auto-update title
      // if (
      //   sessionData?.title === "New Chat" &&
      //   updatedMessages.length >= 2 &&
      //   updatedMessages.length <= 4
      // ) {
      //   const userMessages = updatedMessages
      //     .filter((m: any) => m.role === "user")
      //     .map((m: any) => m.content)
      //     .join(" ");
      //   const newTitle = generateSimpleTitle(userMessages);
      //   await docRef.update({ title: newTitle });
      // }

      res.json({ message: newMessage });
    } catch (error: any) {
      console.error("Error adding message:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /tenants/:tenantId/chat-sessions/:sessionId
 * อัพเดท session title
 */
router.patch(
  "/tenants/:tenantId/chat-sessions/:sessionId",
  async (req: Request, res: Response) => {
    try {
      const { tenantId, sessionId } = req.params;
      const { title } = req.body;
      const userId = (req as any).user?.uid;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const docRef = db.doc(`tenants/${tenantId}/chatSessions/${sessionId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Session not found" });
      }

      const sessionData = doc.data();

      if (sessionData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await docRef.update({
        title,
        updatedAt: new Date(),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /tenants/:tenantId/chat-sessions/:sessionId
 * ลบ session
 */
router.delete(
  "/tenants/:tenantId/chat-sessions/:sessionId",
  async (req: Request, res: Response) => {
    try {
      const { tenantId, sessionId } = req.params;
      const userId = (req as any).user?.uid;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const docRef = db.doc(`tenants/${tenantId}/chatSessions/${sessionId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Session not found" });
      }

      const sessionData = doc.data();

      if (sessionData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await docRef.delete();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Helper function
function generateSimpleTitle(messages: string): string {
  const cleaned = messages.trim().replace(/\s+/g, " ");
  const words = cleaned.split(" ").slice(0, 8);
  let title = words.join(" ");

  if (title.length > 50) {
    title = title.slice(0, 47) + "...";
  } else if (cleaned.split(" ").length > 8) {
    title += "...";
  }

  return title || "New Chat";
}

export default router;
