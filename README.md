# Radar Tech Mondial

Tableau de bord de veille mondiale : actualités technologiques, industrielles et de défense, filtrables par pays et par catégorie (Innovation / Défense / Industrie), avec un réseau d'acteurs (entreprises co-citées dans une même actualité) et un suivi des tendances du moment.

**Démo en ligne :** https://NicolasMRSN.github.io/radar-tech-mondial/

## Contenu

- `index.html` — page statique autonome (React + d3 chargés via CDN, JSX transpilé dans le navigateur avec Babel standalone, runtime JSX classique forcé explicitement). Aucune étape de build requise.
- `dashboard-source.jsx` — le composant source, identique à celui utilisé comme artefact dans Claude.ai.
- `scripts/refresh-news.mjs` — script exécuté par la GitHub Action ci-dessous.
- `.github/workflows/refresh-news.yml` — automatisation planifiée qui met à jour `news.json`.
- `news.json` — instantané généré automatiquement (absent tant que l'automatisation n'a pas tourné une première fois ; le site fonctionne très bien sans, avec les données de départ).

## Comment fonctionne la mise à jour automatique

Le bouton « Actualiser » et le chargement de la page suivent cette logique :

1. **Pont direct Claude.ai** (uniquement dans l'environnement artefact Claude.ai) : recherche web en direct, sans clé API, grâce à un pont spécifique aux artefacts.
2. **Repli : `news.json`** (fonctionne partout, y compris ici en public) : la page relit ce fichier, généré par une GitHub Action planifiée qui tourne deux fois par jour et le committe dans le repo. Comme GitHub Pages se redéploie à chaque commit, chaque nouvelle génération est visible par les visiteurs dès leur prochain chargement de page.

C'est la seule façon sûre de faire une "vraie" mise à jour en direct sans exposer de clé API dans le code d'un site public : la clé reste côté serveur (GitHub Actions), jamais dans le navigateur.

## Activer la mise à jour automatique (une seule étape, à faire toi-même)

1. Crée une clé API sur https://console.anthropic.com/settings/keys
2. Dans ce repo : **Settings → Secrets and variables → Actions → New repository secret**
3. Nom : `ANTHROPIC_API_KEY` — colle la clé dans le champ valeur (elle sera chiffrée, jamais visible dans les logs ni le code)
4. C'est tout. La prochaine exécution planifiée (ou un déclenchement manuel via l'onglet **Actions → Refresh news snapshot → Run workflow**) mettra à jour `news.json`.

⚠️ **Ne jamais coller cette clé ailleurs** (chat, issue, commit, fichier du repo) — uniquement dans le formulaire de secret GitHub, qui est fait pour ça.

Sans ce secret, le workflow tourne mais s'arrête proprement (aucune erreur bruyante) et le site continue d'afficher les données de départ.

### Ajuster la fréquence / le coût

Chaque exécution consomme un peu de crédit API (un appel Claude avec recherche web). La fréquence par défaut (`0 6,18 * * *`, deux fois par jour) est modifiable dans `.github/workflows/refresh-news.yml` — passe par exemple à `0 6 * * *` pour une fois par jour.

## Sourcing

Chaque article du jeu de données de départ est tiré d'un vrai média (L'Usine Nouvelle, Zone Militaire/Opex360, The Verge, Breaking Defense, TechCrunch, Crunchbase News, Reuters/Al Jazeera, Aviation Week, SCMP, TechWire Asia, DigiTimes, RoboticsTomorrow, Zone Armée, Aeroflap, Zonebourse, La Libre, SPA, L'Essentiel de l'Éco, War on the Rocks, Türkiye Today, Canada.ca, Africa News Agency, Le Desk, etc.) et pointe vers l'article réel via son titre cliquable. Ce n'est **pas un classement de pays** — c'est un échantillon de démonstration ; n'importe quel écosystème national peut être ajouté, manuellement ou via l'automatisation.

## Licence

Contenu fourni à titre informatif ; chaque résumé est une reformulation, pas une reproduction du texte source. Se référer aux liens cités pour les articles originaux.

