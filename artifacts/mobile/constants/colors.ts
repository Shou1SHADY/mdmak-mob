const colors = {
  light: {
    text: "#020617",
    tint: "#0369A1",

    background: "#F8FAFC",
    foreground: "#020617",

    card: "#FFFFFF",
    cardForeground: "#020617",

    primary: "#0F172A",
    primaryForeground: "#FFFFFF",

    cta: "#0369A1",
    ctaForeground: "#FFFFFF",

    secondary: "#334155",
    secondaryForeground: "#FFFFFF",

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

    tabBar: "#FFFFFF",
    header: "#F8FAFC",

    drawerBg: "#0F172A",
    drawerText: "#F8FAFC",
    drawerActive: "#0369A1",
    drawerHover: "#1E293B",

    accentBlueSoft: "#E0E7FF",
    accentPurpleSoft: "#EEF2FF",
    surfaceGray: "#F1F5F9",
    outline: "#94A3B8",
    onSurfaceVariant: "#475569",

    chartColors: ["#0F172A", "#0369A1", "#12A063", "#334155", "#64748B"],

    gradientPrimary: ["#0F172A", "#1E3A5F"] as [string, string],
    gradientBlue: ["#0369A1", "#0284C7"] as [string, string],
    gradientTeal: ["#0F172A", "#0369A1"] as [string, string],
    gradientGlass: ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.05)"] as [string, string],

    textWhite: "#FFFFFF",
    textWhite80: "rgba(255,255,255,0.8)",
    textWhite60: "rgba(255,255,255,0.6)",
    textWhite40: "rgba(255,255,255,0.4)",
    textWhite12: "rgba(255,255,255,0.12)",

    pillBlue: "#E0E7FF",
    pillLavender: "#EEF2FF",
    pillBlueText: "#94A3B8",
    pillTeal: "#0D9488",
    tealAccent: "#20CBD5",
    purpleAccent: "#6366F1",
    whatsappGreen: "#25D366",

    atmosphericBlue: "rgba(3, 105, 161, 0.05)",
    atmosphericPurple: "rgba(99, 102, 241, 0.05)",
    glowBlue: "rgba(3, 105, 161, 0.1)",
    glowTeal: "rgba(32, 203, 213, 0.1)",
  },

  dark: {
    text: "#F8FAFC",
    tint: "#38BDF8",

    background: "#0B1221",
    foreground: "#F1F5F9",

    card: "#131C30",
    cardForeground: "#F1F5F9",

    primary: "#0F172A",
    primaryForeground: "#F8FAFC",

    cta: "#38BDF8",
    ctaForeground: "#0B1221",

    secondary: "#94A3B8",
    secondaryForeground: "#0B1221",

    muted: "#1C2A42",
    mutedForeground: "#94A3B8",

    accent: "#20CBD5",
    accentForeground: "#0B1221",

    destructive: "#F87171",
    destructiveForeground: "#0B1221",

    success: "#4ADE80",
    successForeground: "#0B1221",

    warning: "#FBBF24",
    warningForeground: "#0B1221",

    border: "#1E2D45",
    input: "#1E2D45",

    surface: "#131C30",
    surfaceSecondary: "#0F1828",

    tabBar: "#131C30",
    header: "#0F1828",

    drawerBg: "#0B1221",
    drawerText: "#F8FAFC",
    drawerActive: "#38BDF8",
    drawerHover: "#1C2A42",

    accentBlueSoft: "#1C2A42",
    accentPurpleSoft: "#1E2A42",
    surfaceGray: "#1C2A42",
    outline: "#64748B",
    onSurfaceVariant: "#94A3B8",

    chartColors: ["#38BDF8", "#20CBD5", "#4ADE80", "#94A3B8", "#64748B"],

    gradientPrimary: ["#0B1221", "#131C30"] as [string, string],
    gradientBlue: ["#0284C7", "#0369A1"] as [string, string],
    gradientTeal: ["#0B1221", "#0369A1"] as [string, string],
    gradientGlass: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"] as [string, string],

    textWhite: "#F8FAFC",
    textWhite80: "rgba(248,250,252,0.85)",
    textWhite60: "rgba(248,250,252,0.65)",
    textWhite40: "rgba(248,250,252,0.45)",
    textWhite12: "rgba(248,250,252,0.15)",

    pillBlue: "#1C2A42",
    pillLavender: "#1E2A42",
    pillBlueText: "#94A3B8",
    pillTeal: "#20CBD5",
    tealAccent: "#20CBD5",
    purpleAccent: "#818CF8",
    whatsappGreen: "#25D366",

    atmosphericBlue: "rgba(56, 189, 248, 0.06)",
    atmosphericPurple: "rgba(129, 140, 248, 0.06)",
    glowBlue: "rgba(56, 189, 248, 0.12)",
    glowTeal: "rgba(32, 203, 213, 0.12)",
  },

  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    "2xl": 20,
    "3xl": 24,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    "2xl": 32,
    "3xl": 40,
    "4xl": 48,
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
      shadowColor: "#0A1120",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    md: {
      shadowColor: "#0A1120",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    lg: {
      shadowColor: "#0A1120",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.07,
      shadowRadius: 32,
      elevation: 6,
    },
    xl: {
      shadowColor: "#0A1120",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.09,
      shadowRadius: 40,
      elevation: 10,
    },
    primary: {
      shadowColor: "#0369A1",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 8,
    },
    card: {
      shadowColor: "#0A1120",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 3,
    },
    nav: {
      shadowColor: "#0A1120",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 6,
    },
    logo: {
      shadowColor: "#0369A1",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 36,
      elevation: 20,
    },
  },

  typography: {
    display: { fontSize: 32, fontWeight: "700" as const, lineHeight: 40 },
    h1: { fontSize: 26, fontWeight: "700" as const, lineHeight: 32 },
    h2: { fontSize: 24, fontWeight: "600" as const, lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: "600" as const, lineHeight: 26 },
    body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
    bodySm: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
    label: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16 },
    button: { fontSize: 16, fontWeight: "600" as const, lineHeight: 24 },
    buttonSm: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16 },
    overline: { fontSize: 11, fontWeight: "500" as const, lineHeight: 14 },
    stat: { fontSize: 11, fontWeight: "700" as const, lineHeight: 14 },
  },
};

export default colors;
