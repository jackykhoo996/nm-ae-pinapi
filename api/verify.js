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
      return res.status(400).json({
        error: "msisdn required"
      });
    }

    if (!pin_code) {
      return res.status(400).json({
        error: "pin_code required"
      });
    }

    if (!request_id) {
      return res.status(400).json({
        error: "request_id required"
      });
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

    console.log(
      "PURETECH VERIFY RAW RESPONSE:",
      rawResponse
    );

    let verifyData = {};

    try {
      verifyData = JSON.parse(rawResponse);
    } catch (err) {
      return res.status(500).json({
        parse_error: err.message,
        raw_response: rawResponse
      });
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: verifyData.status || "UNKNOWN",
        verify_response: verifyData
      })
      .eq("request_id", request_id);

    console.log(
      "SUPABASE UPDATE ERROR:",
      updateError
    );

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