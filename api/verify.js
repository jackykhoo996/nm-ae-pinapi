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

    if (!msisdn || !pin_code || !request_id) {
      return res.status(400).json({
        error: "msisdn, pin_code and request_id are required"
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
      `&msisdn=${msisdn}` +
      `&country=uae` +
      `&lang=en` +
      `&pin_code=${pin_code}` +
      `&request_id=${request_id}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    const { error } = await supabase
      .from("leads")
      .update({
        status: data.status || "UNKNOWN",
        verify_response: data
      })
      .eq("request_id", request_id);

    console.log("VERIFY RESPONSE:", data);
    console.log("SUPABASE ERROR:", error);

    return res.status(200).json(data);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
}