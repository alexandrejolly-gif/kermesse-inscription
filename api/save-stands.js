import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { stands, timeslots } = req.body;

  // ─── Stands: delete removed, upsert remaining
  const standIds = stands.map((s) => s.id);
  const { error: delStandErr } = await supabase
    .from("ins_stands")
    .delete()
    .not("id", "in", `(${standIds.join(",")})`);

  if (delStandErr) return res.status(500).json({ error: delStandErr.message });

  for (const s of stands) {
    const { error } = await supabase.from("ins_stands").upsert({
      id: s.id,
      label: s.label,
      emoji: s.emoji,
      capacity: s.capacity,
      position: s.position,
    });
    if (error) return res.status(500).json({ error: error.message });
  }

  // ─── Timeslots: delete removed, upsert remaining
  const slotIds = timeslots.map((t) => t.id);
  const { error: delSlotErr } = await supabase
    .from("ins_timeslots")
    .delete()
    .not("id", "in", `(${slotIds.join(",")})`);

  if (delSlotErr) return res.status(500).json({ error: delSlotErr.message });

  for (const t of timeslots) {
    const { error } = await supabase.from("ins_timeslots").upsert({
      id: t.id,
      label: t.label,
      position: t.position,
    });
    if (error) return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
