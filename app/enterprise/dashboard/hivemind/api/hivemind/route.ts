import { NextRequest, NextResponse } from "next/server";

const RAG_BASE_URL = "https://demo.davinciai.eu:8030";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id") || "davinci";
    const algorithm = searchParams.get("algorithm") || "tsne";
    const limit = searchParams.get("limit") || "200";

    try {
        const response = await fetch(
            `${RAG_BASE_URL}/hivemind/visualize?algorithm=${algorithm}&limit=${limit}&tenant_id=${encodeURIComponent(tenantId)}`,
            {
                headers: {
                    "Authorization": request.headers.get("Authorization") || ""
                }
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("HiveMind API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id") || "davinci";

    try {
        const body = await request.json();
        const response = await fetch(
            `${RAG_BASE_URL}/hivemind/skills?tenant_id=${encodeURIComponent(tenantId)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": request.headers.get("Authorization") || ""
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to save" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("HiveMind API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
