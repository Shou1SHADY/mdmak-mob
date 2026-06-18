import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Show alerts + play sound even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function navigateFromNotification(data: Record<string, any>) {
  const { type, offerId, rfqId, chatId } = data ?? {};
  try {
    if (type === "new_message" && (chatId || offerId)) {
      router.push(`/chat/${chatId ?? offerId}`);
    } else if (
      ["offer_accepted", "price_updated", "offer_withdrawn"].includes(type) &&
      (offerId || chatId)
    ) {
      router.push(`/chat/${offerId ?? chatId}`);
    } else if (
      ["new_offer", "price_reduction_requested", "offer_rejected"].includes(type) &&
      rfqId
    ) {
      router.push(`/(contractor)/rfqs/${rfqId}`);
    } else if (
      ["offer_accepted", "offer_rejected"].includes(type) &&
      offerId
    ) {
      router.push(`/(supplier)/offers`);
    }
  } catch (e) {
    // navigation may not be ready yet; user will see it on next open
  }
}

async function registerDeviceForPush(uid: string) {
  if (Platform.OS === "web") return; // web push is a separate concern
  if (!Device.isDevice) {
    console.log("[Push] Physical device required for push notifications");
    return;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted by user");
      return;
    }

    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("mdmak-default", {
        name: "إشعارات منصة مدماك",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#20CBD5",
        sound: "default",
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Get the Expo Push Token (works via Expo's push gateway → APNs / FCM)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    if (!projectId) {
      console.warn("[Push] EAS projectId missing from app.json extra.eas.projectId");
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("[Push] Token acquired:", token.slice(0, 30) + "…");

    // Persist token on the user document so Cloud Function can read it
    await updateDoc(doc(db, "users", uid), {
      expoPushToken: token,
      pushTokenUpdatedAt: new Date().toISOString(),
      devicePlatform: Platform.OS,
    });
  } catch (e: any) {
    console.warn("[Push] Registration error:", e.message);
  }
}

/**
 * Call this hook inside AuthProvider context (e.g. RootLayoutNav).
 * It registers the device, handles foreground display, and wires up tap navigation.
 */
export function usePushToken() {
  const { user } = useAuth();
  const foregroundSub = useRef<Notifications.EventSubscription | null>(null);
  const tapSub = useRef<Notifications.EventSubscription | null>(null);

  // Register device token whenever user changes (login / re-login)
  useEffect(() => {
    if (!user?.uid) return;
    registerDeviceForPush(user.uid);
  }, [user?.uid]);

  // Wire up listeners once on mount; clean up on unmount
  useEffect(() => {
    // Foreground: notification received while app is open
    foregroundSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body } = notification.request.content;
        console.log("[Push] Foreground notification:", title, body);
      }
    );

    // Tap: user tapped a notification (background or foreground)
    tapSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        console.log("[Push] Tapped:", data?.type);
        navigateFromNotification(data);
      }
    );

    // Handle the notification that launched the app (cold start tap)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification?.request?.content?.data) {
        navigateFromNotification(
          response.notification.request.content.data as Record<string, any>
        );
      }
    });

    return () => {
      foregroundSub.current?.remove();
      tapSub.current?.remove();
    };
  }, []);
}
