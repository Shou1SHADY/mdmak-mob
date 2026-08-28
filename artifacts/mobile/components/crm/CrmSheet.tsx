import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";

interface CrmSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
  children: React.ReactNode;
}

/**
 * The bottom sheet every CRM create form uses.
 *
 * The website puts these behind multi-step dialogs (CrmFormDialog) because it
 * has the room for eight fields at once. On a phone the same record is captured
 * in one short scroll — the fields that did not make the cut are the ones the
 * website fills in later anyway, and lib/crm-writes.ts writes them as null so
 * the document shape stays identical either way.
 */
export function CrmSheet({
  visible,
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitting,
  children,
}: CrmSheetProps) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: (insets.bottom || 0) + 16,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.grabber}>
            <View style={[styles.grabberBar, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text
              style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
            >
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={submitLabel}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting}
              fullWidth
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.45)" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
  },
  grabber: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  grabberBar: { width: 40, height: 4, borderRadius: 4 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },
  title: { flex: 1, fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  body: { flexGrow: 0 },
  footer: { paddingTop: 12 },
});
