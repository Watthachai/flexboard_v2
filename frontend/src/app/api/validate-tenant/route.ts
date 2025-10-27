import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { tenantCode } = await request.json();

    if (!tenantCode) {
      return NextResponse.json(
        { error: "Tenant code is required" },
        { status: 400 }
      );
    }

    // Validate tenant code with backend API
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
      }/api/tenants/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: tenantCode }),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Tenant not found" },
          { status: 404 }
        );
      }
      throw new Error("Failed to validate tenant");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error validating tenant:", error);
    return NextResponse.json(
      { error: "Failed to validate tenant" },
      { status: 500 }
    );
  }
}
