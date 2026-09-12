import { Alert, Platform, type AlertButton } from "react-native";

/**
 * react-native-web ships `Alert` as an empty stub — `Alert.alert()` does
 * nothing — so on the PWA every confirmation, validation message and error the
 * app raises was silent: offers were accepted with no confirm step, sign-out
 * never asked, failures never surfaced. The app has ~80 call sites; until they
 * move to an in-app sheet, the browser's own dialogs stand in. Patched once at
 * start-up; every module shares the same `Alert` object.
 *
 * Mapping: no buttons, or one → `alert()` then that button's handler; a cancel
 * button plus one or more actions → `confirm()`, OK runs the LAST non-cancel
 * button (the way the app orders "Cancel, Confirm" and "Cancel, Delete").
 */
export function installWebAlert(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter((part) => !!part && part.trim()).join("\n\n");
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === "cancel");
    const actions = list.filter((b) => b.style !== "cancel");

    if (list.length <= 1 || actions.length === 0) {
      window.alert(text);
      (list[0] ?? cancel)?.onPress?.();
      return;
    }

    const primary = actions[actions.length - 1];
    if (window.confirm(text)) primary.onPress?.();
    else cancel?.onPress?.();
  };
}
