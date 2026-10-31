import { describe, expect, it } from "vitest";
import { transitionTask } from "./task";

describe("task state machine", () => {
  it("allows a client to publish a draft", () => {
    expect(transitionTask("DRAFT", "CLIENT", "OPEN")).toBe("OPEN");
  });
  it("rejects worker approval", () => {
    expect(() => transitionTask("SUBMITTED", "WORKER", "APPROVED")).toThrow();
  });
  it("rejects reopening a completed task", () => {
    expect(() => transitionTask("COMPLETED", "CLIENT", "OPEN")).toThrow();
  });
});