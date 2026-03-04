import type { FormulaEntry } from "./types";

export const SALON_FORMULAS: FormulaEntry[] = [
  {
    name: "KDV_HESAPLA",
    syntax: "KDV_HESAPLA(amount)",
    description: "Calculates 20% VAT (KDV) amount — ROUND(amount * 0.20, 2)",
    example: "=KDV_HESAPLA(500)",
    category: "Salon",
    params: [
      {
        name: "amount",
        type: "number",
        description: "Net amount before VAT",
        example: "500",
      },
    ],
  },
  {
    name: "KDV_DAHIL",
    syntax: "KDV_DAHIL(amount)",
    description:
      "Returns amount with 20% VAT included — ROUND(amount * 1.20, 2)",
    example: "=KDV_DAHIL(500)",
    category: "Salon",
    params: [
      {
        name: "amount",
        type: "number",
        description: "Net amount before VAT",
        example: "500",
      },
    ],
  },
  {
    name: "KDV_HARIC",
    syntax: "KDV_HARIC(total)",
    description: "Returns amount without 20% VAT — ROUND(total / 1.20, 2)",
    example: "=KDV_HARIC(600)",
    category: "Salon",
    params: [
      {
        name: "total",
        type: "number",
        description: "Gross amount including VAT",
        example: "600",
      },
    ],
  },
  {
    name: "KOMISYON",
    syntax: "KOMISYON(amount, rate)",
    description: "Calculates commission — ROUND(amount * rate / 100, 2)",
    example: "=KOMISYON(1000, 15)",
    category: "Salon",
    params: [
      { name: "amount", type: "number", description: "Revenue amount" },
      {
        name: "rate",
        type: "number",
        description: "Commission rate as percentage",
        example: "15",
      },
    ],
  },
  {
    name: "KAR_MARJI",
    syntax: "KAR_MARJI(revenue, cost)",
    description:
      "Calculates profit margin % — ROUND((revenue - cost) / revenue * 100, 2)",
    example: "=KAR_MARJI(1000, 600)",
    category: "Salon",
    params: [
      { name: "revenue", type: "number", description: "Total revenue" },
      { name: "cost", type: "number", description: "Total cost" },
    ],
  },
  {
    name: "PERSONEL_CIRO_ORT",
    syntax: "PERSONEL_CIRO_ORT(total, staff_count)",
    description:
      "Average revenue per staff member — ROUND(total / staff_count, 2)",
    example: "=PERSONEL_CIRO_ORT(50000, 5)",
    category: "Salon",
    params: [
      { name: "total", type: "number", description: "Total revenue" },
      {
        name: "staff_count",
        type: "number",
        description: "Number of staff members",
      },
    ],
  },
  {
    name: "SAAT_BASINA_GELIR",
    syntax: "SAAT_BASINA_GELIR(revenue, hours)",
    description: "Revenue per hour — ROUND(revenue / hours, 2)",
    example: "=SAAT_BASINA_GELIR(5000, 40)",
    category: "Salon",
    params: [
      { name: "revenue", type: "number", description: "Total revenue" },
      { name: "hours", type: "number", description: "Total hours worked" },
    ],
  },
  {
    name: "NOSHOW_ORANI",
    syntax: "NOSHOW_ORANI(noshow, total)",
    description: "No-show rate as percentage — ROUND(noshow / total * 100, 2)",
    example: "=NOSHOW_ORANI(3, 50)",
    category: "Salon",
    params: [
      {
        name: "noshow",
        type: "number",
        description: "Number of no-show appointments",
      },
      {
        name: "total",
        type: "number",
        description: "Total number of appointments",
      },
    ],
  },
  {
    name: "MUSTERI_ORT_HARCAMA",
    syntax: "MUSTERI_ORT_HARCAMA(total, customer_count)",
    description:
      "Average spending per customer — ROUND(total / customer_count, 2)",
    example: "=MUSTERI_ORT_HARCAMA(25000, 100)",
    category: "Salon",
    params: [
      { name: "total", type: "number", description: "Total revenue" },
      {
        name: "customer_count",
        type: "number",
        description: "Number of customers",
      },
    ],
  },
  {
    name: "RETENTION_ORANI",
    syntax: "RETENTION_ORANI(returning, total)",
    description:
      "Customer retention rate as percentage — ROUND(returning / total * 100, 2)",
    example: "=RETENTION_ORANI(80, 100)",
    category: "Salon",
    params: [
      {
        name: "returning",
        type: "number",
        description: "Number of returning customers",
      },
      {
        name: "total",
        type: "number",
        description: "Total number of customers",
      },
    ],
  },
  {
    name: "DOLULUK_ORANI",
    syntax: "DOLULUK_ORANI(booked, capacity)",
    description:
      "Occupancy rate as percentage — ROUND(booked / capacity * 100, 2)",
    example: "=DOLULUK_ORANI(80, 100)",
    category: "Salon",
    params: [
      { name: "booked", type: "number", description: "Number of booked slots" },
      {
        name: "capacity",
        type: "number",
        description: "Total available capacity",
      },
    ],
  },
  {
    name: "BUYUME_ORANI",
    syntax: "BUYUME_ORANI(current, previous)",
    description:
      "Growth rate as percentage — ROUND((current - previous) / previous * 100, 2)",
    example: "=BUYUME_ORANI(12000, 10000)",
    category: "Salon",
    params: [
      { name: "current", type: "number", description: "Current period value" },
      {
        name: "previous",
        type: "number",
        description: "Previous period value",
      },
    ],
  },
  {
    name: "GUNLUK_CIRO",
    syntax: "GUNLUK_CIRO(monthly_revenue, days)",
    description: "Daily revenue — ROUND(monthly_revenue / days, 2)",
    example: "=GUNLUK_CIRO(30000, 26)",
    category: "Salon",
    params: [
      {
        name: "monthly_revenue",
        type: "number",
        description: "Monthly revenue",
      },
      { name: "days", type: "number", description: "Working days in month" },
    ],
  },
  {
    name: "HIZMET_ORANI",
    syntax: "HIZMET_ORANI(service_revenue, total_revenue)",
    description:
      "Service revenue share as percentage — ROUND(service_revenue / total_revenue * 100, 2)",
    example: "=HIZMET_ORANI(8000, 20000)",
    category: "Salon",
    params: [
      {
        name: "service_revenue",
        type: "number",
        description: "Revenue from a specific service",
      },
      { name: "total_revenue", type: "number", description: "Total revenue" },
    ],
  },
  {
    name: "PERSONEL_PRIM",
    syntax: "PERSONEL_PRIM(revenue, target, bonus_rate)",
    description:
      "Staff bonus when revenue exceeds target — IF revenue > target THEN ROUND((revenue - target) * bonus_rate / 100, 2) ELSE 0",
    example: "=PERSONEL_PRIM(15000, 10000, 10)",
    category: "Salon",
    params: [
      { name: "revenue", type: "number", description: "Staff revenue" },
      { name: "target", type: "number", description: "Revenue target" },
      {
        name: "bonus_rate",
        type: "number",
        description: "Bonus percentage on excess",
      },
    ],
  },
  {
    name: "STOK_DEVIR_HIZI",
    syntax: "STOK_DEVIR_HIZI(cogs, avg_inventory)",
    description: "Inventory turnover ratio — ROUND(cogs / avg_inventory, 2)",
    example: "=STOK_DEVIR_HIZI(50000, 10000)",
    category: "Salon",
    params: [
      { name: "cogs", type: "number", description: "Cost of goods sold" },
      {
        name: "avg_inventory",
        type: "number",
        description: "Average inventory value",
      },
    ],
  },
  {
    name: "MUSTERI_KAZANIM_MALIYETI",
    syntax: "MUSTERI_KAZANIM_MALIYETI(marketing_cost, new_customers)",
    description:
      "Customer acquisition cost — ROUND(marketing_cost / new_customers, 2)",
    example: "=MUSTERI_KAZANIM_MALIYETI(5000, 50)",
    category: "Salon",
    params: [
      {
        name: "marketing_cost",
        type: "number",
        description: "Total marketing spend",
      },
      {
        name: "new_customers",
        type: "number",
        description: "Number of new customers acquired",
      },
    ],
  },
  {
    name: "AYLIK_GIDER_ORANI",
    syntax: "AYLIK_GIDER_ORANI(expenses, revenue)",
    description:
      "Monthly expense ratio as percentage — ROUND(expenses / revenue * 100, 2)",
    example: "=AYLIK_GIDER_ORANI(15000, 50000)",
    category: "Salon",
    params: [
      {
        name: "expenses",
        type: "number",
        description: "Total monthly expenses",
      },
      { name: "revenue", type: "number", description: "Total monthly revenue" },
    ],
  },
  {
    name: "RANDEVU_ORTALAMA",
    syntax: "RANDEVU_ORTALAMA(total_revenue, appointment_count)",
    description:
      "Average revenue per appointment — ROUND(total_revenue / appointment_count, 2)",
    example: "=RANDEVU_ORTALAMA(25000, 200)",
    category: "Salon",
    params: [
      { name: "total_revenue", type: "number", description: "Total revenue" },
      {
        name: "appointment_count",
        type: "number",
        description: "Number of appointments",
      },
    ],
  },
  {
    name: "URUN_KAR",
    syntax: "URUN_KAR(selling_price, cost_price, quantity)",
    description:
      "Product profit — ROUND((selling_price - cost_price) * quantity, 2)",
    example: "=URUN_KAR(100, 60, 25)",
    category: "Salon",
    params: [
      {
        name: "selling_price",
        type: "number",
        description: "Selling price per unit",
      },
      {
        name: "cost_price",
        type: "number",
        description: "Cost price per unit",
      },
      { name: "quantity", type: "number", description: "Number of units sold" },
    ],
  },
  {
    name: "IPTAL_ORANI",
    syntax: "IPTAL_ORANI(cancelled, total)",
    description:
      "Cancellation rate as percentage — ROUND(cancelled / total * 100, 2)",
    example: "=IPTAL_ORANI(5, 100)",
    category: "Salon",
    params: [
      {
        name: "cancelled",
        type: "number",
        description: "Number of cancelled appointments",
      },
      {
        name: "total",
        type: "number",
        description: "Total number of appointments",
      },
    ],
  },
  {
    name: "ORTALAMA_HIZMET_SURESI",
    syntax: "ORTALAMA_HIZMET_SURESI(total_minutes, service_count)",
    description:
      "Average service duration in minutes — ROUND(total_minutes / service_count, 2)",
    example: "=ORTALAMA_HIZMET_SURESI(4500, 100)",
    category: "Salon",
    params: [
      {
        name: "total_minutes",
        type: "number",
        description: "Total service minutes",
      },
      {
        name: "service_count",
        type: "number",
        description: "Number of services",
      },
    ],
  },
  {
    name: "TEKRAR_ZIYARET_ORANI",
    syntax: "TEKRAR_ZIYARET_ORANI(repeat_visits, total_visits)",
    description:
      "Repeat visit rate as percentage — ROUND(repeat_visits / total_visits * 100, 2)",
    example: "=TEKRAR_ZIYARET_ORANI(60, 100)",
    category: "Salon",
    params: [
      {
        name: "repeat_visits",
        type: "number",
        description: "Number of repeat visits",
      },
      {
        name: "total_visits",
        type: "number",
        description: "Total number of visits",
      },
    ],
  },
  {
    name: "NET_KAR",
    syntax: "NET_KAR(revenue, expenses)",
    description: "Net profit — revenue minus expenses",
    example: "=NET_KAR(50000, 35000)",
    category: "Salon",
    params: [
      { name: "revenue", type: "number", description: "Total revenue" },
      { name: "expenses", type: "number", description: "Total expenses" },
    ],
  },
  {
    name: "KAMPANYA_ROI",
    syntax: "KAMPANYA_ROI(gain, cost)",
    description:
      "Campaign ROI as percentage — ROUND((gain - cost) / cost * 100, 2)",
    example: "=KAMPANYA_ROI(15000, 5000)",
    category: "Salon",
    params: [
      { name: "gain", type: "number", description: "Revenue from campaign" },
      { name: "cost", type: "number", description: "Campaign cost" },
    ],
  },
  {
    name: "KOLTUK_BASINA_GELIR",
    syntax: "KOLTUK_BASINA_GELIR(revenue, seat_count)",
    description: "Revenue per chair/seat — ROUND(revenue / seat_count, 2)",
    example: "=KOLTUK_BASINA_GELIR(50000, 5)",
    category: "Salon",
    params: [
      { name: "revenue", type: "number", description: "Total revenue" },
      {
        name: "seat_count",
        type: "number",
        description: "Number of chairs/seats",
      },
    ],
  },
  {
    name: "CIRO_HEDEFI_FARKI",
    syntax: "CIRO_HEDEFI_FARKI(actual, target)",
    description:
      "Revenue target variance — actual minus target (positive = over target)",
    example: "=CIRO_HEDEFI_FARKI(55000, 50000)",
    category: "Salon",
    params: [
      { name: "actual", type: "number", description: "Actual revenue" },
      { name: "target", type: "number", description: "Target revenue" },
    ],
  },
  {
    name: "HAFTALIK_CIRO",
    syntax: "HAFTALIK_CIRO(monthly_revenue, weeks)",
    description: "Weekly revenue — ROUND(monthly_revenue / weeks, 2)",
    example: "=HAFTALIK_CIRO(40000, 4)",
    category: "Salon",
    params: [
      {
        name: "monthly_revenue",
        type: "number",
        description: "Monthly revenue",
      },
      { name: "weeks", type: "number", description: "Number of weeks" },
    ],
  },
  {
    name: "PERSONEL_VERIMLILIK",
    syntax: "PERSONEL_VERIMLILIK(actual_hours, available_hours)",
    description:
      "Staff productivity as percentage — ROUND(actual_hours / available_hours * 100, 2)",
    example: "=PERSONEL_VERIMLILIK(32, 40)",
    category: "Salon",
    params: [
      {
        name: "actual_hours",
        type: "number",
        description: "Hours with appointments",
      },
      {
        name: "available_hours",
        type: "number",
        description: "Total available hours",
      },
    ],
  },
  {
    name: "URUN_SATIS_ORANI",
    syntax: "URUN_SATIS_ORANI(product_revenue, total_revenue)",
    description:
      "Product sales ratio as percentage — ROUND(product_revenue / total_revenue * 100, 2)",
    example: "=URUN_SATIS_ORANI(8000, 50000)",
    category: "Salon",
    params: [
      {
        name: "product_revenue",
        type: "number",
        description: "Revenue from product sales",
      },
      { name: "total_revenue", type: "number", description: "Total revenue" },
    ],
  },
];
