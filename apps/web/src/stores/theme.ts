import { atom } from "jotai";

export type Theme = "dark" | "light";

/** Current color theme. Dark by default (Flight Console identity). */
export const themeAtom = atom<Theme>("dark");
