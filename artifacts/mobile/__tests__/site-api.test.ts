// The website API layer's pure parts — the token extractor the register
// screen trusts, and the base URL rule the redirect bug taught us.

import { SITE_URL, extractInviteToken, siteUrl } from "@/lib/site-api";

describe("extractInviteToken", () => {
  const token = "a".repeat(32) + "b".repeat(32);

  it("accepts the bare 64-hex token", () => {
    expect(extractInviteToken(token)).toBe(token);
  });

  it("finds the token inside a pasted register link", () => {
    expect(extractInviteToken(`https://www.mdmaktech.sa/register?invite=${token}`)).toBe(token);
  });

  it("finds it inside a pasted email body and lowercases it", () => {
    expect(extractInviteToken(`مرحباً! رابطك: https://x/register?invite=${token.toUpperCase()} — بانتظارك`)).toBe(token);
  });

  it("rejects text with no token", () => {
    expect(extractInviteToken("no token here")).toBeNull();
    expect(extractInviteToken("")).toBeNull();
    expect(extractInviteToken("deadbeef")).toBeNull();
  });
});

describe("SITE_URL", () => {
  it("defaults to www — the apex 307 strips the Authorization header", () => {
    // Env overrides win in real builds; the default must never be the apex.
    if (!process.env.EXPO_PUBLIC_SITE_URL && !process.env.EXPO_PUBLIC_API_URL) {
      expect(SITE_URL).toBe("https://www.mdmaktech.sa");
    }
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("siteUrl joins paths with exactly one slash", () => {
    expect(siteUrl("/contractor/sales")).toBe(`${SITE_URL}/contractor/sales`);
    expect(siteUrl("contractor/sales")).toBe(`${SITE_URL}/contractor/sales`);
  });
});
