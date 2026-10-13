import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";
import { type, space, radius, toneColors } from "@/lib/design";
import { siteUrl } from "@/lib/site-api";

/**
 * "This is done on the website" — the read-only note a Project Management
 * project shows where a legacy project would offer a phone write, with the one
 * action that takes the reader to the page where the work is done.
 */
export function PmWebNotice({ message, path, style }: { message: string; path: string; style?: ViewStyle }) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const tone = toneColors(colors, "primary");

  return (
    <View style={[styles.box, { backgroundColor: tone.bg, borderColor: tone.border }, style]}>
      <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Feather name="monitor" size={16} color={tone.fg} />
        <Text style={[styles.text, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {message}
        </Text>
      </View>
      <Button
        title={t.projects.openOnWeb}
        size="sm"
        variant="outline"
        onPress={() => void WebBrowser.openBrowserAsync(siteUrl(path))}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.control, padding: space.md, gap: space.md },
  row: { alignItems: "flex-start", gap: space.sm },
  text: { ...type.body, flex: 1 },
});
