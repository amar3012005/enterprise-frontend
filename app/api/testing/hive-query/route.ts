import { NextResponse } from "next/server";

const ORCH_BASE = process.env.TESTING_ORCH_BASE_URL || "http://localhost:8004";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const upstream = await fetch(`${ORCH_BASE}/api/v1/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const text = await upstream.text();
        const contentType = upstream.headers.get("content-type") || "application/json";

        return new NextResponse(text, {
            status: upstream.status,
            headers: { "content-type": contentType },
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to reach upstream HiveMind query endpoint." },
            { status: 502 }
        );
    }
}
