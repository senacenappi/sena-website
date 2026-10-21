// Builds the public site into dist/.
// Reads the content Sena edits (content/works/*.json, content/site.json),
// shrinks every photo she uploaded to web size, and writes the finished pages.
// Netlify runs this automatically after every save in the editor.

import { readFile, writeFile, readdir, mkdir, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(ROOT, "dist");
const LARGE = 1800; // longest edge for the main view and the expanded view
const SMALL = 760;  // longest edge for thumbnails and the detail strip

const warnings = [];
const warn = msg => { warnings.push(msg); console.warn("⚠ " + msg); };

const readJSON = async file => JSON.parse(await readFile(file, "utf8"));
const paragraphs = s => String(s || "")
  .replace(/\r\n/g, "\n")
  .split(/\n\s*\n/)
  .map(p => p.replace(/\s*\n\s*/g, " ").trim())
  .filter(Boolean);

// Photo processing, cached per source file so each photo is resized once per build
const done = new Map();
async function photo(ref, label){
  if (!ref) return null;
  const rel = String(ref).replace(/^\/+/, "");
  const src = path.join(ROOT, rel);
  if (!existsSync(src)) { warn(`${label}: photo not found (${ref}). It was left out.`); return null; }
  if (done.has(src)) return done.get(src);
  const buf = await readFile(src);
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 8);
  const base = path.basename(rel).replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const out = { img: `img/${base}-${hash}.jpg`, thumb: `img/${base}-${hash}-s.jpg`, w: 0, h: 0 };
  try {
    const make = size => sharp(buf).rotate().flatten({ background: "#ffffff" })
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: size === LARGE ? 82 : 78, progressive: true, mozjpeg: true });
    const large = await make(LARGE).toFile(path.join(DIST, out.img));
    await make(SMALL).toFile(path.join(DIST, out.thumb));
    out.w = large.width; out.h = large.height;
  } catch (e) {
    warn(`${label}: couldn't read the photo ${ref} (${e.message}). Upload it again as JPG or PNG.`);
    return null;
  }
  done.set(src, out);
  return out;
}

async function main(){
  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, "img"), { recursive: true });

  const site = await readJSON(path.join(ROOT, "content/site.json"));
  const dir = path.join(ROOT, "content/works");
  const files = (await readdir(dir)).filter(f => f.endsWith(".json")).sort();

  const raw = [];
  for (const f of files) {
    try { raw.push({ file: f, ...(await readJSON(path.join(dir, f))) }); }
    catch (e) { warn(`${f}: couldn't be read (${e.message}). It was left out.`); }
  }

  const visible = raw
    .filter(w => !w.hide)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.title).localeCompare(String(b.title)));

  const works = [];
  for (const w of visible) {
    const label = w.title || w.file;
    const main = await photo(w.image, label);
    if (!main) { warn(`${label}: has no main photo, so it isn't shown on the site yet.`); continue; }
    const detailRefs = Array.isArray(w.details) ? w.details : (w.details ? [w.details] : []);
    const details = [];
    for (const d of detailRefs) { const p = await photo(d, `${label} (detail)`); if (p) details.push(p); }
    works.push({
      n: works.length + 1,
      title: String(w.title || "Untitled"),
      titleKo: String(w.title_ko || ""),
      year: String(w.year || ""),
      medium: String(w.medium || ""),
      dimsIn: String(w.dimensions || ""),
      dimsCm: String(w.dimensions_cm || ""),
      en: paragraphs(w.statement_en),
      ko: paragraphs(w.statement_ko),
      img: main.img, thumb: main.thumb, w: main.w, h: main.h,
      details
    });
  }

  const years = works.map(w => parseInt(w.year, 10)).filter(Boolean);
  const range = years.length ? (Math.min(...years) === Math.max(...years) ? `${Math.min(...years)}` : `${Math.min(...years)}–${Math.max(...years)}`) : "";
  const name = String(site.name || "Artist");
  const siteData = {
    name,
    about: paragraphs(site.about),
    cv: (Array.isArray(site.cv) ? site.cv : []).map(s => ({
      heading: String(s.heading || ""),
      entries: (Array.isArray(s.entries) ? s.entries : []).map(e => ({ year: String(e.year || ""), text: String(e.text || "") })).filter(e => e.year || e.text)
    })).filter(s => s.heading || s.entries.length),
    contactIntro: String(site.contact_intro || ""),
    email: String(site.email || "").trim(),
    instagram: String(site.instagram || "").trim().replace(/^@/, ""),
    range
  };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const inline = v => JSON.stringify(v).replace(/</g, "\\u003c");
  const fill = html => html
    .replaceAll("{{name}}", esc(name))
    .replaceAll("{{description}}", esc(site.description || ""))
    .replaceAll("{{year}}", String(new Date().getFullYear()))
    .replaceAll("{{range}}", esc(range ? `Works ${range}` : ""))
    .replaceAll("{{ogimage}}", works[0] ? works[0].img : "");

  const page = fill(await readFile(path.join(ROOT, "src/index.html"), "utf8"))
    .replace("__WORKS__", inline(works))
    .replace("__SITE__", inline(siteData));
  await writeFile(path.join(DIST, "index.html"), page);

  await mkdir(path.join(DIST, "edit"), { recursive: true });
  await writeFile(path.join(DIST, "edit/index.html"), fill(await readFile(path.join(ROOT, "src/edit.html"), "utf8")));
  if (existsSync(path.join(ROOT, "src/_headers"))) await copyFile(path.join(ROOT, "src/_headers"), path.join(DIST, "_headers"));

  console.log(`Built ${works.length} works with ${done.size} photos.`);
  if (warnings.length) console.log(`${warnings.length} warning(s) above. The site was still published.`);
}

main().catch(e => { console.error(e); process.exit(1); });
