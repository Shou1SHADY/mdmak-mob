import { useEffect, useState, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  message?: string;
  type: string;
  read: boolean;
  createdAt?: any;
  relatedId?: string;
  offerId?: string;
  rfqId?: string;
  chatId?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setNotifications([]);
      return;
    }
    setError(null);
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
        // Re-sort client-side: createdAt mixes ISO strings (website) with legacy
        // Firestore Timestamps, which Firestore's orderBy groups by type
        const toMillis = (ts: any): number => {
          if (!ts) return 0;
          if (typeof ts.toDate === "function") return ts.toDate().getTime();
          const ms = new Date(ts).getTime();
          return isNaN(ms) ? 0 : ms;
        };
        items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setNotifications(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("[useNotifications] onSnapshot error:", err.code, err.message);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  const markRead = useCallback(async (notifId: string) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "notifications", notifId), { read: true });
    } catch (e: any) {
      console.warn("[useNotifications] markRead failed:", e.message);
    }
  }, [user?.uid]);

  const markAllRead = useCallback(async () => {
    if (!user?.uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "users", user.uid, "notifications", n.id), { read: true });
      });
      await batch.commit();
    } catch (e: any) {
      console.warn("[useNotifications] markAllRead failed:", e.message);
    }
  }, [user?.uid, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, error, unreadCount, markRead, markAllRead };
}
