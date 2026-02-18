import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildWebhookPayload,
  handleRequest,
  jsonResponse,
} from "./index.ts";

// ============================================
// Test helpers
// ============================================

function makeRequest(
  method: string,
  body?: Record<string, unknown>
): Request {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request("http://localhost/trigger-dmf-webhook", init);
}

const VALID_BODY = {
  objectId: 42,
  globalId: "{ABCD-1234-EF56}",
  dmfAttributes: {
    Unique1: "CONF-001",
    Species: "Red Drum",
    Quantity: 2,
  },
  geometry: { x: -77.5, y: 34.7 },
};

// ============================================
// buildWebhookPayload
// ============================================

Deno.test("buildWebhookPayload - produces valid ArcGIS Survey123 payload structure", () => {
  const payload = buildWebhookPayload(VALID_BODY);

  // Top-level keys expected by the Survey123 webhook format
  assertExists(payload.applyEdits);
  assertExists(payload.response);
  assertExists(payload.feature);
  assertExists(payload.layerInfo);
  assertExists(payload.result);
  assertExists(payload.portalInfo);
  assertExists(payload.surveyInfo);
  assertEquals(payload.attachments, null);
  assertEquals(payload.eventType, "addData");
});

Deno.test("buildWebhookPayload - includes layerInfo, surveyInfo, and portalInfo", () => {
  const payload = buildWebhookPayload(VALID_BODY);

  // layerInfo
  const layerInfo = payload.layerInfo as Record<string, unknown>;
  assertEquals(layerInfo.name, "RecreationalReportingEntry");
  assertEquals(layerInfo.type, "Feature Layer");
  assertEquals(layerInfo.globalIdField, "GlobalID");
  assertEquals(layerInfo.objectIdField, "OBJECTID");
  assertExists((layerInfo.relationships as unknown[]).length);

  // surveyInfo
  const surveyInfo = payload.surveyInfo as Record<string, unknown>;
  assertEquals(surveyInfo.formTitle, "Recreational Harvest Reporting");
  assertExists(surveyInfo.formItemId);
  assertExists(surveyInfo.serviceItemId);
  assertExists(surveyInfo.serviceUrl);

  // portalInfo
  const portalInfo = payload.portalInfo as Record<string, unknown>;
  assertEquals(portalInfo.url, "https://www.arcgis.com");
  assertEquals(portalInfo.token, "");
});

Deno.test("buildWebhookPayload - correctly maps objectId and globalId", () => {
  const payload = buildWebhookPayload(VALID_BODY);

  // result block
  const result = payload.result as Record<string, unknown>;
  assertEquals(result.objectId, 42);
  assertEquals(result.globalId, "{ABCD-1234-EF56}");
  assertEquals(result.uniqueId, 42);
  assertEquals(result.success, true);

  // response block
  const response = payload.response as Array<Record<string, unknown>>;
  const addResults = response[0].addResults as Array<Record<string, unknown>>;
  assertEquals(addResults[0].objectId, 42);
  assertEquals(addResults[0].globalId, "{ABCD-1234-EF56}");
  assertEquals(addResults[0].uniqueId, 42);

  // applyEdits block
  const applyEdits = payload.applyEdits as Array<Record<string, unknown>>;
  assertEquals(applyEdits[0].id, 0);
});

Deno.test("buildWebhookPayload - includes dmfAttributes in feature and applyEdits", () => {
  const payload = buildWebhookPayload(VALID_BODY);

  // feature.attributes should spread dmfAttributes + add OBJECTID
  const feature = payload.feature as Record<string, unknown>;
  const attrs = feature.attributes as Record<string, unknown>;
  assertEquals(attrs.Species, "Red Drum");
  assertEquals(attrs.Quantity, 2);
  assertEquals(attrs.Unique1, "CONF-001");
  assertEquals(attrs.OBJECTID, 42);
  assertEquals(feature.geometry, null);

  // applyEdits[0].adds[0].attributes should be the raw dmfAttributes
  const applyEdits = payload.applyEdits as Array<Record<string, unknown>>;
  const adds = applyEdits[0].adds as Array<Record<string, unknown>>;
  assertEquals(adds[0].attributes, VALID_BODY.dmfAttributes);
  assertEquals(adds[0].geometry, VALID_BODY.geometry);
});

