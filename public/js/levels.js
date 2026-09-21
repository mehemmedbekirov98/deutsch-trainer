// Aggregates all level content modules (generated per CONTENT_SCHEMA.md)
import l01 from "./content/level01.js";
import l02 from "./content/level02.js";
import l03 from "./content/level03.js";
import l04 from "./content/level04.js";
import l05 from "./content/level05.js";
import l06 from "./content/level06.js";
import l07 from "./content/level07.js";
import l08 from "./content/level08.js";
import l09 from "./content/level09.js";
import l10 from "./content/level10.js";
import l11 from "./content/level11.js";
import l12 from "./content/level12.js";
import l13 from "./content/level13.js";
import l14 from "./content/level14.js";
import l15 from "./content/level15.js";
import l16 from "./content/level16.js";
import l17 from "./content/level17.js";
import l18 from "./content/level18.js";
import l19 from "./content/level19.js";
import l20 from "./content/level20.js";
import l21 from "./content/level21.js";
import l22 from "./content/level22.js";
import l23 from "./content/level23.js";
import l24 from "./content/level24.js";
import l25 from "./content/level25.js";
import l26 from "./content/level26.js";
import l27 from "./content/level27.js";
import l28 from "./content/level28.js";
import l29 from "./content/level29.js";
import l30 from "./content/level30.js";
import l31 from "./content/level31.js";
import l32 from "./content/level32.js";
import l33 from "./content/level33.js";
import l34 from "./content/level34.js";
import l35 from "./content/level35.js";
import l36 from "./content/level36.js";

export const LEVELS = [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23, l24, l25, l26, l27, l28, l29, l30, l31, l32, l33, l34, l35, l36].sort((a, b) => a.id - b.id);
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

/** Split a level's exercises into 3 missions of (nearly) equal size, keeping order (easy → hard) */
export function missionsOf(level) {
  const ex = level.exercises;
  const n = 3;
  const size = Math.ceil(ex.length / n);
  return Array.from({ length: n }, (_, i) => ex.slice(i * size, (i + 1) * size)).filter((m) => m.length);
}
