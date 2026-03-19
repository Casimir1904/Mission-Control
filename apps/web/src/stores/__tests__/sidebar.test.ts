import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { sidebarCollapsedAtom } from "../sidebar";

describe("sidebarCollapsedAtom", () => {
  it("has a default value of false (expanded)", () => {
    const store = createStore();
    expect(store.get(sidebarCollapsedAtom)).toBe(false);
  });

  it("can be set to true (collapsed)", () => {
    const store = createStore();
    store.set(sidebarCollapsedAtom, true);
    expect(store.get(sidebarCollapsedAtom)).toBe(true);
  });

  it("can toggle between collapsed and expanded", () => {
    const store = createStore();
    expect(store.get(sidebarCollapsedAtom)).toBe(false);

    store.set(sidebarCollapsedAtom, true);
    expect(store.get(sidebarCollapsedAtom)).toBe(true);

    store.set(sidebarCollapsedAtom, false);
    expect(store.get(sidebarCollapsedAtom)).toBe(false);
  });
});
