import { getWidgetConfig } from "@/lib/api-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const widget = await getWidgetConfig(id);
    return Response.json(widget);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Failed to fetch widget", details: message },
      { status: 500 }
    );
  }
}