Deno.test("buildWebhookPayload - handles minimal dmfAttributes", () => {
  const minimal = {
    objectId: 1,
    globalId: "{MIN-0001}",
    dmfAttributes: {},
    geometry: {},
  };

  const payload = buildWebhookPayload(minimal);

  const feature = payload.feature as Record<string, unknown>;
  const attrs = feature.attributes as Record<string, unknown>;
  // Only OBJECTID should be present when dmfAttributes is empty
  assertEquals(attrs.OBJECTID, 1);
  assertEquals(Object.keys(attrs).length, 1);

  const result = payload.result as Record<string, unknown>;
  assertEquals(result.objectId, 1);
  assertEquals(result.globalId, "{MIN-0001}");
});

// ============================================
// jsonResponse
// ============================================

Deno.test("jsonResponse - returns correct status code", async () => {
  const res200 = jsonResponse({ ok: true });
  assertEquals(res200.status, 200);

  const res400 = jsonResponse({ error: "bad" }, 400);
  assertEquals(res400.status, 400);

  const res500 = jsonResponse({ error: "server" }, 500);
  assertEquals(res500.status, 500);
});

Deno.test("jsonResponse - sets CORS headers", () => {
  const res = jsonResponse({ test: true });
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(
    res.headers.get("Access-Control-Allow-Headers"),
    "authorization, x-client-info, apikey, content-type"
  );
  assertEquals(res.headers.get("Content-Type"), "application/json");
});

Deno.test("jsonResponse - serializes body as JSON", async () => {
  const body = { success: true, count: 5, nested: { key: "value" } };
  const res = jsonResponse(body);
  const parsed = await res.json();
  assertEquals(parsed.success, true);
  assertEquals(parsed.count, 5);
  assertEquals(parsed.nested.key, "value");
});

// ============================================
// handleRequest
// ============================================

Deno.test("handleRequest - returns 200 ok for OPTIONS (CORS preflight)", async () => {
  const req = makeRequest("OPTIONS");
  const res = await handleRequest(req);

  assertEquals(res.status, 200);
  const text = await res.text();
  assertEquals(text, "ok");
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assertEquals(
    res.headers.get("Access-Control-Allow-Headers"),
    "authorization, x-client-info, apikey, content-type"
  );
});

Deno.test("handleRequest - returns 405 for non-POST/non-OPTIONS methods", async () => {
  for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
    const req = makeRequest(method);
    const res = await handleRequest(req);
    assertEquals(res.status, 405);
    const body = await res.json();
    assertEquals(body.success, false);
    assertEquals(body.message, "Method not allowed");
  }
});

Deno.test("handleRequest - returns 400 for invalid JSON body", async () => {
  const req = new Request("http://localhost/trigger-dmf-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json {{{",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.success, false);
  assertEquals(body.message, "Invalid JSON body");
});

Deno.test("handleRequest - returns 400 for missing required fields", async () => {
  // Missing objectId
  const res1 = await handleRequest(
    makeRequest("POST", { globalId: "{ID}", dmfAttributes: {} })
  );
  assertEquals(res1.status, 400);
  const body1 = await res1.json();
  assertEquals(body1.message, "Missing required fields: objectId, globalId, dmfAttributes");

  // Missing globalId
  const res2 = await handleRequest(
    makeRequest("POST", { objectId: 1, dmfAttributes: {} })
  );
  assertEquals(res2.status, 400);

  // Missing dmfAttributes
  const res3 = await handleRequest(
    makeRequest("POST", { objectId: 1, globalId: "{ID}" })
  );
  assertEquals(res3.status, 400);
});

