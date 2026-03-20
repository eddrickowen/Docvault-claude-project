/**
 * App — root entry with PocketBase authentication
 * All data state lives in usePOStore. Shell layout lives in Layout.
 */
import { useState, useEffect, useCallback } from "react";
import { usePOStore } from "./store/usePOStore.pocketbase";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { useToast } from "./hooks";
import { pb, isAuthenticated } from "./lib/pocketbase";
import {
  Dashboard,
  POList,
  AllItems,
  SupplierPage,
  MarginAnalysis,
  ARAgingReport,
  Settings,
} from "./pages";

export default function App() {
  const { init, _loaded, _toast, setJumpTargetPO } = usePOStore();
  const [view, setView] = useState("dashboard");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { show: toast, Toast } = useToast();

  /* ── Check authentication on mount ── */
  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        setAuthenticated(true);
        init(); // Load data if already authenticated
      }
      setCheckingAuth(false);
    };

    checkAuth();
  }, [init]);

  /* ── Bridge store toast → useToast UI ── */
  useEffect(() => {
    if (_toast?.msg) toast(_toast.msg);
  }, [_toast, toast]);

  /* ── Jump to PO with highlight ── */
  const handleJump = useCallback(
    (v = "po", id) => {
      setView(v);
      if (v === "po" && id) {
        setJumpTargetPO(id);
      } else if (id) {
        setTimeout(() => {
          const el = document.getElementById("po-row-" + id);
          if (el) {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
            el.classList.add("row-hl");
            setTimeout(() => el.classList.remove("row-hl"), 2500);
          }
        }, 300);
      }
    },
    [setJumpTargetPO],
  );

  /* ── Handle successful login ── */
  const handleLoginSuccess = (user) => {
    console.log('✅ User logged in:', user.email);
    setAuthenticated(true);
    init(); // Load data after login
  };

  /* ── Handle logout ── */
  const handleLogout = () => {
    pb.authStore.clear();
    setAuthenticated(false);
    window.location.reload(); // Reload to clear state
  };

  // Show checking auth screen
  if (checkingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-5">
        <div className="flex items-center gap-3">
          <div className="loading-spinner" />
          <div>
            <div className="text-white text-sm font-black tracking-wider">DOCVAULT</div>
            <div className="text-slate-500 text-xs font-medium">v7.0 PocketBase</div>
          </div>
        </div>
        <span className="text-slate-500 text-xs font-medium animate-pulse">Checking authentication…</span>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show loading screen while data loads
  if (!_loaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-5">
        <div className="flex items-center gap-3">
          <div className="loading-spinner" />
          <div>
            <div className="text-white text-sm font-black tracking-wider">DOCVAULT</div>
            <div className="text-slate-500 text-xs font-medium">v7.0 PocketBase</div>
          </div>
        </div>
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full loading-bar" />
        </div>
        <span className="text-slate-500 text-xs font-medium animate-pulse">Loading data from server…</span>
      </div>
    );
  }

  // Main app
  return (
    <ErrorBoundary>
      <Layout view={view} setView={setView} onJump={handleJump} onLogout={handleLogout}>
        <Toast />
        {view === "dashboard" && <Dashboard onJump={handleJump} />}
        {view === "po"        && <POList />}
        {view === "items"     && <AllItems onJump={handleJump} />}
        {view === "supplier"  && <SupplierPage onJump={handleJump} />}
        {view === "margin"    && <MarginAnalysis />}
        {view === "ar-aging"  && <ARAgingReport onJump={handleJump} />}
        {view === "settings"  && <Settings />}
      </Layout>
    </ErrorBoundary>
  );
}
