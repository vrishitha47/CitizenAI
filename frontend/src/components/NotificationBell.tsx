import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../types";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * A bell button with an unread badge and a dropdown list of recent
 * notifications. Polls the unread count every 30s so the badge stays fresh.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await fetchUnreadCount());
    } catch {
      /* ignore transient errors */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchNotifications(0, 15);
      setItems(page.content);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count.
  useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, 30000);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  }

  async function onItemClick(n: NotificationItem) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function onMarkAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-asphalt-500 transition hover:bg-asphalt-100 hover:text-asphalt-800"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-hazard-500 px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-asphalt-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-asphalt-100 px-4 py-3">
            <span className="font-display text-sm font-semibold text-asphalt-900">Notifications</span>
            {unread > 0 && (
              <button onClick={onMarkAll} className="text-xs font-medium text-sign-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-asphalt-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-asphalt-400">
                You're all caught up.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={[
                    "flex w-full gap-3 border-b border-asphalt-100 px-4 py-3 text-left transition hover:bg-asphalt-50",
                    n.read ? "" : "bg-sign-50/60",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-sign-500",
                    ].join(" ")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-asphalt-900">{n.title}</span>
                    {n.message && (
                      <span className="mt-0.5 block text-xs text-asphalt-500 line-clamp-2">{n.message}</span>
                    )}
                    <span className="mt-1 block text-[11px] text-asphalt-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