Deno.test("handleRequest - returns mock mode response when skipWebhooks=true", async () => {
  const req = makeRequest("POST", {
    ...VALID_BODY,
    skipWebhooks: true,
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.message, "Webhooks skipped (mock mode)");
  assertEquals(body.webhooksTriggered, 0);
});

Deno.test("handleRequest - returns 500 when no webhook URLs configured", async () => {
  // Clear any webhook env vars
  Deno.env.delete("DMF_WEBHOOK_URL_1");
  Deno.env.delete("DMF_WEBHOOK_URL_2");

  const req = makeRequest("POST", VALID_BODY);
  const res = await handleRequest(req);
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.success, false);
  assertEquals(body.message, "No webhook URLs configured");
});

Deno.test("handleRequest - posts to configured webhooks and returns success counts", async () => {
  // Set up webhook URLs
  Deno.env.set("DMF_WEBHOOK_URL_1", "https://webhook1.example.com/hook");
  Deno.env.set("DMF_WEBHOOK_URL_2", "https://webhook2.example.com/hook");

  // Save original fetch and mock it
  const originalFetch = globalThis.fetch;
  const fetchCalls: { url: string; body: string }[] = [];

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push({ url, body: init?.body as string ?? "" });
    return new Response(JSON.stringify({ status: "accepted" }), { status: 202 });
  }) as typeof fetch;

  try {
    const req = makeRequest("POST", VALID_BODY);
    const res = await handleRequest(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.webhooksTriggered, 2);
    assertEquals(body.message, "2/2 webhooks triggered");
    assertEquals(body.errors, undefined);

    // Verify fetch was called twice with correct URLs
    assertEquals(fetchCalls.length, 2);
    assertEquals(fetchCalls[0].url, "https://webhook1.example.com/hook");
    assertEquals(fetchCalls[1].url, "https://webhook2.example.com/hook");

    // Verify payload structure sent to webhooks
    const sentPayload = JSON.parse(fetchCalls[0].body);
    assertExists(sentPayload.applyEdits);
    assertExists(sentPayload.surveyInfo);
    assertEquals(sentPayload.eventType, "addData");
    assertEquals(
      (sentPayload.result as Record<string, unknown>).objectId,
      VALID_BODY.objectId
    );
  } finally {
    // Restore original fetch and clean env
    globalThis.fetch = originalFetch;
    Deno.env.delete("DMF_WEBHOOK_URL_1");
    Deno.env.delete("DMF_WEBHOOK_URL_2");
  }
});

Deno.test("handleRequest - reports partial success when one webhook fails", async () => {
  Deno.env.set("DMF_WEBHOOK_URL_1", "https://webhook1.example.com/hook");
  Deno.env.set("DMF_WEBHOOK_URL_2", "https://webhook2.example.com/hook");

  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    _init?: RequestInit
  ): Promise<Response> => {
    callCount++;
    if (callCount === 1) {
      // First webhook succeeds
      return new Response("ok", { status: 200 });
    } else {
      // Second webhook fails
      return new Response("Internal Server Error", { status: 500 });
    }
  }) as typeof fetch;

  try {
    const req = makeRequest("POST", VALID_BODY);
    const res = await handleRequest(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.webhooksTriggered, 1);
    assertEquals(body.message, "1/2 webhooks triggered");
    assertExists(body.errors);
    assertEquals(body.errors.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("DMF_WEBHOOK_URL_1");
    Deno.env.delete("DMF_WEBHOOK_URL_2");
  }
});

Deno.test("handleRequest - posts to single webhook when only one URL configured", async () => {
  Deno.env.set("DMF_WEBHOOK_URL_1", "https://webhook1.example.com/hook");
  Deno.env.delete("DMF_WEBHOOK_URL_2");

  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    _init?: RequestInit
  ): Promise<Response> => {
    fetchCallCount++;
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const req = makeRequest("POST", VALID_BODY);
    const res = await handleRequest(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.webhooksTriggered, 1);
    assertEquals(body.message, "1/1 webhooks triggered");
    assertEquals(fetchCallCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("DMF_WEBHOOK_URL_1");
  }
});
