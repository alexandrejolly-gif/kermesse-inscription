import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const { error } = await supabase.from("ins_inscriptions").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
