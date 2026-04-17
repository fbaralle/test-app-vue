import type { Env } from "../index";

export async function handleExport(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  if (method === "GET") {
    const exportId = url.searchParams.get("id");

    if (!exportId) {
      // List recent exports
      try {
        const r2 = env.MEDIA;

        if (!r2) {
          return new Response(
            JSON.stringify({ error: "R2 binding not available", exports: [] }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }

        const list = await r2.list({ prefix: "exports/", limit: 10 });
        const exports = list.objects.map((obj) => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded.toISOString(),
        }));
        return new Response(JSON.stringify({ exports }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e instanceof Error ? e.message : "R2 error" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Get specific export
    try {
      const r2 = env.MEDIA;

      if (!r2) {
        return new Response(
          JSON.stringify({ error: "R2 binding not available" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }

      const object = await r2.get(`exports/${exportId}`);
      if (!object) {
        return new Response(JSON.stringify({ error: "Export not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await object.text();
      return new Response(
        JSON.stringify({
          id: exportId,
          data: JSON.parse(data),
          metadata: {
            size: object.size,
            uploaded: object.uploaded.toISOString(),
          },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "R2 error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  if (method === "POST") {
    try {
      const r2 = env.MEDIA;

      if (!r2) {
        return new Response(
          JSON.stringify({ error: "R2 binding not available" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = (await request.json()) as Record<string, unknown>;
      const exportId = `export-${Date.now()}`;
      const exportData = {
        id: exportId,
        createdAt: new Date().toISOString(),
        data: body,
      };

      await r2.put(
        `exports/${exportId}`,
        JSON.stringify(exportData),
        {
          httpMetadata: {
            contentType: "application/json",
          },
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          id: exportId,
          url: `/api/export?id=${exportId}`,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "R2 error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
