// expo-print and expo-sharing must be installed:
// npx expo install expo-print expo-sharing
import * as Print from "expo-print"; // eslint-disable-line import/no-extraneous-dependencies
import * as Sharing from "expo-sharing"; // eslint-disable-line import/no-extraneous-dependencies
import { Alert } from "react-native";
import type { BOQItem } from "@/components/BOQEditor";

interface RFQData {
  id: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  district?: string;
  deadline?: string;
  status?: string;
  createdAt?: any;
  boqItems?: BOQItem[];
}

interface OfferData {
  id: string;
  supplierName?: string;
  companyName?: string;
  price?: string;
  notes?: string;
  deliveryLocation?: string;
  executionDuration?: string;
  executionDurationUnit?: string;
  status?: string;
  createdAt?: any;
  boqPricing?: Array<{ boqItemId: string; unitPrice: number; totalPrice: number }>;
}

function fmtDate(ts: any): string {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-SA", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function fmtCurrency(n: number | string | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(num);
}

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; color: #1E293B; background: #fff; font-size: 13px; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%); color: #fff; padding: 28px 32px; }
  .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .header p { font-size: 12px; color: rgba(255,255,255,0.65); }
  .logo { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #20CBD5; margin-bottom: 12px; }
  .body { padding: 24px 32px; }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { }
  .field label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; display: block; margin-bottom: 3px; }
  .field span { font-size: 14px; color: #1E293B; font-weight: 500; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-active { background: #DCFCE7; color: #16A34A; }
  .badge-draft { background: #F1F5F9; color: #64748B; }
  .badge-awarded { background: #DBEAFE; color: #1D4ED8; }
  .badge-closed { background: #FEE2E2; color: #DC2626; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: #F8FAFC; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; padding: 9px 12px; text-align: left; border-bottom: 2px solid #E2E8F0; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-weight: 600; color: #0F172A; font-variant-numeric: tabular-nums; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #94A3B8; display: flex; justify-content: space-between; }
  .highlight { background: #F0FDF4; }
  .offer-card { border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
  .offer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .offer-company { font-size: 15px; font-weight: 700; color: #0F172A; }
  .offer-price { font-size: 18px; font-weight: 700; color: #0369A1; }
`;

export async function exportRFQPDF(rfq: RFQData, isRTL = false): Promise<void> {
  const boqRows = (rfq.boqItems ?? []).map((item, idx) => `
    <tr>
      <td style="color:#64748B;font-weight:700;">${idx + 1}</td>
      <td>${item.description}${item.specs ? `<br><span style="font-size:11px;color:#94A3B8;">${item.specs}</span>` : ""}</td>
      <td class="num">${item.quantity}</td>
      <td>${item.unit}</td>
    </tr>
  `).join("");

  const boqSection = rfq.boqItems && rfq.boqItems.length > 0 ? `
    <div class="section">
      <div class="section-title">${isRTL ? "جدول الكميات (BOQ)" : "Bill of Quantities (BOQ)"}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${isRTL ? "الوصف" : "Description"}</th>
            <th style="text-align:right">${isRTL ? "الكمية" : "Qty"}</th>
            <th>${isRTL ? "الوحدة" : "Unit"}</th>
          </tr>
        </thead>
        <tbody>${boqRows}</tbody>
      </table>
    </div>
  ` : "";

  const statusClass = rfq.status === "New" || rfq.status === "Active" ? "badge-active"
    : rfq.status === "Awarded" ? "badge-awarded"
    : rfq.status === "Draft" ? "badge-draft" : "badge-closed";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}</style></head><body>
    <div class="header">
      <div class="logo">MDMAK TECH</div>
      <h1>${rfq.title}</h1>
      <p>RFQ #${rfq.id.slice(0, 8).toUpperCase()} &bull; ${isRTL ? "تاريخ الإصدار" : "Issued"}: ${fmtDate(rfq.createdAt)}</p>
    </div>
    <div class="body">
      <div class="section">
        <div class="section-title">${isRTL ? "تفاصيل المناقصة" : "RFQ Details"}</div>
        <div class="grid">
          <div class="field"><label>${isRTL ? "الحالة" : "Status"}</label><span class="badge ${statusClass}">${rfq.status ?? "—"}</span></div>
          <div class="field"><label>${isRTL ? "الفئة" : "Category"}</label><span>${rfq.category ?? "—"}</span></div>
          <div class="field"><label>${isRTL ? "المدينة" : "City"}</label><span>${rfq.city ?? "—"}${rfq.district ? ` — ${rfq.district}` : ""}</span></div>
          <div class="field"><label>${isRTL ? "الموعد النهائي" : "Deadline"}</label><span>${rfq.deadline ?? "—"}</span></div>
        </div>
      </div>
      ${rfq.description ? `
      <div class="section">
        <div class="section-title">${isRTL ? "الوصف" : "Description"}</div>
        <p style="color:#334155;line-height:1.7;">${rfq.description}</p>
      </div>` : ""}
      ${boqSection}
      <div class="footer">
        <span>Mdmak Tech &bull; mdmaktech.sa</span>
        <span>${isRTL ? "تم التصدير" : "Exported"}: ${new Date().toLocaleDateString("en-SA")}</span>
      </div>
    </div>
  </body></html>`;

  await printAndShare(html, `RFQ_${rfq.id.slice(0, 8)}.pdf`);
}

export async function exportOfferComparisonPDF(
  rfq: RFQData,
  offers: OfferData[],
  isRTL = false
): Promise<void> {
  const sorted = [...offers].sort((a, b) => (parseFloat(a.price ?? "0") || 0) - (parseFloat(b.price ?? "0") || 0));

  const offerCards = sorted.map((offer, idx) => {
    const isBest = idx === 0;
    const boqRows = (rfq.boqItems ?? []).map((item) => {
      const pricing = offer.boqPricing?.find((p) => p.boqItemId === item.id);
      return `
        <tr ${isBest ? 'class="highlight"' : ""}>
          <td>${item.description}</td>
          <td class="num">${item.quantity} ${item.unit}</td>
          <td class="num">${pricing ? fmtCurrency(pricing.unitPrice) : "—"}</td>
          <td class="num">${pricing ? fmtCurrency(pricing.totalPrice) : "—"}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="offer-card">
        <div class="offer-header">
          <div>
            <div style="font-size:10px;color:#94A3B8;font-weight:700;margin-bottom:2px;">${isRTL ? "المورد" : "SUPPLIER"} #${idx + 1}${isBest ? ` &bull; <span style="color:#16A34A;">★ ${isRTL ? "الأفضل سعراً" : "BEST PRICE"}</span>` : ""}</div>
            <div class="offer-company">${offer.companyName || offer.supplierName || "—"}</div>
          </div>
          <div class="offer-price">${fmtCurrency(offer.price)}</div>
        </div>
        ${offer.executionDuration ? `<p style="font-size:12px;color:#64748B;margin-bottom:8px;">⏱ ${offer.executionDuration} ${offer.executionDurationUnit ?? ""}</p>` : ""}
        ${offer.deliveryLocation ? `<p style="font-size:12px;color:#64748B;margin-bottom:8px;">📍 ${offer.deliveryLocation}</p>` : ""}
        ${rfq.boqItems && rfq.boqItems.length > 0 && offer.boqPricing && offer.boqPricing.length > 0 ? `
          <table style="margin-top:8px;">
            <thead><tr>
              <th>${isRTL ? "البند" : "Item"}</th>
              <th style="text-align:right">${isRTL ? "الكمية" : "Qty"}</th>
              <th style="text-align:right">${isRTL ? "سعر الوحدة" : "Unit Price"}</th>
              <th style="text-align:right">${isRTL ? "الإجمالي" : "Total"}</th>
            </tr></thead>
            <tbody>${boqRows}</tbody>
          </table>
        ` : ""}
        ${offer.notes ? `<p style="margin-top:10px;font-size:12px;color:#64748B;border-top:1px solid #F1F5F9;padding-top:8px;">${isRTL ? "ملاحظات:" : "Notes:"} ${offer.notes}</p>` : ""}
      </div>
    `;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}</style></head><body>
    <div class="header">
      <div class="logo">MDMAK TECH</div>
      <h1>${isRTL ? "مقارنة العروض" : "Offer Comparison"}</h1>
      <p>${rfq.title} &bull; ${offers.length} ${isRTL ? "عرض" : "offers"}</p>
    </div>
    <div class="body">
      <div class="section">
        <div class="section-title">${isRTL ? "ملخص المناقصة" : "Tender Summary"}</div>
        <div class="grid">
          <div class="field"><label>${isRTL ? "الفئة" : "Category"}</label><span>${rfq.category ?? "—"}</span></div>
          <div class="field"><label>${isRTL ? "المدينة" : "City"}</label><span>${rfq.city ?? "—"}</span></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">${isRTL ? "العروض المقدمة" : "Submitted Offers"} (${offers.length})</div>
        ${offerCards}
      </div>
      <div class="footer">
        <span>Mdmak Tech &bull; mdmaktech.sa</span>
        <span>${isRTL ? "تم التصدير" : "Exported"}: ${new Date().toLocaleDateString("en-SA")}</span>
      </div>
    </div>
  </body></html>`;

  await printAndShare(html, `Comparison_${rfq.id.slice(0, 8)}.pdf`);
}

async function printAndShare(html: string, filename: string): Promise<void> {
  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: filename, UTI: "com.adobe.pdf" });
    } else {
      await Print.printAsync({ html });
    }
  } catch (e: any) {
    Alert.alert("Error", e?.message ?? "Failed to generate PDF");
  }
}
