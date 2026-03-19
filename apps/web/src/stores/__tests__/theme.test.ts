import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { themeAtom, type Theme } from "../theme";

describe("themeAtom", () => {
  it("defaults to dark theme (Flight Console identity)", () => {
    const store = createStore();
    expect(store.get(themeAtom)).toBe("dark");
  });

  it("can be set to light theme", () => {
    const store = createStore();
    store.set(themeAtom, "light");
    expect(store.get(themeAtom)).toBe("light");
  });

  it("can be toggled back to dark theme", () => {
    const store = createStore();
    store.set(themeAtom, "light");
    expect(store.get(themeAtom)).toBe("light");

    store.set(themeAtom, "dark");
    expect(store.get(themeAtom)).toBe("dark");
  });

  it("accepts only valid Theme values", () => {
    const store = createStore();
    const validThemes: Theme[] = ["dark", "light"];
    for (const theme of validThemes) {
      store.set(themeAtom, theme);
      expect(store.get(themeAtom)).toBe(theme);
    }
  });
});
