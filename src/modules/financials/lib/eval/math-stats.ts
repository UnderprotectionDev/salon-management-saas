import type { EvalContext } from "./types";

/**
 * Basic Aggregation + Rounding/Math + Trig + Statistical + Conditional aggregation
 */
export function evalMathStats(expr: string, ctx: EvalContext): string | null {
  const {
    resolveArgs,
    splitArgs,
    getNumResolved,
    getNum,
    expandRange,
    parseRef,
    parseCriteria,
    matchesCriteria,
    cells,
    evalFormula,
    depth,
    customFormulas,
  } = ctx;

  // SUM
  const sumM = expr.match(/^SUM\((.+)\)$/);
  if (sumM) {
    const vals = resolveArgs(sumM[1]);
    return String(vals.reduce((a, b) => a + b, 0));
  }

  // AVERAGE / AVG
  const avgM = expr.match(/^(?:AVERAGE|AVG)\((.+)\)$/);
  if (avgM) {
    const vals = resolveArgs(avgM[1]);
    if (vals.length === 0) return "#DIV/0!";
    return String(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  // COUNT (numeric cells only)
  const cntM = expr.match(/^COUNT\((.+)\)$/);
  if (cntM) {
    const args = cntM[1].split(",").map((s) => s.trim());
    let count = 0;
    for (const a of args) {
      if (a.includes(":")) {
        for (const r of expandRange(a)) {
          const val = cells[r]?.value ?? "";
          const resolved = val.startsWith("=")
            ? evalFormula(val, cells, depth + 1, customFormulas)
            : val;
          if (resolved && !Number.isNaN(Number(resolved))) count++;
        }
      } else if (parseRef(a)) {
        const val = cells[a]?.value ?? "";
        const resolved = val.startsWith("=")
          ? evalFormula(val, cells, depth + 1, customFormulas)
          : val;
        if (resolved && !Number.isNaN(Number(resolved))) count++;
      }
    }
    return String(count);
  }

  // COUNTA (non-empty cells)
  const cntaM = expr.match(/^COUNTA\((.+)\)$/);
  if (cntaM) {
    const args = cntaM[1].split(",").map((s) => s.trim());
    let count = 0;
    for (const a of args) {
      if (a.includes(":")) {
        for (const r of expandRange(a)) {
          const val = cells[r]?.value ?? "";
          const resolved = val.startsWith("=")
            ? evalFormula(val, cells, depth + 1, customFormulas)
            : val;
          if (resolved) count++;
        }
      } else if (parseRef(a)) {
        const val = cells[a]?.value ?? "";
        const resolved = val.startsWith("=")
          ? evalFormula(val, cells, depth + 1, customFormulas)
          : val;
        if (resolved) count++;
      }
    }
    return String(count);
  }

  // MIN
  const minM = expr.match(/^MIN\((.+)\)$/);
  if (minM) {
    const vals = resolveArgs(minM[1]);
    return vals.length ? String(Math.min(...vals)) : "0";
  }

  // MAX
  const maxM = expr.match(/^MAX\((.+)\)$/);
  if (maxM) {
    const vals = resolveArgs(maxM[1]);
    return vals.length ? String(Math.max(...vals)) : "0";
  }

  // ROUND(number, digits)
  const roundM = expr.match(/^ROUND\((.+)\)$/);
  if (roundM) {
    const args = splitArgs(roundM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const digits = args[1] ? Math.floor(getNumResolved(args[1])) : 0;
    const factor = 10 ** digits;
    return String(Math.round(num * factor) / factor);
  }

  // ABS(number)
  const absM = expr.match(/^ABS\((.+)\)$/);
  if (absM) {
    return String(Math.abs(getNumResolved(absM[1])));
  }

  // CEILING(number, significance)
  const ceilM = expr.match(/^CEILING\((.+)\)$/);
  if (ceilM) {
    const args = splitArgs(ceilM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const sig = args[1] ? getNumResolved(args[1]) : 1;
    if (sig === 0) return "0";
    return String(Math.ceil(num / sig) * sig);
  }

  // FLOOR(number, significance)
  const floorM = expr.match(/^FLOOR\((.+)\)$/);
  if (floorM) {
    const args = splitArgs(floorM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const sig = args[1] ? getNumResolved(args[1]) : 1;
    if (sig === 0) return "0";
    return String(Math.floor(num / sig) * sig);
  }

  // INT(number)
  const intM = expr.match(/^INT\((.+)\)$/);
  if (intM) {
    return String(Math.floor(getNumResolved(intM[1])));
  }

  // RAND()
  if (expr === "RAND()") {
    return String(Math.random());
  }

  // RANDBETWEEN(bottom, top)
  const randBM = expr.match(/^RANDBETWEEN\((.+)\)$/);
  if (randBM) {
    const args = splitArgs(randBM[1]);
    const bottom = args[0] ? getNumResolved(args[0]) : 0;
    const top = args[1] ? getNumResolved(args[1]) : 0;
    return String(Math.floor(Math.random() * (top - bottom + 1)) + bottom);
  }

  // SIGN(number)
  const signM = expr.match(/^SIGN\((.+)\)$/);
  if (signM) {
    return String(Math.sign(getNumResolved(signM[1])));
  }

  // PI()
  if (expr === "PI()") {
    return String(Math.PI);
  }

  // PRODUCT(range)
  const prodM = expr.match(/^PRODUCT\((.+)\)$/);
  if (prodM) {
    const vals = resolveArgs(prodM[1]);
    return vals.length ? String(vals.reduce((a, b) => a * b, 1)) : "0";
  }

  // TRUNC(number, digits)
  const truncM = expr.match(/^TRUNC\((.+)\)$/);
  if (truncM) {
    const args = splitArgs(truncM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const digits = args[1] ? Math.floor(getNumResolved(args[1])) : 0;
    const factor = 10 ** digits;
    return String(Math.trunc(num * factor) / factor);
  }

  // GCD(a, b)
  const gcdM = expr.match(/^GCD\((.+)\)$/);
  if (gcdM) {
    const args = splitArgs(gcdM[1]);
    let a = Math.abs(Math.floor(args[0] ? getNumResolved(args[0]) : 0));
    let b = Math.abs(Math.floor(args[1] ? getNumResolved(args[1]) : 0));
    while (b) {
      [a, b] = [b, a % b];
    }
    return String(a);
  }

  // LCM(a, b)
  const lcmM = expr.match(/^LCM\((.+)\)$/);
  if (lcmM) {
    const args = splitArgs(lcmM[1]);
    const originalA = Math.abs(
      Math.floor(args[0] ? getNumResolved(args[0]) : 0),
    );
    const originalB = Math.abs(
      Math.floor(args[1] ? getNumResolved(args[1]) : 0),
    );
    if (originalA === 0 || originalB === 0) return "0";
    let a = originalA;
    let b = originalB;
    while (b) {
      [a, b] = [b, a % b];
    }
    return String((originalA / a) * originalB);
  }

  // EVEN(number)
  const evenM = expr.match(/^EVEN\((.+)\)$/);
  if (evenM) {
    const num = getNumResolved(evenM[1]);
    const rounded = num >= 0 ? Math.ceil(num) : Math.floor(num);
    const abs = Math.abs(rounded);
    const result = abs % 2 === 0 ? abs : abs + 1;
    return String(num >= 0 ? result : -result);
  }

  // ODD(number)
  const oddM = expr.match(/^ODD\((.+)\)$/);
  if (oddM) {
    const num = getNumResolved(oddM[1]);
    const rounded = num >= 0 ? Math.ceil(num) : Math.floor(num);
    const abs = Math.abs(rounded);
    const result = abs % 2 === 1 ? abs : abs + 1;
    return String(num >= 0 ? result : -result);
  }

  // FACT(number)
  const factM = expr.match(/^FACT\((.+)\)$/);
  if (factM) {
    const n = Math.floor(getNumResolved(factM[1]));
    if (n < 0) return "#NUM!";
    if (n > 170) return "Infinity";
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return String(result);
  }

  // COMBIN(n, k)
  const combinM = expr.match(/^COMBIN\((.+)\)$/);
  if (combinM) {
    const args = splitArgs(combinM[1]);
    const n = Math.floor(args[0] ? getNumResolved(args[0]) : 0);
    const k = Math.floor(args[1] ? getNumResolved(args[1]) : 0);
    if (k < 0 || k > n || n < 0) return "#NUM!";
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return String(Math.round(result));
  }

  // PERMUT(n, k)
  const permutM = expr.match(/^PERMUT\((.+)\)$/);
  if (permutM) {
    const args = splitArgs(permutM[1]);
    const n = Math.floor(args[0] ? getNumResolved(args[0]) : 0);
    const k = Math.floor(args[1] ? getNumResolved(args[1]) : 0);
    if (k < 0 || k > n || n < 0) return "#NUM!";
    let result = 1;
    for (let i = 0; i < k; i++) result *= n - i;
    return String(result);
  }

  // DEGREES(radians)
  const degreesM = expr.match(/^DEGREES\((.+)\)$/);
  if (degreesM) {
    return String(getNumResolved(degreesM[1]) * (180 / Math.PI));
  }

  // RADIANS(degrees)
  const radiansM = expr.match(/^RADIANS\((.+)\)$/);
  if (radiansM) {
    return String(getNumResolved(radiansM[1]) * (Math.PI / 180));
  }

  // SIN(number)
  const sinM = expr.match(/^SIN\((.+)\)$/);
  if (sinM) {
    const result = Math.sin(getNumResolved(sinM[1]));
    return String(Math.abs(result) < 1e-10 ? 0 : result);
  }

  // COS(number)
  const cosM = expr.match(/^COS\((.+)\)$/);
  if (cosM) {
    const result = Math.cos(getNumResolved(cosM[1]));
    return String(Math.abs(result) < 1e-10 ? 0 : result);
  }

  // TAN(number)
  const tanM = expr.match(/^TAN\((.+)\)$/);
  if (tanM) {
    const result = Math.tan(getNumResolved(tanM[1]));
    return String(Math.abs(result) < 1e-10 ? 0 : result);
  }

  // ── Statistical ─────────────────────────────────────────

  // MODE(range)
  const modeM = expr.match(/^MODE\((.+)\)$/);
  if (modeM) {
    const vals = resolveArgs(modeM[1]);
    if (vals.length === 0) return "#N/A";
    const freq = new Map<number, number>();
    for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
    let maxFreq = 0;
    let modeVal = vals[0];
    for (const [v, f] of freq) {
      if (f > maxFreq) {
        maxFreq = f;
        modeVal = v;
      }
    }
    return maxFreq > 1 ? String(modeVal) : "#N/A";
  }

  // RANK(number, range, order)
  if (expr.startsWith("RANK(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const num = getNumResolved(args[0]);
      const rangeStr = args[1].trim();
      const vals = rangeStr.includes(":")
        ? expandRange(rangeStr).map((r) => getNum(r))
        : [getNum(rangeStr)];
      const order = args[2] ? Number.parseInt(args[2].trim(), 10) : 0;
      const sorted = [...vals].sort((a, b) => (order === 0 ? b - a : a - b));
      const rank = sorted.indexOf(num);
      return rank === -1 ? "#N/A" : String(rank + 1);
    }
  }

  // CORREL(range1, range2)
  const correlM = expr.match(/^CORREL\((.+)\)$/);
  if (correlM) {
    const args = splitArgs(correlM[1]);
    const x = args[0].trim().includes(":")
      ? expandRange(args[0].trim()).map((r) => getNum(r))
      : [getNum(args[0].trim())];
    const y = args[1]?.trim().includes(":")
      ? expandRange(args[1].trim()).map((r) => getNum(r))
      : [getNum(args[1]?.trim() ?? "0")];
    const n = Math.min(x.length, y.length);
    if (n < 2) return "#DIV/0!";
    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
    let sumXY = 0,
      sumX2 = 0,
      sumY2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      sumXY += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }
    const denom = Math.sqrt(sumX2 * sumY2);
    return denom === 0
      ? "#DIV/0!"
      : String(Math.round((sumXY / denom) * 1e10) / 1e10);
  }

  // FORECAST(x, known_y, known_x)
  if (expr.startsWith("FORECAST(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const targetX = getNumResolved(args[0]);
      const yVals = args[1].trim().includes(":")
        ? expandRange(args[1].trim()).map((r) => getNum(r))
        : [getNum(args[1].trim())];
      const xVals = args[2].trim().includes(":")
        ? expandRange(args[2].trim()).map((r) => getNum(r))
        : [getNum(args[2].trim())];
      const n = Math.min(xVals.length, yVals.length);
      if (n < 2) return "#N/A";
      const meanX = xVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
      const meanY = yVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
      let sumXY = 0,
        sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumXY += (xVals[i] - meanX) * (yVals[i] - meanY);
        sumX2 += (xVals[i] - meanX) ** 2;
      }
      if (sumX2 === 0) return "#DIV/0!";
      const slope = sumXY / sumX2;
      const intercept = meanY - slope * meanX;
      return String(Math.round((intercept + slope * targetX) * 100) / 100);
    }
  }

  // QUARTILE(range, quart)
  const quartM = expr.match(/^QUARTILE\((.+)\)$/);
  if (quartM) {
    const args = splitArgs(quartM[1]);
    const rangeStr = args[0]?.trim() ?? "";
    const quart = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    if (quart < 0 || quart > 4) return "#NUM!";
    const vals = (
      rangeStr.includes(":")
        ? expandRange(rangeStr).map((r) => getNum(r))
        : [getNum(rangeStr)]
    ).sort((a, b) => a - b);
    if (vals.length === 0) return "0";
    const k = quart / 4;
    const rank = k * (vals.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) return String(vals[lower]);
    const frac = rank - lower;
    return String(vals[lower] + frac * (vals[upper] - vals[lower]));
  }

  // FREQUENCY(data_range, bins_range)
  if (expr.startsWith("FREQUENCY(") && expr.endsWith(")")) {
    const inner = expr.slice(10, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const data = args[0].trim().includes(":")
        ? expandRange(args[0].trim()).map((r) => getNum(r))
        : [getNum(args[0].trim())];
      const bins = args[1].trim().includes(":")
        ? expandRange(args[1].trim()).map((r) => getNum(r))
        : [getNum(args[1].trim())];
      bins.sort((a, b) => a - b);
      const freqs: number[] = new Array(bins.length + 1).fill(0);
      for (const val of data) {
        let placed = false;
        for (let i = 0; i < bins.length; i++) {
          if (val <= bins[i]) {
            freqs[i]++;
            placed = true;
            break;
          }
        }
        if (!placed) freqs[bins.length]++;
      }
      return freqs.join(",");
    }
  }

  // GEOMEAN(range)
  const geomeanM = expr.match(/^GEOMEAN\((.+)\)$/);
  if (geomeanM) {
    const vals = resolveArgs(geomeanM[1]);
    if (vals.length === 0 || vals.some((v) => v <= 0)) return "#NUM!";
    const product = vals.reduce((a, b) => a * b, 1);
    return String(Math.round(product ** (1 / vals.length) * 100000) / 100000);
  }

  // HARMEAN(range)
  const harmeanM = expr.match(/^HARMEAN\((.+)\)$/);
  if (harmeanM) {
    const vals = resolveArgs(harmeanM[1]);
    if (vals.length === 0 || vals.some((v) => v <= 0)) return "#NUM!";
    const sumReciprocals = vals.reduce((s, v) => s + 1 / v, 0);
    return String(Math.round((vals.length / sumReciprocals) * 100000) / 100000);
  }

  // TRIMMEAN(range, percent) — must come before TRIM
  if (expr.startsWith("TRIMMEAN(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1);
    const args = splitArgs(inner);
    const rangeStr = args[0]?.trim() ?? "";
    const percent = args[1] ? getNumResolved(args[1]) : 0;
    if (percent < 0 || percent >= 1) return "#NUM!";
    const vals = (
      rangeStr.includes(":")
        ? expandRange(rangeStr).map((r) => getNum(r))
        : [getNum(rangeStr)]
    ).sort((a, b) => a - b);
    const trimCount = Math.floor((vals.length * percent) / 2);
    const trimmed = vals.slice(trimCount, vals.length - trimCount);
    if (trimmed.length === 0) return "#NUM!";
    return String(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
  }

  // SLOPE(known_y, known_x)
  if (expr.startsWith("SLOPE(") && expr.endsWith(")")) {
    const inner = expr.slice(6, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const yVals = args[0].trim().includes(":")
        ? expandRange(args[0].trim()).map((r) => getNum(r))
        : [getNum(args[0].trim())];
      const xVals = args[1].trim().includes(":")
        ? expandRange(args[1].trim()).map((r) => getNum(r))
        : [getNum(args[1].trim())];
      const n = Math.min(xVals.length, yVals.length);
      if (n < 2) return "#N/A";
      const meanX = xVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
      const meanY = yVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
      let sumXY = 0,
        sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumXY += (xVals[i] - meanX) * (yVals[i] - meanY);
        sumX2 += (xVals[i] - meanX) ** 2;
      }
      if (sumX2 === 0) return "#DIV/0!";
      return String(Math.round((sumXY / sumX2) * 100000) / 100000);
    }
  }

  // INTERCEPT(known_y, known_x) — must come before INDIRECT
  if (expr.startsWith("INTERCEPT(") && expr.endsWith(")")) {
    const inner = expr.slice(10, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const yVals = args[0].trim().includes(":")
        ? expandRange(args[0].trim()).map((r) => getNum(r))
        : [getNum(args[0].trim())];
      const xVals = args[1].trim().includes(":")
        ? expandRange(args[1].trim()).map((r) => getNum(r))
        : [getNum(args[1].trim())];
      const n = Math.min(xVals.length, yVals.length);
      if (n < 2) return "#N/A";
      const meanX = xVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
      const meanY = yVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
      let sumXY = 0,
        sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumXY += (xVals[i] - meanX) * (yVals[i] - meanY);
        sumX2 += (xVals[i] - meanX) ** 2;
      }
      if (sumX2 === 0) return "#DIV/0!";
      const slope = sumXY / sumX2;
      return String(Math.round((meanY - slope * meanX) * 100000) / 100000);
    }
  }

  // ── Conditional Aggregation ─────────────────────────────

  // SUMIFS(sum_range, range1, criteria1, range2, criteria2, ...)
  if (expr.startsWith("SUMIFS(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const sumRefs = args[0].trim().includes(":")
        ? expandRange(args[0].trim())
        : [args[0].trim()];
      let sum = 0;
      for (let idx = 0; idx < sumRefs.length; idx++) {
        let allMatch = true;
        for (let p = 1; p + 1 < args.length; p += 2) {
          const critRange = args[p].trim().includes(":")
            ? expandRange(args[p].trim())
            : [args[p].trim()];
          const { op, val } = parseCriteria(args[p + 1].trim());
          const cellVal = idx < critRange.length ? getNum(critRange[idx]) : 0;
          if (!matchesCriteria(cellVal, op, val)) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) sum += getNum(sumRefs[idx]);
      }
      return String(sum);
    }
  }

  // SUMIF(range, criteria, sum_range)
  if (expr.startsWith("SUMIF(") && expr.endsWith(")")) {
    const inner = expr.slice(6, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const rangeRefs = args[0].trim().includes(":")
        ? expandRange(args[0].trim())
        : [args[0].trim()];
      const { op, val: critVal } = parseCriteria(args[1].trim());
      const sumRangeRefs = args[2]
        ? args[2].trim().includes(":")
          ? expandRange(args[2].trim())
          : [args[2].trim()]
        : rangeRefs;

      let sum = 0;
      for (let i = 0; i < rangeRefs.length; i++) {
        const cellVal = getNum(rangeRefs[i]);
        if (matchesCriteria(cellVal, op, critVal)) {
          sum += i < sumRangeRefs.length ? getNum(sumRangeRefs[i]) : 0;
        }
      }
      return String(sum);
    }
  }

  // COUNTIFS(range1, criteria1, range2, criteria2, ...)
  if (expr.startsWith("COUNTIFS(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const firstRange = args[0].trim().includes(":")
        ? expandRange(args[0].trim())
        : [args[0].trim()];
      let count = 0;
      for (let idx = 0; idx < firstRange.length; idx++) {
        let allMatch = true;
        for (let p = 0; p + 1 < args.length; p += 2) {
          const critRange = args[p].trim().includes(":")
            ? expandRange(args[p].trim())
            : [args[p].trim()];
          const { op, val } = parseCriteria(args[p + 1].trim());
          const cellVal = idx < critRange.length ? getNum(critRange[idx]) : 0;
          if (!matchesCriteria(cellVal, op, val)) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) count++;
      }
      return String(count);
    }
  }

  // COUNTIF(range, criteria)
  if (expr.startsWith("COUNTIF(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const rangeRefs = args[0].trim().includes(":")
        ? expandRange(args[0].trim())
        : [args[0].trim()];
      const { op, val: critVal } = parseCriteria(args[1].trim());

      let count = 0;
      for (const ref of rangeRefs) {
        const cellVal = getNum(ref);
        if (matchesCriteria(cellVal, op, critVal)) count++;
      }
      return String(count);
    }
  }

  // AVERAGEIFS(avg_range, range1, criteria1, ...)
  if (expr.startsWith("AVERAGEIFS(") && expr.endsWith(")")) {
    const inner = expr.slice(11, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const avgRefs = args[0].trim().includes(":")
        ? expandRange(args[0].trim())
        : [args[0].trim()];
      let sum = 0;
      let count = 0;
      for (let idx = 0; idx < avgRefs.length; idx++) {
        let allMatch = true;
        for (let p = 1; p + 1 < args.length; p += 2) {
          const critRange = args[p].trim().includes(":")
            ? expandRange(args[p].trim())
            : [args[p].trim()];
          const { op, val } = parseCriteria(args[p + 1].trim());
          const cellVal = idx < critRange.length ? getNum(critRange[idx]) : 0;
          if (!matchesCriteria(cellVal, op, val)) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) {
          sum += getNum(avgRefs[idx]);
          count++;
        }
      }
      return count > 0 ? String(sum / count) : "#DIV/0!";
    }
  }

  // AVERAGEIF(range, criteria, average_range)
  if (expr.startsWith("AVERAGEIF(") && expr.endsWith(")")) {
    const inner = expr.slice(10, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const rangeRefs = args[0].trim().includes(":")
        ? expandRange(args[0].trim())
        : [args[0].trim()];
      const { op, val: critVal } = parseCriteria(args[1].trim());
      const avgRefs = args[2]
        ? args[2].trim().includes(":")
          ? expandRange(args[2].trim())
          : [args[2].trim()]
        : rangeRefs;
      let sum = 0;
      let count = 0;
      for (let i = 0; i < rangeRefs.length; i++) {
        if (matchesCriteria(getNum(rangeRefs[i]), op, critVal)) {
          sum += i < avgRefs.length ? getNum(avgRefs[i]) : 0;
          count++;
        }
      }
      return count > 0 ? String(sum / count) : "#DIV/0!";
    }
  }

  return null;
}
