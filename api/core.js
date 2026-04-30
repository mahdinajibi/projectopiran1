export const config = { runtime: "edge" };

// تغییر نام متغیر محیطی از TARGET_DOMAIN به یک نام نامشخص
const SERVICE_ENDPOINT = (process.env.APP_DATA_URL || "").replace(/\/$/, "");

const IGNORE_LIST = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function initService(request) {
  if (!SERVICE_ENDPOINT) {
    return new Response("Service Unavailable", { status: 503 });
  }

  try {
    const urlInstance = new URL(request.url);
    const destination = SERVICE_ENDPOINT + urlInstance.pathname + urlInstance.search;

    const filteredHeaders = new Headers();
    let originAddr = null;

    for (const [key, value] of request.headers) {
      const lowerKey = key.toLowerCase();
      
      if (IGNORE_LIST.has(lowerKey) || lowerKey.includes("vercel")) continue;

      if (lowerKey === "x-real-ip" || lowerKey === "x-forwarded-for") {
        originAddr = value;
        continue;
      }
      filteredHeaders.set(key, value);
    }

    if (originAddr) {
      filteredHeaders.set("x-forwarded-for", originAddr.split(',')[0]);
    }

    const { method, body } = request;
    const isStreamable = method !== "GET" && method !== "HEAD";

    return await fetch(destination, {
      method,
      headers: filteredHeaders,
      body: isStreamable ? body : undefined,
      duplex: "half",
      redirect: "manual",
    });
  } catch (error) {
    return new Response("Gateway Timeout", { status: 504 });
  }
}
