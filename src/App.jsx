/**
 * App — root entry with PocketBase authentication
 * All data state lives in usePOStore. Shell layout lives in Layout.
 */
import { useState, useEffect, useCallback } from "react";
import { usePOStore } from "./store/usePOStore";
import { useChatStore } from "./store/useChatStore";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { useToast } from "./hooks";
import { pb, isAuthenticated } from "./lib/pocketbase";
import { logger } from "./lib/logger";
import { APP_VERSION } from "./lib/constants";
import {
  Dashboard,
  POList,
  AllItems,
  SupplierPage,
  MarginAnalysis,
  ARAgingReport,
  Settings,
  Products,
  ActivityLog,
} from "./pages";

export default function App() {
  const { init, _loaded, _toast, setJumpTargetPO } = usePOStore();
  const { init: initChat } = useChatStore();
  const [view, setView] = useState("dashboard");
  // Lazy-mount: pages mount on first visit and stay mounted (hidden) after.
  // This makes tab switching instant — no unmount/remount, no re-running effects.
  const [mounted, setMounted] = useState(() => new Set(["dashboard"]));
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { show: toast, Toast } = useToast();

  /* ── Check authentication on mount ── */
  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        setAuthenticated(true);
        init(); // Load data if already authenticated
        initChat(); // Initialize chat store
      }
      setCheckingAuth(false);
    };

    checkAuth();
  }, [init, initChat]);

  /* ── Bridge store toast → useToast UI ── */
  useEffect(() => {
    if (_toast?.msg) toast(_toast.msg);
  }, [_toast, toast]);

  /* ── Navigate: mount page on first visit, then just switch view ── */
  const navigateTo = useCallback((v) => {
    setMounted((prev) => {
      if (prev.has(v)) return prev;
      return new Set([...prev, v]);
    });
    setView(v);
  }, []);

  /* ── Jump to PO with highlight ── */
  const handleJump = useCallback(
    (v = "po", id) => {
      navigateTo(v);
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
    [navigateTo, setJumpTargetPO],
  );

  /* ── Handle successful login ── */
  const handleLoginSuccess = (user) => {
    logger.log('✅ User logged in:', user.email);
    setAuthenticated(true);
    init(); // Load data after login
    initChat(); // Initialize chat store
  };

  /* ── Handle logout ── */
  const handleLogout = () => {
    // Unsubscribe from WebSocket + clear store data before invalidating auth
    usePOStore.getState().logout();
    pb.authStore.clear();
    setAuthenticated(false);
    window.location.reload();
  };

  // Show checking auth screen
  if (checkingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-5">
        <div className="flex items-center gap-3">
          <div className="loading-spinner" />
          <div>
            <div className="text-white text-sm font-black tracking-wider">DOCVAULT</div>
            <div className="text-slate-500 text-xs font-medium">v{APP_VERSION} PocketBase</div>
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
            <div className="text-slate-500 text-xs font-medium">v{APP_VERSION} PocketBase</div>
          </div>
        </div>
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full loading-bar" />
        </div>
        <span className="text-slate-500 text-xs font-medium animate-pulse">Loading data from server…</span>
      </div>
    );
  }

  // Each page: id, error label, element.
  // Static key on ErrorBoundary = never remounts on tab switch.
  // The div uses CSS to show/hide — component state is preserved.
  const PAGES = [
    { id: "dashboard", name: "Dashboard",         el: <Dashboard onJump={handleJump} /> },
    { id: "po",        name: "Purchase Orders",   el: <POList /> },
    { id: "items",     name: "Semua Item",        el: <AllItems onJump={handleJump} /> },
    { id: "supplier",  name: "Supplier",          el: <SupplierPage onJump={handleJump} /> },
    { id: "margin",    name: "Margin Analysis",   el: <MarginAnalysis /> },
    { id: "ar-aging",  name: "AR Aging Report",   el: <ARAgingReport onJump={handleJump} /> },
    { id: "settings",  name: "Settings",          el: <Settings /> },
    { id: "products",  name: "Inventory / Stock", el: <Products /> },
    { id: "activity",  name: "Activity Log",      el: <ActivityLog /> },
  ];

  return (
    <Layout view={view} setView={navigateTo} onJump={handleJump} onLogout={handleLogout}>
      <Toast />
      {PAGES.map(({ id, name, el }) =>
        mounted.has(id) ? (
          <ErrorBoundary key={id} name={name}>
            <div className={view === id ? "flex flex-col h-full overflow-hidden" : "hidden"}>
              {el}
            </div>
          </ErrorBoundary>
        ) : null
      )}
    </Layout>
  );
}
