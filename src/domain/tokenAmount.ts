/** Exact token-unit helpers. Never use JS floating point for financial amounts. */
export function parseTokenAmount(input: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("decimals must be an integer between 0 and 255");
  }
  const value = input.trim();
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) throw new Error("Invalid token amount");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`Amount has more than ${decimals} decimal places`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

export function formatTokenAmount(amount: bigint, decimals: number, maxFractionDigits = decimals): string {
  if (amount < 0n) throw new RangeError("amount must be non-negative");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new RangeError("invalid decimals");
  if (!Number.isInteger(maxFractionDigits) || maxFractionDigits < 0 || maxFractionDigits > decimals) throw new RangeError("invalid maxFractionDigits");
  if (decimals === 0) return amount.toString();
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
