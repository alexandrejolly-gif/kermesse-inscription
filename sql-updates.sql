-- Ajouter le champ info_text à ins_config
ALTER TABLE ins_config ADD COLUMN IF NOT EXISTS info_text TEXT DEFAULT '';

-- Ajouter le champ allow_modifications à ins_config
ALTER TABLE ins_config ADD COLUMN IF NOT EXISTS allow_modifications BOOLEAN DEFAULT true;

-- Créer la table ins_spectacles
CREATE TABLE IF NOT EXISTS ins_spectacles (
  id TEXT PRIMARY KEY,
  heure TEXT NOT NULL,
  classe TEXT NOT NULL,
  titre TEXT NOT NULL,
  enseignant TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS et politique de lecture publique
ALTER TABLE ins_spectacles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read spectacles" ON ins_spectacles;
CREATE POLICY "Public read spectacles" ON ins_spectacles FOR SELECT USING (true);
