export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, firstName, inscriptions, siteTitle } = req.body;

  if (!email || !inscriptions || !inscriptions.length) {
    return res.status(400).json({ error: "Missing email or inscriptions" });
  }

  const rows = inscriptions
    .map(
      (i) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${i.standEmoji} ${i.standLabel}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${i.slotLabel}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#EA580C,#FB923C);padding:20px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:18px">🎪 ${siteTitle || "Kermesse"}</h1>
      </div>
      <div style="padding:20px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
        <p>Bonjour <strong>${firstName || ""}</strong>,</p>
        <p>Vos inscriptions ont bien été enregistrées :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="background:#FFF7ED">
            <th style="padding:8px 12px;text-align:left;font-size:13px">Stand</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px">Créneau</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#78716C;font-size:13px">Vous pouvez modifier vos inscriptions à tout moment en retournant sur le site avec votre adresse email.</p>
      </div>
    </div>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Kermesse <onboarding@resend.dev>",
        to: [email],
        subject: `✅ Confirmation inscription — ${siteTitle || "Kermesse"}`,
        html,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
