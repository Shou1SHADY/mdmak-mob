// The document contracts both apps share — the fields the website queries on.

import { buildOfferDoc, buildRfqDoc, readRfqLineItems } from "@/lib/contracts";
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
