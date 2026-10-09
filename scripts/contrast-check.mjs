/**
 * Contrast gate for the InsuraLens login page.
 *
 * WCAG 2.1 AA: 4.5:1 for text, 3:1 for large text (>=18.66px bold / >=24px)
 * and for non-text UI (borders, focus rings, icons). Disabled controls are
 * exempt but are still checked here against a relaxed floor so they stay
 * legible.
 *
 * Run: node scripts/contrast-check.mjs   (also wired to `npm run contrast`)
 */

const hex = (h) => {
  const v = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};

const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const lum = (h) => {
  const [r, g, b] = hex(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Pairs the page actually ships. Each must clear its minimum. */
const GATED = [
  ['Primary text / white', '#172B3A', '#FFFFFF', 4.5, 'heading, labels, input text'],
  ['Primary text / page', '#172B3A', '#F7F9FB', 4.5, 'heading on the auth column'],
  ['Secondary text / white', '#64748B', '#FFFFFF', 4.5, 'subheading, field hints'],
  ['Secondary text / page', '#64748B', '#F7F9FB', 4.5, 'footer, trust line'],

  ['White / primary button', '#FFFFFF', '#0F7F81', 4.5, 'Sign in, at rest'],
  ['White / primary hover', '#FFFFFF', '#0C6E70', 4.5, 'Sign in, :hover'],
  ['White / primary active', '#FFFFFF', '#0A6264', 4.5, 'Sign in, :active'],
  ['Link / white', '#0F7F81', '#FFFFFF', 4.5, 'Forgot password?'],
  ['Link hover / white', '#0C6E70', '#FFFFFF', 4.5, 'Forgot password?, :hover'],

  ['White / navy panel', '#FFFFFF', '#12304A', 4.5, 'brand statement, wordmark'],
  ['Muted / navy panel', '#A9BCD0', '#12304A', 4.5, 'brand supporting text'],
  ['White logo tile / navy', '#FFFFFF', '#12304A', 3.0, 'tile edge against the panel'],

  ['Error text / white', '#B42318', '#FFFFFF', 4.5, 'field error message'],
  ['Error text / error tint', '#B42318', '#FEF3F2', 4.5, 'form-level notice'],
  ['Disabled label / disabled fill', '#64748B', '#E2E8F0', 3.0, 'Sign in, empty form'],

  // Non-text UI — 3:1
  ['Focus ring / white', '#159A9C', '#FFFFFF', 3.0, 'input focus indicator'],
  ['Focus ring / page', '#159A9C', '#F7F9FB', 3.0, 'button focus indicator'],
  ['Error border / white', '#D92D20', '#FFFFFF', 3.0, 'invalid input border'],
  ['Brand panel / auth column', '#12304A', '#F7F9FB', 3.0, 'layout edge'],
  ['Teal stroke / navy panel', '#159A9C', '#12304A', 3.0, 'abstract visual, brand teal'],
  ['Slate stroke / navy panel', '#4C6FFF', '#12304A', 3.0, 'abstract visual, slate blue'],
];

/** Measurements that document a decision rather than enforce one. */
const INFO = [
  ['Logo ink / white tile', '#0E544C', '#FFFFFF', 'the mark, where it is meant to sit'],
  [
    'Logo ink / navy panel',
    '#0E544C',
    '#12304A',
    'WHY THE TILE EXISTS: 95% of the mark is #0E544C, which vanishes on navy',
  ],
  ['Brand teal / white, as text', '#159A9C', '#FFFFFF', 'why links and the button step to #0F7F81'],
  ['White / brand teal, as button', '#FFFFFF', '#159A9C', 'the brief literal, for reference'],
  ['Slate blue / white, as text', '#4C6FFF', '#FFFFFF', 'kept decorative, never used for words'],
];

let failed = 0;
const gated = GATED.map(([label, fg, bg, min, note]) => {
  const r = ratio(fg, bg);
  const pass = r >= min;
  if (!pass) failed++;
  return {
    pair: label,
    ratio: r.toFixed(2),
    min: min.toFixed(1),
    result: pass ? 'PASS' : 'FAIL',
    note,
  };
});

console.log('\nGated pairs — every one must meet its minimum\n');
console.table(gated);

console.log('\nMeasurements that explain a design decision\n');
console.table(
  INFO.map(([label, fg, bg, note]) => ({
    pair: label,
    ratio: ratio(fg, bg).toFixed(2),
    note,
  })),
);

if (failed) {
  console.error(`\n${failed} pair(s) below the required contrast.\n`);
  process.exit(1);
}
console.log('All gated pairs meet their minimum contrast.\n');
