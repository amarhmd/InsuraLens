import { extractZonesFromSummary } from './src/lib/summaryZones.ts';

const summary1136 = "Severe front‑end damage concentrated on the right‑hand side (viewer’s left). The front bumper cover is crushed, cracked, and dislodged; the hood is buckled, creased, and misaligned over the grille; the front grille is distorted inward; the front‑right headlight assembly is dislodged and its frame crushed; the front‑right fender edge is scratched and buckled where it meets the headlight and bumper; the license plate is twisted and partially detached. The visible damage indicates significant structural deformation and plastic tearing, consistent with a high‑energy rear‑end collision.";

const summary1145 = "The vehicle exhibits severe front-end damage with extensive deformation of the hood, bumper, grille, headlight, and fender, accompanied by a bent front license plate. The visible damage is consistent with a high-impact collision at the front of the vehicle.";

console.log('1136 zones:');
console.log(extractZonesFromSummary(summary1136));

console.log('\n1145 zones:');
console.log(extractZonesFromSummary(summary1145));
