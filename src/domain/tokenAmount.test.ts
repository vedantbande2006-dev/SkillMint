import { describe, expect, it } from "vitest";
import { formatTokenAmount, parseTokenAmount } from "./tokenAmount";

describe("exact token amounts", () => {
  it("parses whole and fractional amounts without floating point", () => {
    expect(parseTokenAmount("12.3401", 6)).toBe(12340100n);
  });
  it("rejects excess decimal places", () => {
    expect(() => parseTokenAmount("1.0000001", 6)).toThrow();
  });
  it("rejects scientific notation and negative amounts", () => {
    expect(() => parseTokenAmount("1e3", 18)).toThrow();
    expect(() => parseTokenAmount("-1", 18)).toThrow();
  });
  it("formats a base-unit amount exactly", () => {
    expect(formatTokenAmount(12340100n, 6)).toBe("12.3401");
  });
});
