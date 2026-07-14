// ============================================================
// Connect · Entradas — Edge Function "send-ticket"
// Envía la entrada por correo (vía Resend) cuando un cliente la reclama.
//
// CÓMO DESPLEGAR (desde el panel de Supabase, sin instalar nada):
//   1. Supabase → Edge Functions → "Create a function" → nombre: send-ticket
//   2. Pega este archivo completo y "Deploy".
//   3. En Edge Functions → Secrets, agrega:  RESEND_API_KEY = (tu clave de Resend)
//      (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.)
//   Opcionales: TICKET_FROM (remitente) y SITE_URL.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("TICKET_FROM") ?? "Connect Entradas <entradas@connect-lima.com>";
const SITE = Deno.env.get("SITE_URL") ?? "https://entradas.connect-lima.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { ticket_id } = await req.json().catch(() => ({}));
    if (!ticket_id) return json({ error: "ticket_id requerido" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Solo el dueño de la entrada puede pedir su envío
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);

    const { data: t } = await admin
      .from("tickets")
      .select("id, code, token, holder, status, event_id, type_id, user_id")
      .eq("id", ticket_id)
      .maybeSingle();
    if (!t) return json({ error: "not_found" }, 404);
    if (!user || t.user_id !== user.id) return json({ error: "forbidden" }, 403);

    const email = (t.holder && t.holder.email) ? String(t.holder.email).trim() : "";
    if (!email) return json({ ok: true, skipped: "sin email" });

    const { data: ev } = await admin
      .from("events").select("name, date_iso, start_time, venue")
      .eq("id", t.event_id).maybeSingle();

    let typeName = "";
    if (t.type_id) {
      const { data: ty } = await admin.from("ticket_types").select("name").eq("id", t.type_id).maybeSingle();
      typeName = ty?.name ?? "";
    }

    const url = `${SITE}/#/t/${t.id}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent("CNCT|" + t.id + "|" + t.token)}`;
    const html = emailHTML({
      name: t.holder?.name ?? "",
      eventName: ev?.name ?? "Tu evento",
      dateText: longDateEs(ev?.date_iso ?? ""),
      time: ev?.start_time ?? "",
      venue: ev?.venue ?? "",
      typeName, code: t.code ?? "", url, qr,
    });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject: `Tu entrada — ${ev?.name ?? "Connect"}`, html }),
    });
    const out = await r.json();
    if (!r.ok) return json({ error: "resend", detail: out }, 500);
    return json({ ok: true, id: out.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
function longDateEs(iso: string): string {
  if (!iso) return "Fecha por confirmar";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (isNaN(dt.getTime())) return "Fecha por confirmar";
  return `${DIAS[dt.getDay()]} ${dt.getDate()} ${MESES[dt.getMonth()]} ${dt.getFullYear()}`;
}

function emailHTML(d: Record<string, string>): string {
  const meta = [d.dateText, d.time, d.venue].filter(Boolean).join(" · ");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:26px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141414;border:1px solid #262626;border-radius:18px;overflow:hidden;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:26px 30px 6px;text-align:center;">
          <img src="${SITE}/assets/connect-white-crop.png" alt="Connect" width="158" height="34" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;height:34px;width:158px;">
        </td></tr>
        <tr><td style="padding:14px 30px 4px;text-align:center;">
          <div style="color:#9B9B9B;font-size:13px;">${d.name ? "Hola " + esc(d.name) + "," : "¡Hola!"} tu entrada está lista.</div>
          <h1 style="color:#fff;font-size:23px;margin:10px 0 4px;font-weight:700;">${esc(d.eventName)}</h1>
          <div style="color:#9B9B9B;font-size:13.5px;">${esc(meta)}</div>
        </td></tr>
        <tr><td align="center" style="padding:22px 30px 6px;">
          <div style="background:#fff;border-radius:16px;padding:16px;display:inline-block;">
            <img src="${d.qr}" width="220" height="220" alt="QR de tu entrada" style="display:block;border-radius:6px;">
          </div>
        </td></tr>
        <tr><td style="padding:12px 30px 4px;text-align:center;">
          ${d.typeName ? `<div style="color:#EDEDED;font-size:14px;font-weight:600;">${esc(d.typeName)}</div>` : ""}
          <div style="color:#5E5E5E;font-size:12px;letter-spacing:2px;margin-top:6px;">CÓDIGO</div>
          <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:2px;">${esc(d.code)}</div>
        </td></tr>
        <tr><td style="padding:22px 30px 8px;text-align:center;">
          <a href="${d.url}" style="display:inline-block;background:#fff;color:#0A0A0A;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px;">Ver mi entrada</a>
        </td></tr>
        <tr><td style="padding:6px 30px 26px;text-align:center;">
          <div style="color:#5E5E5E;font-size:11.5px;line-height:1.6;">Muestra este QR en la puerta. Es personal e intransferible.<br>Guarda este correo o tómale una captura.</div>
        </td></tr>
        <tr><td style="padding:16px 30px;text-align:center;border-top:1px solid #1F1F1F;">
          <div style="color:#5E5E5E;font-size:11px;">Connect · Lima. Productora de eventos premium.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
