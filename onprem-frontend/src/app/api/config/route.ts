import { getData } from "@/lib/api-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return Response.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Fetch config from backend with tenantId
    const config = await getData(`/tenants/${tenantId}/config`);
    return Response.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Failed to fetch config", details: message },
      { status: 500 }
    );
  }
}
