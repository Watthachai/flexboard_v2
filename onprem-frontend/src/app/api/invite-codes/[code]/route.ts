import { getData } from "@/lib/api-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return Response.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Validate invite code with backend
    const codeData = await getData(`/invite-codes/${code}`);
    return Response.json(codeData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Invalid or expired invite code", details: message },
      { status: 401 }
    );
  }
}
