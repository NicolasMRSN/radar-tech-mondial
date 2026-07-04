// Runs inside GitHub Actions. Calls the Anthropic API with the web_search
// tool using a repository secret (ANTHROPIC_API_KEY) — the key never touches
// the browser or the repo, only the Actions runner's environment.
//
// Output: news.json at the repo root, fetched by index.html at page load
// and by the "Actualiser" button's fallback path.

import fs from "node:fs";

const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.log("ANTHROPIC_API_KEY is not set as a repository secret yet — skipping refresh (not an error).");
  process.exit(0);
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const PROMPT = `Tu es un service de veille internationale. Cherche sur le web des actualités RÉCENTES (derniers jours) sur la technologie, l'innovation, l'industrie et la défense, partout dans le monde — ne te limite pas aux grandes puissances habituelles (France, États-Unis, Chine, Allemagne) : cherche aussi activement des actualités provenant d'Amérique latine, d'Afrique, d'Asie du Sud-Est, d'Europe de l'Est ou du Sud, du Moyen-Orient et d'Océanie.

Réponds EXCLUSIVEMENT avec un tableau JSON valide, sans texte autour, sans balises markdown ni \`\`\`. Chaque objet du tableau doit suivre exactement ce schéma :
{
  "country": "nom du pays en français",
  "flag": "emoji drapeau du pays",
  "category": "innovation" | "defense" | "industrie",
  "date": "date approximative en français",
  "source": "nom du média",
  "title": "titre factuel court, max 12 mots, en français",
  "summary": "résumé reformulé en français en 1-2 phrases, jamais recopié mot pour mot",
  "companies": ["2 à 5 entreprises ou organisations citées"],
  "trends": ["1 à 2 thèmes courts en français"],
  "url": "URL réelle de la page trouvée"
}

Renvoie entre 8 et 12 objets, avec au moins 6 pays différents et au moins une actualité de chaque catégorie (innovation, defense, industrie).`;

async function main() {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: PROMPT }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`API error ${resp.status}: ${body.slice(0, 1000)}`);
    process.exit(1);
  }

  const data = await resp.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    console.error("No JSON array found in the model response:\n" + text.slice(0, 1000));
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    console.error("Failed to parse JSON:", e.message);
    process.exit(1);
  }

  const existing = fs.existsSync("news.json")
    ? JSON.parse(fs.readFileSync("news.json", "utf8"))
    : { generated_at: null, items: [] };

  const seenUrls = new Set((existing.items || []).map((i) => i.url).filter(Boolean));
  const validCategories = new Set(["innovation", "defense", "industrie"]);
  const base = Date.now();

  const freshItems = parsed
    .filter((it) => it && it.title && it.url && validCategories.has(it.category) && !seenUrls.has(it.url))
    .map((it, i) => ({
      id: base + i,
      country: it.country || "Inconnu",
      flag: it.flag || "🌐",
      category: it.category,
      date: it.date || "récemment",
      source: it.source || "Web",
      title: String(it.title),
      summary: it.summary ? String(it.summary) : "",
      companies: Array.isArray(it.companies) ? it.companies.slice(0, 6).map(String) : [],
      trends: Array.isArray(it.trends) ? it.trends.slice(0, 2).map(String) : [],
      url: it.url,
    }));

  // Keep the file bounded so it doesn't grow forever.
  const merged = [...freshItems, ...(existing.items || [])].slice(0, 250);

  fs.writeFileSync(
    "news.json",
    JSON.stringify({ generated_at: new Date().toISOString(), items: merged }, null, 2) + "\n"
  );

  console.log(`Added ${freshItems.length} new item(s). Total now ${merged.length}.`);
}

main().catch((e) => {
  console.error("Unexpected failure:", e);
  process.exit(1);
});
