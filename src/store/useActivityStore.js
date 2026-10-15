/**
 * useActivityStore — lightweight activity log & notification center.
 *
 * Activity entries are stored in memory (localStorage-backed for persistence).
 * Notifications are *derived* from activity + live data (overdue, low stock).
 *
 * Structure of an activity entry:
 *   { id, type, icon, title, detail, entityId, entityType, ts, read }
 *
 * Types: 'po_created' | 'po_updated' | 'po_deleted' |
 *        'item_added' | 'item_updated' | 'item_deleted' |
 *        'do_created' | 'supplier_added' | 'stock_adjusted' | 'product_added' | 'product_updated'
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_LOG = 200;

/* ─── Pretty descriptions ──────────────────────────────────────── */
export const ACT_CONFIG = {
  po_created:       { icon: "📋", color: "#3b82f6", label: "New PO"          },
  po_updated:       { icon: "✏️",  color: "#8b5cf6", label: "PO Updated"      },
  po_deleted:       { icon: "🗑️", color: "#ef4444", label: "PO Deleted"      },
  item_added:       { icon: "➕", color: "#10b981", label: "Item Added"       },
  item_updated:     { icon: "🔄", color: "#6366f1", label: "Item Updated"     },
  item_status:      { icon: "🏷️", color: "#f59e0b", label: "Status Changed"  },
  item_deleted:     { icon: "🗑️", color: "#ef4444", label: "Item Removed"    },
  do_created:       { icon: "🚚", color: "#0ea5e9", label: "DO Created"       },
  supplier_added:   { icon: "🏢", color: "#64748b", label: "Supplier Added"   },
  stock_adjusted:   { icon: "📦", color: "#f97316", label: "Stock Adjusted"   },
  product_added:    { icon: "🏷️", color: "#10b981", label: "Product Added"    },
  product_updated:  { icon: "📝", color: "#6366f1", label: "Product Updated"  },
  product_deleted:  { icon: "🗑️", color: "#ef4444", label: "Product Deleted" },
};

/* ─── Store ────────────────────────────────────────────────────── */
export const useActivityStore = create(
  persist(
    (set, get) => ({
      log: [],          // array of activity entries, newest first
      unreadCount: 0,   // badge count
      lastClearTs: 0,   // timestamp of last "mark all read"

      /* Log an activity */
      logActivity: ({ type, title, detail = "", entityId = null, entityType = null }) => {
        const entry = {
          id:          `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type,
          icon:        ACT_CONFIG[type]?.icon  ?? "🔔",
          color:       ACT_CONFIG[type]?.color ?? "#64748b",
          label:       ACT_CONFIG[type]?.label  ?? type,
          title,
          detail,
          entityId,
          entityType,
          ts:          Date.now(),
          read:        false,
        };

        set((s) => {
          const newLog = [entry, ...s.log].slice(0, MAX_LOG);
          return {
            log:         newLog,
            unreadCount: newLog.filter(e => !e.read).length,
          };
        });
      },

      /* Mark all as read */
      markAllRead: () =>
        set((s) => ({
          log: s.log.map(e => ({ ...e, read: true })),
          unreadCount: 0,
          lastClearTs: Date.now(),
        })),

      /* Mark single as read */
      markRead: (id) =>
        set((s) => {
          const newLog = s.log.map(e => e.id === id ? { ...e, read: true } : e);
          return { log: newLog, unreadCount: newLog.filter(e => !e.read).length };
        }),

      /* Clear log */
      clearLog: () => set({ log: [], unreadCount: 0 }),

      /* Filter helpers */
      getByType:   (type)       => get().log.filter(e => e.type === type),
      getByEntity: (entityId)   => get().log.filter(e => e.entityId === entityId),
      getToday:    ()           => {
        const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
        return get().log.filter(e => e.ts >= todayMidnight.getTime());
      },
    }),
    {
      name: "docvault-activity-log",
      // Only persist the log and unreadCount
      partialize: (s) => ({ log: s.log, unreadCount: s.unreadCount }),
    }
  )
);

/* ─── Convenience helper (call from store actions) ─────────────── */
export const logAct = (args) => useActivityStore.getState().logActivity(args);
