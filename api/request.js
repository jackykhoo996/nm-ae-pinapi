import { createClient } from "@supabase/supabase-js";

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export default async function handler(req, res) {
  // 强制允许跨域（CORS），防止前端 fetch 被浏览器阻断
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { msisdn, click_id = "test_click" } = req.body || {};

    if (!msisdn) {
      return res.status(400).json({ error: "msisdn required" });
    }

    // 1. 拼接 Puretech (CP) 的第一步 PIN Request 官方网关 URL
    const apiUrl =
      `https://prod.api.puretechglobal.net/api_hub/api_hub` +
      `?offer_id=4910` +
      `&aff_id=598` +
      `&gid=299` +
      `&shortcode=1741` +
      `&keyword=gd` +
      `&telco=etisalat` +
      `&action=pin_request` +
      `&msisdn=${encodeURIComponent(msisdn)}` +
      `&country=uae` +
      `&lang=en`;

    console.log("CP REQUEST URL:", apiUrl);

    // 2. 发送请求给 CP 网关
    const response = await fetch(apiUrl);
    const rawResponse = await response.text();

    console.log("CP ORIGINAL RAW RESPONSE:", rawResponse);

    let cpData = {};
    try {
      cpData = JSON.parse(rawResponse);
    } catch (parseErr) {
      // 如果 CP 没有返回标准的 JSON（比如返回了 HTML 报错），做安全降级容错
      cpData = { status: "ERROR", desc: rawResponse || "Invalid CP response" };
    }

    // 3. 核心修复：安全写入 Supabase。如果写入失败，捕获错误，绝不报 500
    let supabaseError = null;
    try {
      const { error } = await supabase.from("leads").insert([
        {
          msisdn: msisdn,
          click_id: click_id,
          request_id: cpData.request_id || "mock_req_" + Date.now(), // 如果CP拒绝，生成一个假ID供第二步走后门测试
          status: cpData.status || "ERROR",
          pin_response: cpData
        }
      ]);
      supabaseError = error;
      if (error) console.error("Supabase Write Error:", error);
    } catch (dbErr) {
      supabaseError = dbErr.message;
      console.error("Supabase Exception:", dbErr);
    }

    // 4. 将结果返回给前端。即使 CP 拒绝或数据库报错，也返回 200 让前端能够抓到状态并放行
    return res.status(200).json({
      status: cpData.status || "ERROR",
      request_id: cpData.request_id || null,
      desc: cpData.desc || "Rejected",
      supabase_logged: !supabaseError,
      db_msg: supabaseError
    });

  } catch (err) {
    console.error("Global Server Crash Avoided:", err);
    return res.status(500).json({
      status: "ERROR",
      desc: "Internal Server Exception",
      error: err.message
    });
  }
}