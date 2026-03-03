import { getNum, registerFormula, splitTopLevelArgs } from "./registry";
import { expandRange, parseRef } from "../cell-refs";

function resolveArg(
  arg: string,
  ctx: import("./registry").FormulaContext,
): number {
  const trimmed = arg.trim();
  if (parseRef(trimmed)) return getNum(trimmed, ctx);
  const n = Number.parseFloat(trimmed);
  return Number.isNaN(n) ? 0 : n;
}

// PMT(rate, nper, pv, [fv], [type])
// Calculates periodic payment for a loan
registerFormula("PMT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const rate = resolveArg(args[0], ctx);
  const nper = resolveArg(args[1], ctx);
  const pv = resolveArg(args[2], ctx);
  const fv = args.length > 3 ? resolveArg(args[3], ctx) : 0;
  const type = args.length > 4 ? resolveArg(args[4], ctx) : 0;

  if (nper === 0) return "#ERROR";
  if (rate === 0) {
    return String(-(pv + fv) / nper);
  }
  const pvif = (1 + rate) ** nper;
  const pmt = (rate * (pv * pvif + fv)) / (pvif - 1);
  return String(type ? -pmt / (1 + rate) : -pmt);
});

// FV(rate, nper, pmt, [pv], [type])
// Future value of an investment
registerFormula("FV", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const rate = resolveArg(args[0], ctx);
  const nper = resolveArg(args[1], ctx);
  const pmt = resolveArg(args[2], ctx);
  const pv = args.length > 3 ? resolveArg(args[3], ctx) : 0;
  const type = args.length > 4 ? resolveArg(args[4], ctx) : 0;

  if (rate === 0) {
    return String(-(pv + pmt * nper));
  }
  const pvif = (1 + rate) ** nper;
  const fvResult = -(pv * pvif + (pmt * (1 + rate * type) * (pvif - 1)) / rate);
  return String(fvResult);
});

// PV(rate, nper, pmt, [fv], [type])
// Present value
registerFormula("PV", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const rate = resolveArg(args[0], ctx);
  const nper = resolveArg(args[1], ctx);
  const pmt = resolveArg(args[2], ctx);
  const fv = args.length > 3 ? resolveArg(args[3], ctx) : 0;
  const type = args.length > 4 ? resolveArg(args[4], ctx) : 0;

  if (rate === 0) {
    return String(-(fv + pmt * nper));
  }
  const pvif = (1 + rate) ** nper;
  const pvResult = -(fv + (pmt * (1 + rate * type) * (pvif - 1)) / rate) / pvif;
  return String(pvResult);
});

// NPV(rate, value1, [value2], ...)
// Net present value
registerFormula("NPV", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const rate = resolveArg(args[0], ctx);
  if (rate === -1) return "#ERROR";

  let npv = 0;
  let period = 1;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i].trim();
    if (arg.includes(":")) {
      for (const ref of expandRange(arg)) {
        npv += getNum(ref, ctx) / (1 + rate) ** period;
        period++;
      }
    } else {
      npv += resolveArg(arg, ctx) / (1 + rate) ** period;
      period++;
    }
  }
  return String(npv);
});

// IRR(values, [guess])
// Internal rate of return using Newton-Raphson
registerFormula("IRR", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";

  // Collect cash flow values from first arg (range or individual values)
  const values: number[] = [];
  const firstArg = args[0].trim();
  if (firstArg.includes(":") && parseRef(firstArg.split(":")[0])) {
    for (const ref of expandRange(firstArg)) {
      values.push(getNum(ref, ctx));
    }
  } else {
    // Multiple individual values — all args except optional guess
    const valueArgs = args.length > 1 && !args[args.length - 1].trim().includes(":") && !parseRef(args[args.length - 1].trim())
      ? args.slice(0, -1)
      : args;
    for (const a of valueArgs) {
      const trimmed = a.trim();
      if (trimmed.includes(":") && parseRef(trimmed.split(":")[0])) {
        for (const ref of expandRange(trimmed)) {
          values.push(getNum(ref, ctx));
        }
      } else {
        values.push(resolveArg(trimmed, ctx));
      }
    }
  }

  if (values.length < 2) return "#ERROR";

  // Newton-Raphson iteration — guess is the last non-range arg (default 0.1)
  let rate = 0.1;
  if (args.length > 1) {
    const lastArg = args[args.length - 1].trim();
    if (!lastArg.includes(":") && !parseRef(lastArg)) {
      const guessVal = Number.parseFloat(lastArg);
      if (!Number.isNaN(guessVal)) rate = guessVal;
    }
  }
  const maxIter = 100;
  const tolerance = 1e-7;

  for (let iter = 0; iter < maxIter; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let i = 0; i < values.length; i++) {
      const factor = (1 + rate) ** i;
      npv += values[i] / factor;
      dnpv -= (i * values[i]) / (1 + rate) ** (i + 1);
    }
    if (Math.abs(dnpv) < 1e-12) return "#ERROR";
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < tolerance) {
      return String(Number.parseFloat(newRate.toFixed(10)));
    }
    rate = newRate;
  }
  return "#ERROR"; // Did not converge
});

// RATE(nper, pmt, pv, [fv], [type], [guess])
registerFormula("RATE", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const nper = resolveArg(args[0], ctx);
  const pmt = resolveArg(args[1], ctx);
  const pv = resolveArg(args[2], ctx);
  const fv = args.length > 3 ? resolveArg(args[3], ctx) : 0;
  const type = args.length > 4 ? resolveArg(args[4], ctx) : 0;
  let guess = args.length > 5 ? resolveArg(args[5], ctx) : 0.1;

  const maxIter = 100;
  const tolerance = 1e-7;

  for (let iter = 0; iter < maxIter; iter++) {
    if (guess === 0) {
      const y = pv + pmt * nper + fv;
      if (Math.abs(y) < tolerance) return "0";
      guess = 0.01;
    }
    const pvif = (1 + guess) ** nper;
    const y = pv * pvif + (pmt * (1 + guess * type) * (pvif - 1)) / guess + fv;
    const dy =
      nper * pv * (1 + guess) ** (nper - 1) +
      (pmt *
        (1 + guess * type) *
        (nper * (1 + guess) ** (nper - 1) * guess - (pvif - 1))) /
        (guess * guess) +
      (type ? (pmt * (pvif - 1)) / guess : 0);
    if (Math.abs(dy) < 1e-12) return "#ERROR";
    const newGuess = guess - y / dy;
    if (Math.abs(newGuess - guess) < tolerance) {
      return String(Number.parseFloat(newGuess.toFixed(10)));
    }
    guess = newGuess;
  }
  return "#ERROR";
});
