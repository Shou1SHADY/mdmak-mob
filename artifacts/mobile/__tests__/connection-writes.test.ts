// Answering a contractor's connection invitation goes through the website's
// /api/supplier-free/invitations since Supplier 1.0 (15 Oct 2026):
// firestore.rules refuse a supplier who writes a contractorSupplierLinks doc
// with status "active", which is what the phone used to write on accept.
// These pin that the phone now sends the website's request — and writes nothing
// to Firestore itself.

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: { getIdToken: jest.fn(async () => "id-token") } })),
}));

import { getAuth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { acceptInvitation, declineInvitation } from "@/lib/connection-writes";
import { SITE_URL } from "@/lib/site-api";

// A Firestore stand-in with only `app`: any direct write would need more and throw.
const firestore = { app: { name: "test" } } as unknown as Firestore;

const invitation = { id: "inv1", contractorOrgId: "buyer-org", invitedBy: "buyer-user", status: "pending" };
const input = {
  firestore,
  invitation,
  supplierOrgId: "supplier-org",
  supplierName: "Al Rajhi",
  supplierCategories: ["cement"],
  alreadyLinkedOrgIds: new Set<string>(),
};

const reply = (status: number, json: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => json });

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn(async () => reply(200, { success: true, data: { answer: "accepted" } }));
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});

describe("acceptInvitation", () => {
  it("asks the website to accept, with the caller's ID token", async () => {
    await acceptInvitation(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${SITE_URL}/api/supplier-free/invitations`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer id-token");
    expect(JSON.parse(init.body)).toEqual({ id: "inv1", answer: "accepted" });
  });

  it("never sends a link or a status of its own — the server opens the connection", async () => {
    await acceptInvitation(input);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(["answer", "id"]);
  });

  it("fails when the server refuses, so the screen says it could not", async () => {
    fetchMock.mockImplementationOnce(async () => reply(409, { error: true, code: "WRONG_STATE" }));
    await expect(acceptInvitation(input)).rejects.toThrow("WRONG_STATE");
  });

  it("fails without a signed-in user, before any request", async () => {
    (getAuth as jest.Mock).mockReturnValueOnce({ currentUser: null });
    await expect(acceptInvitation(input)).rejects.toThrow("UNAUTHENTICATED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an invitation that names no contractor", async () => {
    await expect(acceptInvitation({ ...input, invitation: { ...invitation, contractorOrgId: null } })).rejects.toThrow(
      "missing_contractor_org"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("declineInvitation", () => {
  it("asks the website to decline, so the inviter is told", async () => {
    fetchMock.mockImplementationOnce(async () => reply(200, { success: true, data: { answer: "declined" } }));
    await declineInvitation(firestore, "inv1");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ id: "inv1", answer: "declined" });
  });
});
