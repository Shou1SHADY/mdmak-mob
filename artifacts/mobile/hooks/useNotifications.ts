import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, where, updateDoc, doc } from "firebase/firestore";
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
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user?.uid]);

  const markRead = async (notifId: string) => {
    if (!user?.uid) return;
    await updateDoc(doc(db, "users", user.uid, "notifications", notifId), { read: true });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, markRead };
}
