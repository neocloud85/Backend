import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Necesario para __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBJECTS = [
  "Fiction",
  "Science",
  "History",
  "Religion",
  "Education",
  "Art",
  "Biography & Autobiography",
  "Business & Economics",
  "Computers",
  "Cooking",
  "Drama",
  "Family & Relationships",
  "Health & Fitness",
  "Humor",
  "Juvenile Fiction",
  "Juvenile Nonfiction",
  "Law",
  "Mathematics",
  "Medical",
  "Music",
  "Nature",
  "Performing Arts",
  "Pets",
  "Philosophy",
  "Photography",
  "Poetry",
  "Political Science",
  "Psychology",
  "Reference",
  "Self-Help",
  "Social Science",
  "Sports & Recreation",
  "Technology & Engineering",
  "Transportation",
  "Travel"
];

const BASE_URL = "https://books.google.com/books";

async function scrapSubject(subject) {
  const url = `${BASE_URL}?subject=${encodeURIComponent(subject)}`;
  console.log("Scrapeando:", subject);

  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const categorias = new Set();

  $("a, span").each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    if (text.length < 3) return;
    if (/^\d+$/.test(text)) return;

    if (text.includes("/")) {
      categorias.add(text);
    } else {
      categorias.add(`${subject} / ${text}`);
    }
  });

  return [...categorias];
}

async function main() {
  const globalSet = new Set();

  for (const subject of SUBJECTS) {
    try {
      const cats = await scrapSubject(subject);
      cats.forEach(c => globalSet.add(c));
      await new Promise(r => setTimeout(r, 1000)); // evitar bloqueo
    } catch (err) {
      console.log("Error con subject", subject, err.message);
    }
  }

  const categorias = [...globalSet].sort();

  const outPath = path.join(__dirname, "..", "data", "categorias.json");
  fs.writeFileSync(outPath, JSON.stringify(categorias, null, 2), "utf-8");

  console.log("Guardadas", categorias.length, "categorías en", outPath);
}

main();
