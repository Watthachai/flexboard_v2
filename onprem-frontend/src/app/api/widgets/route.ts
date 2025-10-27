import { getAllWidgets, getWidgetConfig } from "@/lib/api-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;

    if (id) {
      // GET /api/widgets/[id]
      const widget = await getWidgetConfig(id);
      return Response.json(widget);
    } else {
      // GET /api/widgets
      const widgets = await getAllWidgets();
      return Response.json(widgets);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Failed to fetch widgets", details: message },
      { status: 500 }
    );
  }
}
