import { getChartConfig } from "@/lib/api-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chart = await getChartConfig(id);
    return Response.json(chart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Failed to fetch chart", details: message },
      { status: 500 }
    );
  }
}
