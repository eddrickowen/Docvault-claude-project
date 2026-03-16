/**
 * App — root entry. Only routing state + page rendering.
 * All data state lives in usePOStore. Shell layout lives in Layout.
 */
import { useState, useEffect, useCallback } from "react";
import { usePOStore } from "./store/usePOStore";
import { Layout } from "./components/Layout";
import { useToast } from "./hooks";
import {
  Dashboard,
  POList,
  AllItems,
  SupplierPage,
  MarginAnalysis,
  Settings,
} from "./pages";

export default function App() {
  const { init, _loaded, _toast } = usePOStore();
  const [view, setView] = useState("dashboard");
  const { show: toast, Toast } = useToast();

  /* ── Bootstrap store ── */
  useEffect(() => { init(); }, []);

  /* ── Bridge store toast → useToast UI ── */
  useEffect(() => {
    if (_toast?.msg) toast(_toast.msg);
  }, [_toast]);

  /* ── Jump to PO with highlight ── */
  const handleJump = useCallback((v = "po", id) => {
    setView(v);
    if (id)
      setTimeout(() => {
        const el = document.getElementById("po-row-" + id);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          el.classList.add("row-hl");
          setTimeout(() => el.classList.remove("row-hl"), 1800);
        }
      }, 150);
  }, []);

  if (!_loaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bg-app text-text-secondary text-sm">
        Memuat data…
      </div>
    );
  }

  return (
    <Layout view={view} setView={setView}>
      <Toast />
      {view === "dashboard" && <Dashboard onJump={handleJump} />}
      {view === "po"        && <POList />}
      {view === "items"     && <AllItems onJump={handleJump} />}
      {view === "supplier"  && <SupplierPage onJump={handleJump} />}
      {view === "margin"    && <MarginAnalysis />}
      {view === "settings"  && <Settings />}
    </Layout>
  );
}
