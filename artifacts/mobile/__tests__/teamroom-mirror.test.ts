// The team room and the guarantee answer.
//
// Neither has much arithmetic in it; what they have is rules about who may act
// and what a write is allowed to contain, and those are exactly the things that
// fail silently. A guarantee update carrying a fourth field is not a warning —
// it is a refusal. A notification written with the wrong timestamp type sorts
// into the wrong place in a list the website also reads.

import { ROOM_PAGE, TEAM_ROOM_NOTIFICATION } from "@/lib/teamroom";
import { canAnswerGuarantee } from "@/lib/guarantee-writes";
import { en, ar } from "@/i18n/modules/teamroom";
import { communicationForRole } from "@/lib/portal-components";

describe("who answers a guarantee", () => {
  const pending = { status: "pending_review", contractorOrgId: "org-a" };

  it("the contractor side, holding deliveries.confirm", () => {
    expect(canAnswerGuarantee(pending, "org-a", true)).toBe(true);
  });

  it("not the supplier looking at their own submission", () => {
    // The same document is visible to both sides; only one of them decides.
    expect(canAnswerGuarantee(pending, "org-b", true)).toBe(false);
  });

  it("not without the permission the rules actually require", () => {
    // The website's own button asks for `offers.accept` here, which the rules
    // do not accept — a member of the seeded Finance group would be refused.
    expect(canAnswerGuarantee(pending, "org-a", false)).toBe(false);
  });

  it("not once it has been answered", () => {
    for (const status of ["accepted", "rejected", "none"]) {
      expect(canAnswerGuarantee({ ...pending, status }, "org-a", true)).toBe(false);
    }
  });

  it("not before the organization is known", () => {
    // A half-resolved profile must not be read as "matches nobody, allow".
    expect(canAnswerGuarantee(pending, null, true)).toBe(false);
    expect(canAnswerGuarantee(pending, undefined, true)).toBe(false);
    expect(canAnswerGuarantee({ status: "pending_review" }, "org-a", true)).toBe(false);
  });
});

describe("the room", () => {
  it("pulls a page, not a history", () => {
    // The website streams the whole channel with no limit. On a phone that is a
    // year of chatter over mobile data on every open.
    expect(ROOM_PAGE).toBeGreaterThan(0);
    expect(ROOM_PAGE).toBeLessThanOrEqual(100);
  });

  it("uses the notification type the website's badge counts", () => {
    // The unread badge is derived entirely from notifications of this type —
    // there is no read state on the channel or on a message. If the two sides
    // disagree on this string, the badges drift apart and never reconcile.
    expect(TEAM_ROOM_NOTIFICATION).toBe("team_chat_message");
  });

  it("is reachable for both roles, and gated by nothing", () => {
    for (const role of ["Contractor", "Supplier"]) {
      const item = communicationForRole(role).find((i) => i.titleKey === "team_room");
      expect(item?.built).toBe(true);
      expect(item?.href).toBe("/team-room");
      // A company's own room is not a privilege.
      expect(item?.requiredPermission).toBeUndefined();
    }
  });
});

describe("the vocabulary exists in both languages", () => {
  it("the two modules carry the same set of keys throughout", () => {
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, path: string) => {
      expect([path, Object.keys(a).sort()]).toEqual([path, Object.keys(b).sort()]);
      for (const k of Object.keys(a)) {
        if (a[k] && typeof a[k] === "object") {
          walk(a[k] as Record<string, unknown>, b[k] as Record<string, unknown>, `${path}.${k}`);
        }
      }
    };
    walk(en, ar, "teamroom");
  });

  it("the placeholders survive translation", () => {
    const holders = (s: string) => (s.match(/\{[a-z]+\}/gi) ?? []).sort();
    expect(holders(ar.room.subtitle)).toEqual(holders(en.room.subtitle));
    expect(holders(ar.room.unread)).toEqual(holders(en.room.unread));
    expect(holders(ar.guarantee.expiringSoon)).toEqual(holders(en.guarantee.expiringSoon));
    expect(holders(ar.guarantee.item)).toEqual(holders(en.guarantee.item));
  });
});
