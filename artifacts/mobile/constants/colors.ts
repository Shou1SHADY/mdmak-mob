const colors = {
  light: {
    text: "#020617",
    tint: "#0369A1",

    background: "#F8FAFC",
    foreground: "#020617",

    card: "#FFFFFF",
    cardForeground: "#020617",

    // primary is a FILL: a solid brand surface with primaryForeground on it.
    // primaryText is the same brand as INK on the page. They were one token,
    // and the token cannot be both — a fill has to contrast with the page and
    // ink has to contrast with it, which are opposite requirements. Inverting
    // the single token for dark mode duly turned fourteen filled buttons and
    // the register hero into near-white panels with white text on them.
    primary: "#0F172A",
    primaryForeground: "#FFFFFF",
    primaryText: "#0F172A",

    cta: "#0369A1",
    ctaForeground: "#FFFFFF",

    secondary: "#334155",
    secondaryForeground: "#FFFFFF",

    muted: "#F1F5F9",
    mutedForeground: "#475569", // 7.6:1 — was #64748B at 4.6:1

    accent: "#20CBD5",
    accentForeground: "#04252A", // white on teal is 2.0:1

    destructive: "#DC2626", // 4.9:1 both ways — was #EF4444 at 3.8:1
    destructiveForeground: "#FFFFFF",

    success: "#0F7A4C", // 5.4:1 both ways — was #12A063 at 3.4:1
    successForeground: "#FFFFFF",

    warning: "#A16207", // 5.0:1 both ways — was #F59E0B at 2.2:1
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
    outline: "#64748B", // 4.6:1 — was #94A3B8 at 2.5:1
    onSurfaceVariant: "#334155", // 10.9:1

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
    text: "#EAEFF7",
    tint: "#4DA3FF",

    background: "#0A0E17",
    foreground: "#EAEFF7",

    card: "#171F2E", // more separation from background
    cardForeground: "#EAEFF7",

    // The brand navy cannot be a fill here — it is the background. A deep
    // brand blue keeps the "filled, important" reading and carries white at
    // 6.6:1, while staying clearly distinct from the lighter cta blue.
    primary: "#1C5FA6",
    primaryForeground: "#FFFFFF",
    // Brand ink and brand tints: 10:1 on the background.
    primaryText: "#A6C3E8",

    cta: "#4DA3FF",
    ctaForeground: "#04101F",

    secondary: "#93A3BA",
    secondaryForeground: "#0A0E17",

    muted: "#202A3B", // reads as a filled chip, not a void
    mutedForeground: "#93A3BA",

    accent: "#2DD4BF",
    accentForeground: "#032622",

    destructive: "#FF7070",
    destructiveForeground: "#1A0505",

    success: "#3DD68C",
    successForeground: "#04170D",

    warning: "#F5B544",
    warningForeground: "#1C1200",

    border: "#28344A", // visible against the lifted card
    input: "#1B2432",

    surface: "#131A27", // matches card
    surfaceSecondary: "#0D131E",

    tabBar: "#131A27",
    header: "#0D131E",

    drawerBg: "#0A0E17",
    drawerText: "#EAEFF7",
    drawerActive: "#4DA3FF",
    drawerHover: "#202A3B",

    accentBlueSoft: "#17273D",
    accentPurpleSoft: "#1D2440",
    surfaceGray: "#202A3B",
    outline: "#8797AF", // ~5.6:1 on the dark background
    onSurfaceVariant: "#AEBBCE",

    chartColors: ["#4DA3FF", "#2DD4BF", "#3DD68C", "#F5B544", "#A78BFA"],

    // The app-wide header gradient, under white text on eleven screens. It ran
    // from the page colour to almost the page colour, so every header dissolved
    // into the screen behind it — in light mode the same gradient is a solid
    // navy block. A deep brand blue restores the header as a surface: 9.3:1
    // under white, 2.0:1 against the page.
    gradientPrimary: ["#17518C", "#0C2A4A"] as [string, string],
    gradientBlue: ["#4DA3FF", "#1C5FA6"] as [string, string],
    gradientTeal: ["#0A0E17", "#1C5FA6"] as [string, string],
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
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    md: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    lg: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.07,
      shadowRadius: 32,
      elevation: 6,
    },
    xl: {
      shadowColor: "#050810",
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
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 3,
    },
    nav: {
      shadowColor: "#050810",
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
