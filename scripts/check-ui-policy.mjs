import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const ignored = new Set(["node_modules", "out", "test-results"]);
const files = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { if (ignored.has(entry.name) || entry.name.startsWith(".next")) continue; const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (/\.(tsx|jsx|ts|css)$/.test(entry.name)) files.push(full); } }
walk(path.join(root, "apps"));
const violations = [];
for (const file of files) { const rel = path.relative(root, file).replaceAll(path.sep, "/"); const text = fs.readFileSync(file, "utf8"); if (/<(?:button|input|textarea|select)\b/.test(text) && !rel.startsWith("apps/home/")) violations.push(rel + ": raw form control; use @nomos/ui"); if (/#[0-9a-f]{3,8}\b/i.test(text) && !rel.endsWith("globals.css")) violations.push(rel + ": hard-coded color; use semantic theme tokens"); if (/\b(?:mt|mb|ml|mr|p|px|py|gap|w|h|min-h|max-w)-\[[^\]]+\]/.test(text)) violations.push(rel + ": arbitrary Tailwind value; use platform spacing/layout primitives"); }
if (violations.length) { console.error("UI policy violations (" + violations.length + "):"); for (const v of violations) console.error("- " + v); process.exit(1); }
console.log("UI policy passed.");
