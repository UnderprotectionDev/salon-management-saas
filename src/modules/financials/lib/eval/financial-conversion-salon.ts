import type { EvalContext } from "./types";

/**
 * Financial formulas (PMT, FV, PV, PPMT, IPMT, NPV, IRR, RATE, NPER, SLN,
 * DDB, DB, CUMPRINC, CUMIPMT, XNPV, XIRR, MIRR, EFFECT, NOMINAL, DISC) +
 * Conversion formulas (ML_TO_OZ, OZ_TO_ML, KG_TO_LB, LB_TO_KG, CM_TO_INCH,
 * INCH_TO_CM, CELSIUS_TO_F, F_TO_CELSIUS) + Business/Pricing (DISCOUNT,
 * MARKUP, TAX_INCLUSIVE, USD_TO_TRY, EUR_TO_TRY, GBP_TO_TRY) +
 * Salon-specific formulas
 */
export function evalFinancialConversionSalon(
  expr: string,
  ctx: EvalContext,
): string | null {
  const { splitArgs, resolveStr, getNumResolved, getNum, expandRange } = ctx;

  // ── Financial Formulas ──────────────────────────────────

  // PMT(rate, nper, pv) — periodic payment
  const pmtM = expr.match(/^PMT\((.+)\)$/);
  if (pmtM) {
    const args = splitArgs(pmtM[1]);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const nper = args[1] ? getNumResolved(args[1]) : 0;
    const pv = args[2] ? getNumResolved(args[2]) : 0;
    if (nper === 0) return "#NUM!";
    if (rate === 0) return String(Math.round((-pv / nper) * 100) / 100);
    const payment = (pv * rate * (1 + rate) ** nper) / ((1 + rate) ** nper - 1);
    return String(Math.round(-payment * 100) / 100);
  }

  // FV(rate, nper, pmt, pv)
  const fvM = expr.match(/^FV\((.+)\)$/);
  if (fvM) {
    const args = splitArgs(fvM[1]);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const nper = args[1] ? getNumResolved(args[1]) : 0;
    const pmt = args[2] ? getNumResolved(args[2]) : 0;
    const pv = args[3] ? getNumResolved(args[3]) : 0;
    if (rate === 0) return String(Math.round(-(pv + pmt * nper) * 100) / 100);
    const fvPv = pv * (1 + rate) ** nper;
    const fvPmt = (pmt * ((1 + rate) ** nper - 1)) / rate;
    return String(Math.round(-(fvPv + fvPmt) * 100) / 100);
  }

  // PV(rate, nper, pmt)
  const pvM = expr.match(/^PV\((.+)\)$/);
  if (pvM) {
    const args = splitArgs(pvM[1]);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const nper = args[1] ? getNumResolved(args[1]) : 0;
    const pmt = args[2] ? getNumResolved(args[2]) : 0;
    if (rate === 0) return String(Math.round(-pmt * nper * 100) / 100);
    const result = (-pmt * (1 - (1 + rate) ** -nper)) / rate;
    return String(Math.round(result * 100) / 100);
  }

  // PPMT(rate, per, nper, pv) — must come before PMT check
  if (expr.startsWith("PPMT(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const per = args[1] ? getNumResolved(args[1]) : 0;
    const nper = args[2] ? getNumResolved(args[2]) : 0;
    const pv = args[3] ? getNumResolved(args[3]) : 0;
    if (nper === 0) return "#NUM!";
    if (per < 1 || per > nper) return "#NUM!";
    if (rate === 0) {
      return String(Math.round((-pv / nper) * 100) / 100);
    }
    const payment = (pv * rate * (1 + rate) ** nper) / ((1 + rate) ** nper - 1);
    // Balance at beginning of period `per`
    const balance =
      pv * (1 + rate) ** (per - 1) -
      (payment * ((1 + rate) ** (per - 1) - 1)) / rate;
    const interest = balance * rate;
    const ppmt = payment - interest;
    return String(Math.round(-ppmt * 100) / 100);
  }

  // IPMT(rate, per, nper, pv)
  if (expr.startsWith("IPMT(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const per = args[1] ? getNumResolved(args[1]) : 0;
    const nper = args[2] ? getNumResolved(args[2]) : 0;
    const pv = args[3] ? getNumResolved(args[3]) : 0;
    if (rate === 0) return "0";
    if (nper === 0) return "#NUM!";
    if (per < 1 || per > nper) return "#NUM!";
    const payment = (pv * rate * (1 + rate) ** nper) / ((1 + rate) ** nper - 1);
    // Balance at beginning of period `per`
    const balance =
      pv * (1 + rate) ** (per - 1) -
      (payment * ((1 + rate) ** (per - 1) - 1)) / rate;
    const interest = balance * rate;
    return String(Math.round(-interest * 100) / 100);
  }

  // NPV(rate, range)
  const npvM = expr.match(/^NPV\((.+)\)$/);
  if (npvM) {
    const args = splitArgs(npvM[1]);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const rangeStr = args[1]?.trim() ?? "";
    const cashFlows = rangeStr.includes(":")
      ? expandRange(rangeStr).map((r) => getNum(r))
      : [getNum(rangeStr)];
    let npv = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      npv += cashFlows[i] / (1 + rate) ** (i + 1);
    }
    return String(Math.round(npv * 100) / 100);
  }

  // IRR(range) — Newton-Raphson iteration
  const irrM = expr.match(/^IRR\((.+)\)$/);
  if (irrM) {
    const rangeStr = irrM[1].trim();
    const cashFlows = rangeStr.includes(":")
      ? expandRange(rangeStr).map((r) => getNum(r))
      : [getNum(rangeStr)];
    if (cashFlows.length < 2) return "#NUM!";
    let guess = 0.1;
    for (let iter = 0; iter < 100; iter++) {
      let npv = 0;
      let deriv = 0;
      for (let i = 0; i < cashFlows.length; i++) {
        npv += cashFlows[i] / (1 + guess) ** i;
        deriv += (-i * cashFlows[i]) / (1 + guess) ** (i + 1);
      }
      if (Math.abs(deriv) < 1e-10) break;
      const newGuess = guess - npv / deriv;
      if (Math.abs(newGuess - guess) < 1e-7) {
        return String(Math.round(newGuess * 10000) / 10000);
      }
      guess = newGuess;
    }
    return "#NUM!";
  }

  // RATE(nper, pmt, pv) — Newton-Raphson
  if (expr.startsWith("RATE(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    const nper = args[0] ? getNumResolved(args[0]) : 0;
    const pmt = args[1] ? getNumResolved(args[1]) : 0;
    const pv = args[2] ? getNumResolved(args[2]) : 0;
    if (nper === 0) return "#NUM!";
    let guess = 0.1;
    for (let iter = 0; iter < 100; iter++) {
      const f =
        (pv * guess * (1 + guess) ** nper) / ((1 + guess) ** nper - 1) + pmt;
      // Numerical derivative
      const h = 1e-7;
      const f2 =
        (pv * (guess + h) * (1 + guess + h) ** nper) /
          ((1 + guess + h) ** nper - 1) +
        pmt;
      const deriv = (f2 - f) / h;
      if (Math.abs(deriv) < 1e-12) break;
      if (!Number.isFinite(f) || !Number.isFinite(deriv)) break;
      let newGuess = guess - f / deriv;
      if (newGuess <= -1) {
        newGuess = -0.999999999;
      }
      if (Math.abs(newGuess - guess) < 1e-7) {
        return String(Math.round(newGuess * 1000000) / 1000000);
      }
      guess = newGuess;
    }
    return "#NUM!";
  }

  // NPER(rate, pmt, pv)
  if (expr.startsWith("NPER(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const pmt = args[1] ? getNumResolved(args[1]) : 0;
    const pv = args[2] ? getNumResolved(args[2]) : 0;
    if (pmt === 0) return "#NUM!";
    if (rate === 0) return String(Math.round((-pv / pmt) * 100) / 100);
    const result = Math.log(pmt / (pmt + pv * rate)) / Math.log(1 + rate);
    return Number.isFinite(result)
      ? String(Math.round(result * 100) / 100)
      : "#NUM!";
  }

  // SLN(cost, salvage, life)
  const slnM = expr.match(/^SLN\((.+)\)$/);
  if (slnM) {
    const args = splitArgs(slnM[1]);
    const cost = args[0] ? getNumResolved(args[0]) : 0;
    const salvage = args[1] ? getNumResolved(args[1]) : 0;
    const life = args[2] ? getNumResolved(args[2]) : 0;
    if (life === 0) return "#DIV/0!";
    return String(Math.round(((cost - salvage) / life) * 100) / 100);
  }

  // DDB(cost, salvage, life, period)
  if (expr.startsWith("DDB(") && expr.endsWith(")")) {
    const inner = expr.slice(4, -1);
    const args = splitArgs(inner);
    const cost = args[0] ? getNumResolved(args[0]) : 0;
    const salvage = args[1] ? getNumResolved(args[1]) : 0;
    const life = args[2] ? getNumResolved(args[2]) : 0;
    const period = args[3] ? getNumResolved(args[3]) : 0;
    if (life === 0) return "#DIV/0!";
    if (period < 1 || period > life) return "#NUM!";
    const rate = 2 / life;
    let bookValue = cost;
    for (let p = 1; p <= period; p++) {
      const dep = Math.max(0, Math.min(bookValue * rate, bookValue - salvage));
      if (p === period) return String(Math.round(dep * 100) / 100);
      bookValue -= dep;
    }
    return "0";
  }

  // DB(cost, salvage, life, period)
  if (expr.startsWith("DB(") && expr.endsWith(")")) {
    const inner = expr.slice(3, -1);
    const args = splitArgs(inner);
    const cost = args[0] ? getNumResolved(args[0]) : 0;
    const salvage = args[1] ? getNumResolved(args[1]) : 0;
    const life = args[2] ? getNumResolved(args[2]) : 0;
    const period = args[3] ? getNumResolved(args[3]) : 0;
    if (life === 0 || cost === 0) return "#DIV/0!";
    if (period < 1 || period > life) return "#NUM!";
    if (salvage > cost) return "#NUM!";
    const rate = Math.round((1 - (salvage / cost) ** (1 / life)) * 1000) / 1000;
    let bookValue = cost;
    for (let p = 1; p <= period; p++) {
      const dep = bookValue * rate;
      if (p === period) return String(Math.round(dep * 100) / 100);
      bookValue -= dep;
    }
    return "0";
  }

  // CUMPRINC(rate, nper, pv, start, end)
  if (expr.startsWith("CUMPRINC(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1);
    const args = splitArgs(inner);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const nper = args[1] ? getNumResolved(args[1]) : 0;
    const pv = args[2] ? getNumResolved(args[2]) : 0;
    const start = args[3] ? Math.floor(getNumResolved(args[3])) : 0;
    const end = args[4] ? Math.floor(getNumResolved(args[4])) : 0;
    if (nper === 0 || rate === 0) return "#NUM!";
    if (start < 1 || end < start || end > nper) return "#NUM!";
    const payment = (pv * rate * (1 + rate) ** nper) / ((1 + rate) ** nper - 1);
    let totalPrinc = 0;
    for (let per = start; per <= end; per++) {
      const balance =
        pv * (1 + rate) ** (per - 1) -
        (payment * ((1 + rate) ** (per - 1) - 1)) / rate;
      const interest = balance * rate;
      totalPrinc += payment - interest;
    }
    return String(Math.round(-totalPrinc * 100) / 100);
  }

  // CUMIPMT(rate, nper, pv, start, end)
  if (expr.startsWith("CUMIPMT(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    const rate = args[0] ? getNumResolved(args[0]) : 0;
    const nper = args[1] ? getNumResolved(args[1]) : 0;
    const pv = args[2] ? getNumResolved(args[2]) : 0;
    const start = args[3] ? Math.floor(getNumResolved(args[3])) : 0;
    const end = args[4] ? Math.floor(getNumResolved(args[4])) : 0;
    if (nper === 0 || rate === 0) return "#NUM!";
    if (start < 1 || end < start || end > nper) return "#NUM!";
    const payment = (pv * rate * (1 + rate) ** nper) / ((1 + rate) ** nper - 1);
    let totalInt = 0;
    for (let per = start; per <= end; per++) {
      const balance =
        pv * (1 + rate) ** (per - 1) -
        (payment * ((1 + rate) ** (per - 1) - 1)) / rate;
      totalInt += balance * rate;
    }
    return String(Math.round(-totalInt * 100) / 100);
  }

  // XNPV(rate, values, dates)
  if (expr.startsWith("XNPV(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const rate = getNumResolved(args[0]);
      const values = args[1].trim().includes(":")
        ? expandRange(args[1].trim()).map((r) => getNum(r))
        : [getNum(args[1].trim())];
      const dateRefs = args[2].trim().includes(":")
        ? expandRange(args[2].trim())
        : [args[2].trim()];
      const dates = dateRefs.map((r) => new Date(resolveStr(r)));
      if (dates.some((d) => Number.isNaN(d.getTime()))) return "#VALUE!";
      const n = Math.min(values.length, dates.length);
      if (n === 0) return "0";
      const d0 = dates[0].getTime();
      let xnpv = 0;
      for (let i = 0; i < n; i++) {
        const years =
          (dates[i].getTime() - d0) / (365.25 * 24 * 60 * 60 * 1000);
        xnpv += values[i] / (1 + rate) ** years;
      }
      return String(Math.round(xnpv * 100) / 100);
    }
  }

  // XIRR(values, dates) — Newton-Raphson
  if (expr.startsWith("XIRR(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const values = args[0].trim().includes(":")
        ? expandRange(args[0].trim()).map((r) => getNum(r))
        : [getNum(args[0].trim())];
      const dateRefs = args[1].trim().includes(":")
        ? expandRange(args[1].trim())
        : [args[1].trim()];
      const dates = dateRefs.map((r) => new Date(resolveStr(r)));
      if (dates.some((d) => Number.isNaN(d.getTime()))) return "#VALUE!";
      const n = Math.min(values.length, dates.length);
      if (n < 2) return "#NUM!";
      const d0 = dates[0].getTime();
      let guess = 0.1;
      for (let iter = 0; iter < 100; iter++) {
        let f = 0;
        let df = 0;
        for (let i = 0; i < n; i++) {
          const years =
            (dates[i].getTime() - d0) / (365.25 * 24 * 60 * 60 * 1000);
          const denom = (1 + guess) ** years;
          f += values[i] / denom;
          df += (-years * values[i]) / ((1 + guess) * denom);
        }
        if (Math.abs(df) < 1e-10) break;
        if (!Number.isFinite(f) || !Number.isFinite(df)) break;
        let newGuess = guess - f / df;
        if (newGuess <= -1) {
          newGuess = -0.999999999;
        }
        if (Math.abs(newGuess - guess) < 1e-7) {
          return String(Math.round(newGuess * 10000) / 10000);
        }
        guess = newGuess;
      }
      return "#NUM!";
    }
  }

  // MIRR(values, finance_rate, reinvest_rate)
  if (expr.startsWith("MIRR(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const values = args[0].trim().includes(":")
        ? expandRange(args[0].trim()).map((r) => getNum(r))
        : [getNum(args[0].trim())];
      const finance = args[1] ? getNumResolved(args[1]) : 0;
      const reinvest = args[2] ? getNumResolved(args[2]) : 0;
      const n = values.length;
      if (n < 2) return "#NUM!";
      let pvNeg = 0;
      let fvPos = 0;
      for (let i = 0; i < n; i++) {
        if (values[i] < 0) {
          pvNeg += values[i] / (1 + finance) ** i;
        } else {
          fvPos += values[i] * (1 + reinvest) ** (n - 1 - i);
        }
      }
      if (pvNeg === 0) return "#DIV/0!";
      const result = (-fvPos / pvNeg) ** (1 / (n - 1)) - 1;
      return Number.isFinite(result)
        ? String(Math.round(result * 10000) / 10000)
        : "#NUM!";
    }
  }

  // EFFECT(nominal_rate, npery)
  const effectM = expr.match(/^EFFECT\((.+)\)$/);
  if (effectM) {
    const args = splitArgs(effectM[1]);
    const nominal = args[0] ? getNumResolved(args[0]) : 0;
    const nper = args[1] ? getNumResolved(args[1]) : 0;
    if (nper < 1 || nominal <= 0) return "#NUM!";
    const result = (1 + nominal / nper) ** nper - 1;
    return String(Math.round(result * 1000000) / 1000000);
  }

  // NOMINAL(effect_rate, npery)
  const nominalM = expr.match(/^NOMINAL\((.+)\)$/);
  if (nominalM) {
    const args = splitArgs(nominalM[1]);
    const effect = args[0] ? getNumResolved(args[0]) : 0;
    const nper = args[1] ? getNumResolved(args[1]) : 0;
    if (nper < 1 || effect <= 0) return "#NUM!";
    const result = nper * ((1 + effect) ** (1 / nper) - 1);
    return String(Math.round(result * 1000000) / 1000000);
  }

  // DISC(settlement, maturity, price, redemption)
  if (expr.startsWith("DISC(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    if (args.length >= 4) {
      const settlement = new Date(resolveStr(args[0]));
      const maturity = new Date(resolveStr(args[1]));
      const price = getNumResolved(args[2]);
      const redemption = getNumResolved(args[3]);
      if (
        Number.isNaN(settlement.getTime()) ||
        Number.isNaN(maturity.getTime())
      )
        return "#VALUE!";
      if (redemption === 0) return "#DIV/0!";
      const days =
        (maturity.getTime() - settlement.getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 0) return "#NUM!";
      const result = ((redemption - price) / redemption) * (360 / days);
      return String(Math.round(result * 1000000) / 1000000);
    }
  }

  // ── Conversion Formulas ────────────────────────────────

  // ML_TO_OZ(ml)
  const mlToOzM = expr.match(/^ML_TO_OZ\((.+)\)$/);
  if (mlToOzM) {
    return String(
      Math.round(getNumResolved(mlToOzM[1]) * 0.033814 * 100) / 100,
    );
  }

  // OZ_TO_ML(oz)
  const ozToMlM = expr.match(/^OZ_TO_ML\((.+)\)$/);
  if (ozToMlM) {
    return String(Math.round(getNumResolved(ozToMlM[1]) * 29.5735 * 100) / 100);
  }

  // KG_TO_LB(kg)
  const kgToLbM = expr.match(/^KG_TO_LB\((.+)\)$/);
  if (kgToLbM) {
    return String(Math.round(getNumResolved(kgToLbM[1]) * 2.20462 * 100) / 100);
  }

  // LB_TO_KG(lb)
  const lbToKgM = expr.match(/^LB_TO_KG\((.+)\)$/);
  if (lbToKgM) {
    return String(
      Math.round(getNumResolved(lbToKgM[1]) * 0.453592 * 100) / 100,
    );
  }

  // CM_TO_INCH(cm)
  const cmToInM = expr.match(/^CM_TO_INCH\((.+)\)$/);
  if (cmToInM) {
    return String(
      Math.round(getNumResolved(cmToInM[1]) * 0.393701 * 100) / 100,
    );
  }

  // INCH_TO_CM(inches)
  const inToCmM = expr.match(/^INCH_TO_CM\((.+)\)$/);
  if (inToCmM) {
    return String(Math.round(getNumResolved(inToCmM[1]) * 2.54 * 100) / 100);
  }

  // CELSIUS_TO_F(celsius)
  const celToFM = expr.match(/^CELSIUS_TO_F\((.+)\)$/);
  if (celToFM) {
    const c = getNumResolved(celToFM[1]);
    return String(Math.round(((c * 9) / 5 + 32) * 100) / 100);
  }

  // F_TO_CELSIUS(fahrenheit)
  const fToCelM = expr.match(/^F_TO_CELSIUS\((.+)\)$/);
  if (fToCelM) {
    const f = getNumResolved(fToCelM[1]);
    return String(Math.round((((f - 32) * 5) / 9) * 100) / 100);
  }

  // DISCOUNT(price, discount_percent)
  const discountM = expr.match(/^DISCOUNT\((.+)\)$/);
  if (discountM) {
    const args = splitArgs(discountM[1]);
    const price = args[0] ? getNumResolved(args[0]) : 0;
    const pct = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round(price * (1 - pct / 100) * 100) / 100);
  }

  // MARKUP(cost, markup_percent)
  const markupM = expr.match(/^MARKUP\((.+)\)$/);
  if (markupM) {
    const args = splitArgs(markupM[1]);
    const cost = args[0] ? getNumResolved(args[0]) : 0;
    const pct = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round(cost * (1 + pct / 100) * 100) / 100);
  }

  // TAX_INCLUSIVE(price, tax_rate)
  const taxInclM = expr.match(/^TAX_INCLUSIVE\((.+)\)$/);
  if (taxInclM) {
    const args = splitArgs(taxInclM[1]);
    const price = args[0] ? getNumResolved(args[0]) : 0;
    const rate = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round(price * (1 + rate / 100) * 100) / 100);
  }

  // USD_TO_TRY(amount, rate)
  const usdTryM = expr.match(/^USD_TO_TRY\((.+)\)$/);
  if (usdTryM) {
    const args = splitArgs(usdTryM[1]);
    const amount = args[0] ? getNumResolved(args[0]) : 0;
    const rate = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round(amount * rate * 100) / 100);
  }

  // EUR_TO_TRY(amount, rate)
  const eurTryM = expr.match(/^EUR_TO_TRY\((.+)\)$/);
  if (eurTryM) {
    const args = splitArgs(eurTryM[1]);
    const amount = args[0] ? getNumResolved(args[0]) : 0;
    const rate = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round(amount * rate * 100) / 100);
  }

  // GBP_TO_TRY(amount, rate)
  const gbpTryM = expr.match(/^GBP_TO_TRY\((.+)\)$/);
  if (gbpTryM) {
    const args = splitArgs(gbpTryM[1]);
    const amount = args[0] ? getNumResolved(args[0]) : 0;
    const rate = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round(amount * rate * 100) / 100);
  }

  // ── Salon Formulas ──────────────────────────────────────

  const salonDiv = (
    pattern: RegExp,
    fn: (a: number, b: number) => number,
  ): string | null => {
    const m = expr.match(pattern);
    if (!m) return null;
    const args = splitArgs(m[1]);
    const a = args[0] ? getNumResolved(args[0]) : 0;
    const b = args[1] ? getNumResolved(args[1]) : 0;
    if (b === 0) return "#DIV/0!";
    const result = fn(a, b);
    return String(Math.round(result * 100) / 100);
  };

  // KDV_HESAPLA(amount)
  const kdvHM = expr.match(/^KDV_HESAPLA\((.+)\)$/);
  if (kdvHM) {
    const amount = getNumResolved(splitArgs(kdvHM[1])[0]?.trim() ?? "0");
    return String(Math.round(amount * 0.2 * 100) / 100);
  }

  // KDV_DAHIL(amount)
  const kdvDM = expr.match(/^KDV_DAHIL\((.+)\)$/);
  if (kdvDM) {
    const amount = getNumResolved(splitArgs(kdvDM[1])[0]?.trim() ?? "0");
    return String(Math.round(amount * 1.2 * 100) / 100);
  }

  // KDV_HARIC(total)
  const kdvXM = expr.match(/^KDV_HARIC\((.+)\)$/);
  if (kdvXM) {
    const total = getNumResolved(splitArgs(kdvXM[1])[0]?.trim() ?? "0");
    return String(Math.round((total / 1.2) * 100) / 100);
  }

  // KOMISYON(amount, rate)
  const komM = expr.match(/^KOMISYON\((.+)\)$/);
  if (komM) {
    const args = splitArgs(komM[1]);
    const amount = args[0] ? getNumResolved(args[0]) : 0;
    const rate = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round(amount * (rate / 100) * 100) / 100);
  }

  // KAR_MARJI(revenue, cost)
  const kmMatch = expr.match(/^KAR_MARJI\((.+)\)$/);
  if (kmMatch) {
    const kmArgs = splitArgs(kmMatch[1]);
    const rev = kmArgs[0] ? getNumResolved(kmArgs[0]) : 0;
    const cost = kmArgs[1] ? getNumResolved(kmArgs[1]) : 0;
    if (rev === 0) return "#DIV/0!";
    return String(Math.round(((rev - cost) / rev) * 100 * 100) / 100);
  }

  // PERSONEL_CIRO_ORT(total, staff_count)
  const pcoR = salonDiv(
    /^PERSONEL_CIRO_ORT\((.+)\)$/,
    (total, cnt) => total / cnt,
  );
  if (pcoR !== null) return pcoR;

  // SAAT_BASINA_GELIR(revenue, hours)
  const sbgR = salonDiv(/^SAAT_BASINA_GELIR\((.+)\)$/, (rev, hrs) => rev / hrs);
  if (sbgR !== null) return sbgR;

  // NOSHOW_ORANI(noshow, total)
  const nsoR = salonDiv(
    /^NOSHOW_ORANI\((.+)\)$/,
    (ns, total) => (ns / total) * 100,
  );
  if (nsoR !== null) return nsoR;

  // MUSTERI_ORT_HARCAMA(total, customer_count)
  const mohR = salonDiv(
    /^MUSTERI_ORT_HARCAMA\((.+)\)$/,
    (total, cnt) => total / cnt,
  );
  if (mohR !== null) return mohR;

  // RETENTION_ORANI(returning, total)
  const retR = salonDiv(
    /^RETENTION_ORANI\((.+)\)$/,
    (ret, total) => (ret / total) * 100,
  );
  if (retR !== null) return retR;

  // DOLULUK_ORANI(booked, capacity)
  const dolR = salonDiv(
    /^DOLULUK_ORANI\((.+)\)$/,
    (booked, cap) => (booked / cap) * 100,
  );
  if (dolR !== null) return dolR;

  // BUYUME_ORANI(current, previous)
  const buyR = salonDiv(
    /^BUYUME_ORANI\((.+)\)$/,
    (cur, prev) => ((cur - prev) / prev) * 100,
  );
  if (buyR !== null) return buyR;

  // GUNLUK_CIRO(monthly_revenue, days)
  const gunR = salonDiv(/^GUNLUK_CIRO\((.+)\)$/, (rev, days) => rev / days);
  if (gunR !== null) return gunR;

  // HIZMET_ORANI(service_revenue, total_revenue)
  const hizR = salonDiv(
    /^HIZMET_ORANI\((.+)\)$/,
    (sRev, total) => (sRev / total) * 100,
  );
  if (hizR !== null) return hizR;

  // AYLIK_GIDER_ORANI(expenses, revenue)
  const agoR = salonDiv(
    /^AYLIK_GIDER_ORANI\((.+)\)$/,
    (exp, rev) => (exp / rev) * 100,
  );
  if (agoR !== null) return agoR;

  // STOK_DEVIR_HIZI(cogs, avg_inventory)
  const sdR = salonDiv(/^STOK_DEVIR_HIZI\((.+)\)$/, (cogs, inv) => cogs / inv);
  if (sdR !== null) return sdR;

  // MUSTERI_KAZANIM_MALIYETI(marketing_cost, new_customers)
  const mkmR = salonDiv(
    /^MUSTERI_KAZANIM_MALIYETI\((.+)\)$/,
    (cost, cust) => cost / cust,
  );
  if (mkmR !== null) return mkmR;

  // RANDEVU_ORTALAMA(total_revenue, appointment_count)
  const raR = salonDiv(/^RANDEVU_ORTALAMA\((.+)\)$/, (rev, cnt) => rev / cnt);
  if (raR !== null) return raR;

  // PERSONEL_PRIM(revenue, target, bonus_rate)
  const primM = expr.match(/^PERSONEL_PRIM\((.+)\)$/);
  if (primM) {
    const args = splitArgs(primM[1]);
    const revenue = args[0] ? getNumResolved(args[0]) : 0;
    const target = args[1] ? getNumResolved(args[1]) : 0;
    const bonusRate = args[2] ? getNumResolved(args[2]) : 0;
    if (revenue <= target) return "0";
    return String(
      Math.round((revenue - target) * (bonusRate / 100) * 100) / 100,
    );
  }

  // URUN_KAR(selling_price, cost_price, quantity)
  const urunM = expr.match(/^URUN_KAR\((.+)\)$/);
  if (urunM) {
    const args = splitArgs(urunM[1]);
    const selling = args[0] ? getNumResolved(args[0]) : 0;
    const cost = args[1] ? getNumResolved(args[1]) : 0;
    const qty = args[2] ? getNumResolved(args[2]) : 0;
    return String(Math.round((selling - cost) * qty * 100) / 100);
  }

  // IPTAL_ORANI(cancelled, total)
  const iptalR = salonDiv(
    /^IPTAL_ORANI\((.+)\)$/,
    (cancelled, total) => (cancelled / total) * 100,
  );
  if (iptalR !== null) return iptalR;

  // ORTALAMA_HIZMET_SURESI(total_minutes, service_count)
  const ohsR = salonDiv(
    /^ORTALAMA_HIZMET_SURESI\((.+)\)$/,
    (mins, cnt) => mins / cnt,
  );
  if (ohsR !== null) return ohsR;

  // TEKRAR_ZIYARET_ORANI(repeat_visits, total_visits)
  const tzoR = salonDiv(
    /^TEKRAR_ZIYARET_ORANI\((.+)\)$/,
    (repeat, total) => (repeat / total) * 100,
  );
  if (tzoR !== null) return tzoR;

  // NET_KAR(revenue, expenses)
  const netKarM = expr.match(/^NET_KAR\((.+)\)$/);
  if (netKarM) {
    const args = splitArgs(netKarM[1]);
    const revenue = args[0] ? getNumResolved(args[0]) : 0;
    const expenses = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round((revenue - expenses) * 100) / 100);
  }

  // KAMPANYA_ROI(gain, cost)
  const roiR = salonDiv(
    /^KAMPANYA_ROI\((.+)\)$/,
    (gain, cost) => ((gain - cost) / cost) * 100,
  );
  if (roiR !== null) return roiR;

  // KOLTUK_BASINA_GELIR(revenue, seat_count)
  const kbgR = salonDiv(
    /^KOLTUK_BASINA_GELIR\((.+)\)$/,
    (rev, seats) => rev / seats,
  );
  if (kbgR !== null) return kbgR;

  // CIRO_HEDEFI_FARKI(actual, target)
  const chfM = expr.match(/^CIRO_HEDEFI_FARKI\((.+)\)$/);
  if (chfM) {
    const args = splitArgs(chfM[1]);
    const actual = args[0] ? getNumResolved(args[0]) : 0;
    const target = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.round((actual - target) * 100) / 100);
  }

  // HAFTALIK_CIRO(monthly_revenue, weeks)
  const hcR = salonDiv(/^HAFTALIK_CIRO\((.+)\)$/, (rev, weeks) => rev / weeks);
  if (hcR !== null) return hcR;

  // PERSONEL_VERIMLILIK(actual_hours, available_hours)
  const pvR = salonDiv(
    /^PERSONEL_VERIMLILIK\((.+)\)$/,
    (actual, available) => (actual / available) * 100,
  );
  if (pvR !== null) return pvR;

  // URUN_SATIS_ORANI(product_revenue, total_revenue)
  const usoR = salonDiv(
    /^URUN_SATIS_ORANI\((.+)\)$/,
    (prodRev, totalRev) => (prodRev / totalRev) * 100,
  );
  if (usoR !== null) return usoR;

  return null;
}
