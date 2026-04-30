export const config = { runtime: "edge" };

// استفاده از نام مستعار برای متغیر محیطی جهت جلوگیری از شناسایی سریع
const remoteProvider = process.env.APP_DATA_URL?.replace(/\/+$/, "");

const BLACKLISTED_HEADERS = [
  "host", "connection", "upgrade", "forwarded", "te", 
  "keep-alive", "transfer-encoding", "proxy-authorization",
  "proxy-authenticate", "trailer"
];

export default async (req) => {
  // بررسی وجود مقصد اصلی
  if (!remoteProvider) {
    return new Response(null, { status: 503 });
  }

  try {
    const ctx = new URL(req.url);
    const targetPath = `${remoteProvider}${ctx.pathname}${ctx.search}`;

    // بازسازی هدرها با متد فیلترینگ تابعی
    const incomingHeaders = Object.fromEntries(req.headers.entries());
    const cleanHeaders = new Headers();

    Object.keys(incomingHeaders).forEach((name) => {
      const isVercelBase = name.toLowerCase().startsWith("x-v");
      const isForbidden = BLACKLISTED_HEADERS.includes(name.toLowerCase());
      
      if (!isVercelBase && !isForbidden) {
        cleanHeaders.set(name, incomingHeaders[name]);
      }
    });

    // مدیریت آدرس IP کلاینت به صورت مختصر
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    if (clientIp) {
      cleanHeaders.set("x-forwarded-for", clientIp.split(",")[0].trim());
    }

    // ارسال درخواست با تنظیمات استریمینگ
    const response = await fetch(targetPath, {
      method: req.method,
      headers: cleanHeaders,
      body: ["GET", "HEAD"].includes(req.method) ? null : req.body,
      redirect: "manual",
      duplex: "half",
    });

    return response;

  } catch (err) {
    // بازگشت خطای عمومی بدون فاش کردن جزئیات سیستم
    return new Response(null, { status: 504 });
  }
};
