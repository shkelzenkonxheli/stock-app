import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/auth";
import {
  BUSINESS_TIME_ZONE,
  getMonthStringInTimeZone,
  getMonthlySalesReport,
} from "@/lib/reports/monthly-sales-report";
import { ReportPdfDocument } from "../report-pdf-document";

export async function GET(request: Request) {
  await requireRole(["SUPER_ADMIN"]);

  const { searchParams } = new URL(request.url);
  const defaultMonth = getMonthStringInTimeZone(new Date(), BUSINESS_TIME_ZONE);
  const rawMonth = searchParams.get("month")?.trim() || defaultMonth;
  const selectedMonth = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : defaultMonth;

  const report = await getMonthlySalesReport(selectedMonth);
  const pdfBuffer = await renderToBuffer(
    createElement(ReportPdfDocument, { report }),
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="shkelshoes-report-${selectedMonth}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
