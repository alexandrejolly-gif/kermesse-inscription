import { useState } from "react";
import { supabase } from "../lib/supabase";
import { T, card, btn, inputBase, lbl } from "../styles/theme";

export default function TimeslotGenerator({ useResponsive, showToast, onRefresh }) {
  const { mobile } = useResponsive();
  const [type, setType] = useState("normal");
  const [startHour, setStartHour] = useState("10");
  const [endHour, setEndHour] = useState("17");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const start = parseInt(startHour);
    const end = parseInt(endHour);

    if (isNaN(start) || isNaN(end) || start >= end || start < 0 || end > 24) {
      showToast("❌ Horaires invalides (0-24h, début < fin)");
      return;
    }

    setGenerating(true);

    try {
      // Générer les créneaux
      const slots = [];
      const intervalMin = type === "securite" ? 30 : 60;
      let currentHour = start;
      let currentMin = 0;
      let position = type === "securite" ? 101 : 1; // Position de départ

      while (currentHour < end || (currentHour === end && currentMin === 0)) {
        if (currentHour >= end) break;

        const label = currentMin === 0
          ? `${currentHour}h`
          : `${currentHour}h${currentMin.toString().padStart(2, "0")}`;

        const id = `slot_${type}_${position}`;

        slots.push({
          id,
          label,
          position,
          type,
          start_time: `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`,
          end_time: null, // Sera calculé automatiquement par le parsing
        });

        position++;
        currentMin += intervalMin;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }

      if (slots.length === 0) {
        showToast("❌ Aucun créneau à générer");
        setGenerating(false);
        return;
      }

      // Supprimer les anciens créneaux de ce type
      await supabase.from("ins_timeslots").delete().eq("type", type);

      // Insérer les nouveaux créneaux
      const { error } = await supabase.from("ins_timeslots").insert(slots);
      if (error) throw error;

      showToast(`✅ ${slots.length} créneaux générés pour ${type === "securite" ? "Sécurité" : "Stands"}`);
      onRefresh();
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{
      ...card(mobile),
      background: T.primaryBg,
      border: `2px dashed ${T.primary}`,
      marginBottom: mobile ? 12 : 16,
    }}>
      <h4 style={{
        fontSize: mobile ? 13 : 14,
        fontWeight: 800,
        color: T.primaryDk,
        margin: "0 0 12px",
        fontFamily: T.font,
      }}>
        ⚡ Générateur automatique de créneaux
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 10 : 12 }}>
        {/* Type */}
        <div>
          <label style={lbl(mobile)}>Type de créneaux</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              ...inputBase(mobile),
              cursor: "pointer",
            }}
          >
            <option value="normal">🎪 Stands (1 heure)</option>
            <option value="securite">🔒 Sécurité (30 minutes)</option>
          </select>
        </div>

        {/* Horaires */}
        <div style={{ display: "flex", gap: mobile ? 8 : 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl(mobile)}>Début (h)</label>
            <input
              type="number"
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              min="0"
              max="23"
              style={inputBase(mobile)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl(mobile)}>Fin (h)</label>
            <input
              type="number"
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              min="1"
              max="24"
              style={inputBase(mobile)}
            />
          </div>
        </div>

        {/* Aperçu */}
        <div style={{
          padding: mobile ? 8 : 10,
          background: "rgba(255,255,255,0.6)",
          borderRadius: mobile ? 6 : 8,
          fontSize: mobile ? 11 : 12,
          color: T.muted,
          fontFamily: T.font,
        }}>
          <strong>Aperçu :</strong> {type === "securite" ? "30min" : "1h"} par créneau,
          de {startHour}h à {endHour}h →
          <strong style={{ color: T.primaryDk }}>
            {" "}{Math.ceil((parseInt(endHour) - parseInt(startHour)) * (type === "securite" ? 2 : 1))} créneaux
          </strong>
        </div>

        {/* Bouton générer */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            ...btn(true, mobile),
            opacity: generating ? 0.6 : 1,
            cursor: generating ? "wait" : "pointer",
          }}
        >
          {generating ? "⏳ Génération..." : "✨ Générer les créneaux"}
        </button>

        <p style={{
          fontSize: mobile ? 10 : 11,
          color: T.hint,
          margin: "4px 0 0",
          fontFamily: T.font,
          fontStyle: "italic",
        }}>
          ⚠️ Attention : remplace tous les créneaux existants de ce type
        </p>
      </div>
    </div>
  );
}
