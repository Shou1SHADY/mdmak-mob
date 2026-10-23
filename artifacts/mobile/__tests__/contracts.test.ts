// The document contracts both apps share — the fields the website queries on.

import { buildOfferDoc, buildPublishInput, buildRfqDoc, publishGap, readRfqLineItems, riyadhDay, riyadhYear } from "@/lib/contracts";
import { OFFER_STATUS, RFQ_ACCEPTING_OFFERS } from "@/constants/data";

const rfqArgs = {
  uid: "u1",
  organizationId: "org1",
  displayName: "خالد",
  title: "أبواب برج الياسمين",
  description: "توريد أبواب HDF",
  category: "أعمال نجارة وأثاث ثابت",
  city: "Riyadh",
  items: [
    { id: "1", description: "باب HDF بحلق", unit: "باب", quantity: 40, specs: "مقاس 90" },
    { id: "2", description: "خزانة ملابس", unit: "وحدة", quantity: 12 },
  ],
  isDraft: false,
};

describe("buildRfqDoc", () => {
  const doc = buildRfqDoc(rfqArgs);

  it("writes the fields the website's supplier feed queries on", () => {
    expect(doc.visibility).toBe("public");
    expect(doc.allowedSupplierOrgIds).toEqual([]);
    expect(doc.projectId).toBeNull();
    expect(doc.organizationId).toBe("org1");
    expect(doc.status).toBe("New");
    expect(doc.offersCount).toBe(0);
  });

  it("mirrors line items into products the way the website renders them", () => {
    const products = doc.products as Array<Record<string, unknown>>;
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ name: "باب HDF بحلق", quantity: 40, unitOfMeasure: "باب", description: "مقاس 90" });
    expect(products[1].description).toBe("");
  });

  it("no longer writes the legacy boqItems key (zero prod docs carry it)", () => {
    expect("boqItems" in doc).toBe(false);
  });

  it("a draft stays a draft", () => {
    expect(buildRfqDoc({ ...rfqArgs, isDraft: true }).status).toBe("Draft");
  });
});

describe("readRfqLineItems", () => {
  it("reads the website's products shape back into editor rows", () => {
    const doc = buildRfqDoc(rfqArgs);
    const items = readRfqLineItems(doc);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ description: "باب HDF بحلق", unit: "باب", quantity: 40, specs: "مقاس 90" });
  });

  it("is safe on empty and missing input", () => {
    expect(readRfqLineItems(null)).toEqual([]);
    expect(readRfqLineItems({})).toEqual([]);
  });
});

describe("buildOfferDoc", () => {
  const doc = buildOfferDoc({
    uid: "s1",
    organizationId: "sorg",
    displayName: "ريم",
    orgName: "مؤسسة التوريد",
    rfqId: "r1",
    rfqTitle: "أبواب",
    contractorId: "u1",
    contractorOrgId: "org1",
    projectId: null,
    price: "47200",
    quantity: "40",
  });

  it("carries contractorOrgId — the field every contractor-side page queries", () => {
    expect(doc.contractorOrgId).toBe("org1");
    expect(doc.contractorId).toBe("u1");
    expect(doc.organizationId).toBe("sorg");
  });

  it("opens in the canonical Arabic review status", () => {
    expect(doc.status).toBe(OFFER_STATUS.UNDER_REVIEW);
  });

  it("always ships a delivery batch with a quantity, so the website's sums never NaN", () => {
    const batches = doc.deliveryBatches as Array<Record<string, unknown>>;
    expect(batches).toHaveLength(1);
    expect(batches[0].quantity).toBe("40");
  });
});

describe("RFQ_ACCEPTING_OFFERS", () => {
  it("is the one definition of an RFQ a supplier may still bid on", () => {
    expect(RFQ_ACCEPTING_OFFERS).toEqual(["New", "Active", "Under Review"]);
  });
});

describe("RFQ numbering and terms (website Supplier 1.0)", () => {
  it("numbers by Riyadh's year — 31 Dec 22:00 UTC is already next year there", () => {
    expect(riyadhYear(new Date("2026-12-31T20:59:00.000Z"))).toBe(2026);
    expect(riyadhYear(new Date("2026-12-31T21:00:00.000Z"))).toBe(2027);
  });

  it("stores no payment terms when the buyer set none, as the website's untouched form", () => {
    expect(buildRfqDoc(rfqArgs).paymentTermsList).toBeNull();
  });
});

// The app has no Node typings; jest runs on Node, so read through `require`.
declare const require: (m: string) => unknown;
declare const __dirname: string;

describe("publishing goes through the website (Procurement 2.0, /api/procurement/rfq/publish)", () => {
  const today = "2026-10-23";

  it("asks for a deadline of today or later, as the server's deadlineProblem", () => {
    expect(publishGap({ ...rfqArgs, deadline: null }, today)).toBe("deadline");
    expect(publishGap({ ...rfqArgs, deadline: "2026-10-22" }, today)).toBe("deadline_past");
    expect(publishGap({ ...rfqArgs, deadline: today }, today)).toBeNull();
  });

  it("asks for rows with a quantity and a unit, as the server's rowProblems", () => {
    expect(publishGap({ ...rfqArgs, deadline: today, items: [] }, today)).toBe("items");
    expect(publishGap({ ...rfqArgs, deadline: today, items: [{ description: "x", unit: "", quantity: 2 }] }, today)).toBe("item_incomplete");
    expect(publishGap({ ...rfqArgs, deadline: today, items: [{ description: "x", unit: "م", quantity: 0 }] }, today)).toBe("item_incomplete");
  });

  it("sends only what the server copies: the rows and their place, never a status, an owner or a number", () => {
    const body = buildPublishInput({ ...rfqArgs, deadline: "2026-10-30" });
    expect(body).toMatchObject({ title: rfqArgs.title, audience: "public", deadline: "2026-10-30", pricing: "total", notes: rfqArgs.description });
    expect(body.doc.products).toHaveLength(2);
    expect(body.doc.products[0]).toMatchObject({ name: "باب HDF بحلق", quantity: 40, unitOfMeasure: "باب", category: rfqArgs.category });
    expect(body.doc.city).toBe("Riyadh");
    for (const key of ["status", "organizationId", "contractorId", "rfqNumber", "visibility"]) {
      expect(body).not.toHaveProperty(key);
      expect(body.doc).not.toHaveProperty(key);
    }
  });

  it("reads Riyadh's day, not the device's", () => {
    expect(riyadhDay(new Date("2026-10-22T22:30:00.000Z"))).toBe("2026-10-23");
  });

  it("the create screen publishes through the route and keeps the direct write for drafts only", () => {
    const fs = require("fs") as { readFileSync: (p: string, enc: string) => string };
    const s = fs.readFileSync(`${__dirname}/../app/(contractor)/rfqs/create.tsx`, "utf8");
    expect(s).toMatch(/publishRfq\(/);
    expect(s).toMatch(/if \(draft\) \{[\s\S]*createRfqWithNumber/);
  });
});

describe("no device confirms a delivery (website rules, Procurement 2.0 G-09)", () => {
  it("neither the goods screen nor delivery-writes writes Firestore", () => {
    const fs = require("fs") as { readFileSync: (p: string, enc: string) => string };
    for (const rel of ["app/(goods)/index.tsx", "lib/delivery-writes.ts"]) {
      const s = fs.readFileSync(`${__dirname}/../${rel}`, "utf8");
      expect(s).not.toMatch(/\b(updateDoc|setDoc|addDoc|runTransaction|writeBatch)\b/);
      expect(s).not.toMatch(/firebase\/firestore/);
    }
  });
});
