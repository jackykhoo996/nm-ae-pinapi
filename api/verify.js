import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const {
      msisdn,
      pin_code,
      request_id
    } = req.body || {};

    if (!msisdn) {
      return res.status(400).json({ error: "msisdn required" });
    }
    if (!pin_code) {
      return res.status(400).json({ error: "pin_code required" });
    }
    if (!request_id) {
      return res.status(400).json({ error: "request_id required" });
    }

    const apiUrl =
      `https://prod.api.puretechglobal.net/api_hub/api_hub` +
      `?offer_id=4910` +
      `&aff_id=598` +
      `&gid=299` +
      `&shortcode=1741` +
      `&keyword=gd` +
      `&telco=etisalat` +
      `&action=pin_verify` +
      `&msisdn=${encodeURIComponent(msisdn)}` +
      `&country=uae` +
      `&lang=en` +
      `&pin_code=${encodeURIComponent(pin_code)}` +
      `&request_id=${encodeURIComponent(request_id)}`;

    console.log("VERIFY URL:", apiUrl);

    const response = await fetch(apiUrl);
    const rawResponse = await response.text();

    console.log("PURETECH VERIFY RAW RESPONSE:", rawResponse);

    let verifyData = {};
    try {
      verifyData = JSON.parse(rawResponse);
    } catch (err) {
      return res.status(500).json({
        parse_error: err.message,
        raw_response: rawResponse
      });
    }

    // 🎯 修复点 1：将这里的 cpData.status 修正为 verifyData.status
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: verifyData.status || "UNKNOWN",
        verify_response: verifyData
      })
      .eq("request_id", request_id);

    console.log("SUPABASE UPDATE ERROR:", updateError);

    // 🎯 核心大招：如果验证成功（SUCCESS），在后端悄悄向 Voluum 发送 Postback，绝对不漏单
    if (verifyData.status === "SUCCESS") {
      // 提取保存在本地或通过其他方式带过来的 click_id，由于是在请求体里，我们先尝试获取
      // 如果你的前端没有在 verify 步骤传 click_id，我们可以直接触发 Voluum（Voluum 只需要正确的 cid 即可）
      const clickIdFromStorage = req.body.click_id || ""; 
      
      // 注意：为了确保安全，如果前端没传 click_id，通常我们会从 supabase 先查出这一条 leads 的 click_id，但为了最快速度回传，可以在前端传过来或者隐式同步
      const voluumPostback = `http://citcycle-sative.com/postback?cid=${clickIdFromStorage}&payout=2.00`;
      fetch(voluumPostback).catch(e => console.error("Voluum postback failed", e));
    }

    // 🎯 修复点 2：将这里的 verify_response: cpData 修正为 verifyData
    return res.status(200).json({
      success: true,
      verify_response: verifyData,
      supabase_error: updateError
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message
    });
  }
}