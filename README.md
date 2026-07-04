# Radar Tech Mondial

Tableau de bord de veille mondiale : actualités technologiques, industrielles et de défense, filtrables par pays et par catégorie (Innovation / Défense / Industrie), avec un réseau d'acteurs (entreprises co-citées dans une même actualité) et un suivi des tendances du moment.

**Démo en ligne :** https://NicolasMRSN.github.io/radar-tech-mondial/

## Contenu

- `index.html` — page statique autonome (React + d3 chargés via CDN, JSX transpilé dans le navigateur avec Babel standalone, runtime JSX classique forcé explicitement). Aucune étape de build requise.
- `dashboard-source.jsx` — le composant source, identique à celui utilisé comme artefact dans Claude.ai.

## Comment ça se met à jour

Ce site est un **instantané publié à la main**, pas un flux automatique :

- Pas de clé API stockée nulle part, pas de coût récurrent, pas de GitHub Action planifiée.
- Pour obtenir des données plus récentes : ouvre une conversation avec Claude (couvert par un abonnement Claude.ai classique, Pro ou autre — aucun coût API séparé), demande-lui de rechercher l'actualité et de mettre à jour le tableau de bord, puis de republier `index.html` sur ce repo.
- Le bouton « Actualiser » dans l'interface ne fonctionne que **dans une conversation Claude.ai** (il utilise un pont de recherche web propre aux artefacts, sans clé API). Sur ce site public, cliquer dessus affiche un message qui l'explique clairement plutôt que d'échouer en silence.

On a délibérément écarté l'option d'une automatisation côté serveur (GitHub Action + clé API perso) : elle aurait fonctionné, mais aurait généré un coût récurrent sur un compte Anthropic Console séparé de l'abonnement Claude.ai — non couvert par un abonnement Pro/Max. Demander une mise à jour manuelle à Claude de temps en temps est gratuit et suffisant pour ce type de contenu.

## Sourcing

Chaque article du jeu de données est tiré d'un vrai média (L'Usine Nouvelle, Zone Militaire/Opex360, The Verge, Breaking Defense, TechCrunch, Crunchbase News, Reuters/Al Jazeera, Aviation Week, SCMP, TechWire Asia, DigiTimes, RoboticsTomorrow, Zone Armée, Aeroflap, Zonebourse, La Libre, SPA, L'Essentiel de l'Éco, War on the Rocks, Türkiye Today, Canada.ca, Africa News Agency, Le Desk, etc.) et pointe vers l'article réel via son titre cliquable. Ce n'est **pas un classement de pays** — c'est un échantillon de démonstration ; n'importe quel écosystème national peut être ajouté à la demande.

## Licence

Contenu fourni à titre informatif ; chaque résumé est une reformulation, pas une reproduction du texte source. Se référer aux liens cités pour les articles originaux.
