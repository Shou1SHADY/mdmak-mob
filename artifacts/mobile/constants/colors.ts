const colors = {
  light: {
    text: "#020617",
    tint: "#0369A1",

    background: "#F8FAFC",
    foreground: "#020617",

    card: "#FFFFFF",
    cardForeground: "#020617",

    primary: "#0F172A",
    primaryForeground: "#ffffff",

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
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 4,
    },
    lg: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 40,
      elevation: 8,
    },
    xl: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 50,
      elevation: 12,
    },
    primary: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 25,
      elevation: 10,
    },
    card: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 4,
    },
    nav: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 8,
    },
    logo: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.15,
      shadowRadius: 50,
      elevation: 25,
    },
  },

  typography: {
    display: { fontSize: 32, fontWeight: "700" as const, lineHeight: 40, letterSpacing: -0.5 },
    h1: { fontSize: 26, fontWeight: "700" as const, lineHeight: 32, letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: "600" as const, lineHeight: 32, letterSpacing: -0.5 },
    h3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: "600" as const, lineHeight: 26 },
    body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
    bodySm: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
    label: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16, letterSpacing: 0.6 },
    button: { fontSize: 16, fontWeight: "600" as const, lineHeight: 24 },
    buttonSm: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16, letterSpacing: 0.6 },
    overline: { fontSize: 11, fontWeight: "500" as const, lineHeight: 14, letterSpacing: 1 },
    stat: { fontSize: 11, fontWeight: "700" as const, lineHeight: 14 },
  },
};

export default colors;
