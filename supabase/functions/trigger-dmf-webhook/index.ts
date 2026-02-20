import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ============================================
// STATIC METADATA (from actual DMF Survey123 webform submission)
// These are constants that never change — hardcoded to match
// exactly what the Survey123 client sends to Azure Logic Apps.
// ============================================

const LAYER_INFO = {
  id: 0,
  name: "RecreationalReportingEntry",
  type: "Feature Layer",
  globalIdField: "GlobalID",
  objectIdField: "OBJECTID",
  relationships: [
    {
      id: 0,
      name: "RecreationalReportingEntry",
      cardinality: "esriRelCardinalityOneToMany",
      role: "esriRelRoleOrigin",
      keyField: "GlobalID",
      composite: false,
      relatedTableId: 5,
    },
    {
      id: 1,
      name: "RecreationalReportingEntry",
      cardinality: "esriRelCardinalityOneToMany",
      role: "esriRelRoleOrigin",
      keyField: "GlobalID",
      composite: false,
      relatedTableId: 4,
    },
    {
      id: 2,
      name: "RecreationalReportingEntry",
      cardinality: "esriRelCardinalityOneToMany",
      role: "esriRelRoleOrigin",
      keyField: "GlobalID",
      composite: false,
      relatedTableId: 1,
    },
    {
      id: 3,
      name: "RecreationalReportingEntry",
      cardinality: "esriRelCardinalityOneToMany",
      role: "esriRelRoleOrigin",
      keyField: "GlobalID",
      composite: false,
      relatedTableId: 2,
    },
    {
      id: 4,
      name: "RecreationalReportingEntry",
      cardinality: "esriRelCardinalityOneToMany",
      role: "esriRelRoleOrigin",
      keyField: "GlobalID",
      composite: false,
      relatedTableId: 3,
    },
  ],
};

const SURVEY_INFO = {
  formItemId: "10dd44bc671f4463bd47f5f11344ecf5",
  formTitle: "Recreational Harvest Reporting",
  serviceItemId: "a4c93e44b9284f01a0b69b2b73a526bf",
  serviceUrl:
    "https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer",
};

const PORTAL_INFO = {
  url: "https://www.arcgis.com",
  token: "",
};

// ============================================
// TYPES
// ============================================

interface TriggerWebhookRequest {
  objectId: number;
  globalId: string;
  dmfAttributes: Record<string, unknown>;
  geometry: Record<string, unknown>;
  skipWebhooks?: boolean;
}

interface WebhookResult {
  url: string;
  success: boolean;
  status?: number;
  error?: string;
}

// ============================================
// HELPERS
// ============================================

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

export function buildWebhookPayload(req: TriggerWebhookRequest): Record<string, unknown> {
  const { objectId, globalId, dmfAttributes, geometry } = req;

  return {
    applyEdits: [
      {
        id: 0,
        adds: [{ attributes: dmfAttributes, geometry }],
      },
    ],
    response: [
      {
        id: 0,
        addResults: [
          {
            objectId,
            uniqueId: objectId,
            globalId,
            success: true,
          },
        ],
      },
    ],
    feature: {
      attributes: { ...dmfAttributes, OBJECTID: objectId },
      geometry: null,
    },
    layerInfo: LAYER_INFO,
    result: {
      globalId,
      objectId,
      uniqueId: objectId,
      success: true,
    },
    attachments: null,
    eventType: "addData",
    portalInfo: PORTAL_INFO,
    surveyInfo: SURVEY_INFO,
  };
}

async function postWebhook(
  url: string,
  payload: Record<string, unknown>,
  label: string
): Promise<WebhookResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    console.log(`📤 [${label}] Posting to webhook...`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 202) {
      console.log(`✅ [${label}] Webhook accepted (${response.status})`);
      return { url: label, success: true, status: response.status };
    } else {
      const errorText = await response.text().catch(() => "unable to read body");
      console.warn(`⚠️ [${label}] Webhook rejected: ${response.status} - ${errorText}`);
      return { url: label, success: false, status: response.status, error: errorText };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ [${label}] Webhook failed: ${message}`);
    return { url: label, success: false, error: message };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  // Parse request body
  let body: TriggerWebhookRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  // Validate required fields
  if (!body.objectId || !body.globalId || !body.dmfAttributes) {
    return jsonResponse(
      {
        success: false,
        message: "Missing required fields: objectId, globalId, dmfAttributes",
      },
      400
    );
  }

  console.log(`📡 Webhook trigger received for objectId: ${body.objectId}, globalId: ${body.globalId}`);

  // Mock mode: log and return without calling webhooks
  if (body.skipWebhooks) {
    console.log("🧪 Mock mode — skipping webhook calls");
    return jsonResponse({
      success: true,
      message: "Webhooks skipped (mock mode)",
      webhooksTriggered: 0,
    });
  }

  // Retrieve webhook URLs from secrets
  const webhookUrl1 = Deno.env.get("DMF_WEBHOOK_URL_1");
  const webhookUrl2 = Deno.env.get("DMF_WEBHOOK_URL_2");

  if (!webhookUrl1 && !webhookUrl2) {
    console.error("❌ No webhook URLs configured in secrets");
    return jsonResponse(
      {
        success: false,
        message: "No webhook URLs configured",
      },
      500
    );
  }

  // Build the webhook payload (matches Survey123 format)
  const payload = buildWebhookPayload(body);
  console.log(`📦 Payload built for confirmation: ${body.dmfAttributes.Unique1 ?? "unknown"}`);

  // Post to all configured webhooks in parallel
  const webhookPromises: Promise<WebhookResult>[] = [];
  if (webhookUrl1) {
    webhookPromises.push(postWebhook(webhookUrl1, payload, "Webhook-1"));
  }
  if (webhookUrl2) {
    webhookPromises.push(postWebhook(webhookUrl2, payload, "Webhook-2"));
  }

  const results = await Promise.allSettled(webhookPromises);

  // Summarize results
  let triggeredCount = 0;
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      triggeredCount++;
    } else if (result.status === "fulfilled") {
      errors.push(`${result.value.url}: ${result.value.error}`);
    } else {
      errors.push(`Unexpected error: ${result.reason}`);
    }
  }

  console.log(`📊 Webhooks complete: ${triggeredCount}/${webhookPromises.length} succeeded`);
  if (errors.length > 0) {
    console.warn(`⚠️ Webhook errors: ${JSON.stringify(errors)}`);
  }

  // Always return 200 to the app (fire-and-forget)
  return jsonResponse({
    success: true,
    message: `${triggeredCount}/${webhookPromises.length} webhooks triggered`,
    webhooksTriggered: triggeredCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// Only start the server when deployed, not during test runs.
// Deno.mainModule ends with the entrypoint file when running directly;
// during `deno test` it points to the test file instead.
if (import.meta.main) {
  Deno.serve(handleRequest);
}
