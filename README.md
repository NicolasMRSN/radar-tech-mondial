# Radar Tech Mondial

Tableau de bord de veille mondiale : actualités technologiques, industrielles et de défense, filtrables par pays et par catégorie (Innovation / Défense / Industrie), avec un réseau d'acteurs (entreprises co-citées dans une même actualité) et un suivi des tendances du moment.

**Démo en ligne :** https://NicolasMRSN.github.io/radar-tech-mondial/

## Contenu

- `index.html` — page statique autonome (React + d3 chargés via CDN, JSX transpilé dans le navigateur avec Babel standalone). Aucune étape de build requise, aucune dépendance serveur.
- `dashboard-source.jsx` — le composant source, tel qu'utilisé comme artefact dans Claude.ai.

## Sourcing

Chaque article du jeu de données de départ est tiré d'un vrai média (L'Usine Nouvelle, Zone Militaire/Opex360, The Verge, Breaking Defense, TechCrunch, Crunchbase News, Reuters/Al Jazeera, Aviation Week, SCMP, TechWire Asia, DigiTimes, RoboticsTomorrow, Zone Armée, Aeroflap, Zonebourse, La Libre, SPA, L'Essentiel de l'Éco, War on the Rocks, Türkiye Today, Canada.ca, Africa News Agency, Le Desk, etc.) et pointe vers l'article réel via son titre cliquable. Ce n'est **pas un classement de pays** — c'est un échantillon de démonstration ; n'importe quel écosystème national peut être ajouté.

## À propos du bouton « Actualiser »

Dans l'environnement Claude.ai (artefact), ce bouton interroge directement l'API Anthropic avec recherche web activée, sans clé API, grâce au pont spécifique aux artefacts Claude. **Cette capacité n'existe pas sur un site statique public comme celui-ci** : le bouton reste présent pour cohérence avec la version artefact, mais affichera un message expliquant que la recherche en direct nécessite l'environnement Claude.ai. Le contenu affiché ici est donc un instantané éditorial, pas un flux temps réel.

## Licence

Contenu fourni à titre informatif ; chaque résumé est une reformulation, pas une reproduction du texte source. Se référer aux liens cités pour les articles originaux.
