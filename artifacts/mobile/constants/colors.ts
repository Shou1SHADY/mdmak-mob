const colors = {
  light: {
    text: "#020617",
    tint: "#20CBD5",

    background: "#F8FAFC",
    foreground: "#020617",

    card: "#FFFFFF",
    cardForeground: "#020617",

    primary: "#0F172A",
    primaryForeground: "#F8FAFC",

    cta: "#0369A1",
    ctaForeground: "#FFFFFF",

    secondary: "#334155",
    secondaryForeground: "#F8FAFC",

    muted: "#F1F5F9",
    mutedForeground: "#64748B",

    accent: "#20CBD5",
    accentForeground: "#FFFFFF",

    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",

    success: "#12A063",
    successForeground: "#FFFFFF",

    warning: "#F59E0B",
    warningForeground: "#FFFFFF",

    border: "#E2E8F0",
    input: "#E2E8F0",

    surface: "#FFFFFF",
    surfaceSecondary: "#F8FAFC",

    tabBar: "#0F172A",
    header: "#0F172A",

    drawerBg: "#0F172A",
    drawerText: "#F8FAFC",
    drawerActive: "#0369A1",
    drawerHover: "#1E293B",

    chartColors: ["#0F172A", "#0369A1", "#12A063", "#334155", "#64748B"],
  },

  radius: {
    card: 12,
    medium: 10,
    small: 8,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
  },

  shadow: {
    none: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },

  typography: {
    h1: { fontSize: 28, fontWeight: "800" as const, lineHeight: 36 },
    h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: "700" as const, lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: "600" as const, lineHeight: 26 },
    body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
    bodySm: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
    caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
    label: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },
    button: { fontSize: 16, fontWeight: "600" as const, lineHeight: 24 },
  },
};

export default colors;
