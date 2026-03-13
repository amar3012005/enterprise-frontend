import { NextRequest, NextResponse } from "next/server";

const RAG_BASE_URL = "https://demo.davinciai.eu:8030";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id") || "davinci";
    const algorithm = searchParams.get("algorithm") || "tsne";
    const limit = searchParams.get("limit") || "200";

    try {
        const url = `${RAG_BASE_URL}/hivemind/visualize?algorithm=${algorithm}&limit=${limit}&tenant_id=${tenantId}`;
        console.log("Fetching from RAG API:", url);
        const response = await fetch(url, {
            headers: {
                "Authorization": request.headers.get("Authorization") || ""
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("RAG API error response:", response.status, errorText);
            return NextResponse.json({ error: "Failed to fetch", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("HiveMind API error:", error);
        return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id") || "davinci";

    try {
        const body = await request.json();

        // Check if this is a query request (has 'query' field)
        if (body.query) {
            // Proxy to query endpoint
            const url = `${RAG_BASE_URL}/hivemind/query?tenant_id=${tenantId}`;
            console.log("Posting query to RAG API:", url);
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": request.headers.get("Authorization") || ""
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("RAG API query error:", response.status, errorText);
                return NextResponse.json({ error: "Query failed", details: errorText }, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        // This is a skill/rule/knowledge save request
        // Transform doc_type to type for backend compatibility
        const transformedBody = { ...body };
        if (transformedBody.doc_type) {
            // Map doc_type to type values expected by backend
            const typeMapping: Record<string, string> = {
                "Agent_Skill": "agent_skill",
                "Agent_Rule": "agent_rule",
                "General_KB": "general_kb",
                "agent_skill": "agent_skill",
                "agent_rule": "agent_rule",
                "general_kb": "general_kb"
            };
            transformedBody.type = typeMapping[transformedBody.doc_type] || transformedBody.doc_type.toLowerCase();
        }

        const url = `${RAG_BASE_URL}/hivemind/skills?tenant_id=${tenantId}`;
        console.log("Posting to RAG API:", url, "with body:", JSON.stringify(transformedBody));
        const response = await fetch(
            url,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": request.headers.get("Authorization") || ""
                },
                body: JSON.stringify(transformedBody)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("RAG API POST error:", response.status, errorText);
            return NextResponse.json({ error: "Failed to save", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("HiveMind API error:", error);
        return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
    }
}
