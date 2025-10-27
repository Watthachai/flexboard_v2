import { getAllCharts, getChartConfig } from "@/lib/api-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;

    if (id) {
      // GET /api/charts/[id]
      const chart = await getChartConfig(id);
      return Response.json(chart);
    } else {
      // GET /api/charts
      const charts = await getAllCharts();
      return Response.json(charts);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Failed to fetch charts", details: message },
      { status: 500 }
    );
  }
}
