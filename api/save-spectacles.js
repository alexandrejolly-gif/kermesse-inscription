import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { spectacles } = req.body;

  // Supprimer tous les spectacles existants
  const { error: delError } = await supabase
    .from("ins_spectacles")
    .delete()
    .neq("id", "");

  if (delError) return res.status(500).json({ error: delError.message });

  // Insérer les nouveaux spectacles si la liste n'est pas vide
  if (spectacles && spectacles.length > 0) {
    const { error: insError } = await supabase
      .from("ins_spectacles")
      .insert(spectacles);

    if (insError) return res.status(500).json({ error: insError.message });
  }

  res.status(200).json({ ok: true });
}
