import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { T, useResponsive } from "./styles/theme";
import Header from "./components/Header";
import InscriptionView from "./components/InscriptionView";
import AdminView from "./components/AdminView";
import Toast from "./components/Toast";

const DEFAULT_CFG = {
  title: "Kermesse de l'école",
  description: "Inscrivez-vous aux stands",
  icon: "🎪",
  header_image: "",
  admin_password: "admin123",
};

export default function App() {
  const { mobile } = useResponsive();
  const [view, setView] = useState("inscription");
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [stands, setStands] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((msg) => setToast(msg), []);

  // ─── Load font
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  // ─── Dynamic favicon
  useEffect(() => {
    const icon = cfg.icon || "🎪";
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.font = "52px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, 32, 36);
    const url = canvas.toDataURL("image/png");

    // Remove all existing favicons
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    existingIcons.forEach(link => link.remove());

    // Create new one
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = url;
    document.head.appendChild(link);
  }, [cfg.icon]);

  // ─── Dynamic page title
  useEffect(() => {
    document.title = `${cfg.icon || "🎪"} ${cfg.title || "Kermesse"} — Inscription`;
  }, [cfg.title, cfg.icon]);

  // ─── Fetch all data
  const fetchAll = useCallback(async () => {
    const [cfgRes, standsRes, slotsRes, insRes] = await Promise.all([
      supabase.from("ins_config").select("*").eq("id", "main").single(),
      supabase.from("ins_stands").select("*").order("position"),
      supabase.from("ins_timeslots").select("*").order("position"),
      supabase.from("ins_inscriptions").select("*").order("created_at"),
    ]);

    if (cfgRes.data) setCfg(cfgRes.data);
    if (standsRes.data) setStands(standsRes.data);
    if (slotsRes.data) setTimeslots(slotsRes.data);
    if (insRes.data) setInscriptions(insRes.data);
    setLoading(false);
  }, []);

  const fetchInscriptions = useCallback(async () => {
    const { data } = await supabase.from("ins_inscriptions").select("*").order("created_at");
    if (data) setInscriptions(data);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("inscriptions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ins_inscriptions" }, () => {
        fetchInscriptions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInscriptions]);

  if (loading) {
    return (
      <div style={{
        fontFamily: T.font, display: "flex", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", color: T.muted, fontSize: 14,
      }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: T.font, color: T.text,
      maxWidth: 900, margin: "0 auto",
      padding: mobile ? "0 4px 80px" : "0 8px 60px",
    }}>
      <Header cfg={cfg} view={view} setView={setView} />

      <main>
        {view === "inscription" && (
          <InscriptionView
            stands={stands}
            timeslots={timeslots}
            inscriptions={inscriptions}
            cfg={cfg}
            showToast={showToast}
            onRefresh={fetchInscriptions}
          />
        )}

        {view === "admin" && (
          <AdminView
            cfg={cfg}
            stands={stands}
            timeslots={timeslots}
            inscriptions={inscriptions}
            setCfg={setCfg}
            setStands={setStands}
            setTimeslots={setTimeslots}
            showToast={showToast}
            onRefresh={fetchAll}
          />
        )}
      </main>

      <footer style={{
        textAlign: "center", padding: "20px 0 10px",
        fontSize: 11, color: T.hint, fontFamily: T.font,
      }}>
        Kermesse Inscription · {new Date().getFullYear()}
      </footer>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
