import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {

    const {
      msisdn,
      click_id = "test_click"
    } = req.body || {};

    if (!msisdn) {
      return res.status(400).json({
        error: "msisdn required"
      });
    }

    const apiUrl =
      `https://prod.api.puretechglobal.net/api_hub/api_hub` +
      `?offer_id=4910` +
      `&aff_id=598` +
      `&click_id=${click_id}` +
      `&gid=299` +
      `&shortcode=1741` +
      `&keyword=gd` +
      `&telco=etisalat` +
      `&action=pin_request` +
      `&msisdn=${msisdn}` +
      `&country=uae` +
      `&lang=en`;

    const response = await fetch(apiUrl);

    const data = await response.json();

    await supabase
      .from("leads")
      .insert({
        click_id,
        msisdn,
        carrier: "Etisalat",
        country: "UAE",
        request_id: data.request_id || null,
        status: data.status || "UNKNOWN",
        pin_response: data
      });

    return res.status(200).json(data);

  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }
}