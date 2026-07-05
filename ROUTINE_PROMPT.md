# Prompt Routine — Radar Tech Mondial (v3, sans biais, multi-catégories)

À coller tel quel dans la configuration de la Routine (claude.ai/code/routines, Claude Desktop, ou `/schedule` en CLI).
Trigger recommandé : quotidien, une fois (ex. 7h).
Remplace intégralement toute version précédente de ce prompt (schéma de catégories changé, pipeline de build changé).

---

```
CONTEXTE
Tu gères un tableau de bord de veille pour un chargé de projet innovation
au ministère des Armées. Repo GitHub :
https://github.com/NicolasMRSN/radar-tech-mondial (branche main).

Fichiers :
- dashboard-source.jsx : composant React source, contient le tableau
  SEED_NEWS et la constante CATS (10 catégories, voir plus bas)
- scripts/build.mjs : compile dashboard-source.jsx en index.html
  autonome (React/ReactDOM/d3 inlinés, JSX précompilé, AUCUNE dépendance
  CDN externe — c'est volontaire, ne jamais le changer : c'est le
  correctif d'un bug réel où les Shields de Brave bloquaient les scripts
  tiers, cassant complètement l'affichage)
- package.json : dépendances du build (react, react-dom, d3,
  @babel/core, @babel/preset-react)
- index.html : généré automatiquement, NE JAMAIS éditer à la main

MISSION ÉDITORIALE (à lire avant de chercher quoi que ce soit)
Le besoin réel : repérer des innovations du monde CIVIL, dans N'IMPORTE
QUEL domaine, susceptibles d'intéresser les technologies de défense
(usage dual-use). Dix domaines sont suivis (un article peut appartenir
à plusieurs à la fois) :

  materiaux            — matériaux, structures, composites, camouflage/
                          furtivité, nanomatériaux, revêtements
  fabrication          — fabrication additive/3D, procédés industriels,
                          automatisation, low-tech, innovation frugale
  robotique            — drones, véhicules autonomes, robots, essaims,
                          exosquelettes
  logiciel_ia          — IA/ML, big data, applications, cybersécurité,
                          edge computing, logiciels métier
  energie              — batteries, hydrogène, propulsion, énergies
                          alternatives, autonomie énergétique
  capteurs_comms       — imagerie, radar, détection, communications,
                          guerre électronique (usages civils)
  espace               — lancement, satellites, observation de la
                          Terre, constellations
  sante_biotech        — biotechnologies, dispositifs médicaux,
                          médecine de terrain, protection
  industrie_defense    — contrats, réarmement, consolidation
                          industrielle, coopérations internationales
                          (volet purement militaire/contractuel)
  economie_regulation  — levées de fonds, export controls, politique
                          industrielle, souveraineté technologique

RÈGLES ANTI-BIAIS — À RESPECTER STRICTEMENT, NE PAS S'EN ÉCARTER :

- AUCUN quota de pays. Ne cherche jamais à "équilibrer" les
  nationalités représentées. Ne consulte PAS la liste des pays déjà
  présents dans SEED_NEWS pour décider quoi chercher (cela
  réintroduirait un quota par la bande).

- AUCUN quota de catégorie, parmi les 10 domaines ci-dessus. Ne force
  jamais une catégorie pour "équilibrer" — certains jours, un seul
  domaine peut dominer complètement les articles trouvés, et c'est
  normal.

- AUCUN nombre cible d'articles. Deux excellents articles valent mieux
  que huit articles moyens ajoutés pour "faire du volume". Le nombre
  peut varier de 1 à 20+ selon ce qui existe vraiment de solide.

- AUCUNE liste fermée de sources autorisées. Seul critère : la
  FIABILITÉ (revues à comité de lecture — Nature, Science, IEEE,
  Wiley, ScienceDirect... —, presse spécialisée établie, communiqués
  d'instituts de recherche/universités/agences gouvernementales,
  agences de presse reconnues). Évite les blogs marketing génériques,
  les agrégateurs SEO, les sources non vérifiables.

- Le seul filtre qui compte : est-ce une innovation réelle,
  significative, potentiellement utile pour identifier des
  technologies civiles transposables à la défense ? Si oui → inclus,
  peu importe pays/catégorie. Si non → exclus, même si ça
  "compléterait" une catégorie ou un pays sous-représenté.

SCHÉMA D'UN ARTICLE
Pour chaque article retenu, un objet avec exactement ces champs :
- country (nom du pays en français)
- flag (emoji drapeau)
- categories (tableau de 1 à 3 valeurs parmi les 10 clés listées
  plus haut — en anglais/snake_case exact : materiaux, fabrication,
  robotique, logiciel_ia, energie, capteurs_comms, espace,
  sante_biotech, industrie_defense, economie_regulation. Mets toutes
  celles qui s'appliquent réellement, jamais une seule "par défaut"
  si plusieurs domaines sont concernés)
- date (format libre en français, ex: "3 juillet 2026")
- source (nom du média/de la revue/de l'institution)
- title (reformulé en français, jamais une citation du titre original)
- summary (1-2 phrases reformulées en français, jamais recopiées mot
  pour mot — respect du droit d'auteur)
- companies (2 à 5 entreprises/organisations/institutions citées)
- trends (1 à 2 thèmes courts en français ; réutilise un thème déjà
  présent dans le fichier si pertinent)
- url (URL réelle de la page trouvée)

Vérifie qu'aucune url n'existe déjà dans SEED_NEWS avant d'ajouter
un article (pas de doublons).

ÉTAPES TECHNIQUES

1. Cloner/mettre à jour le repo, puis :
   npm install

2. Recherche web selon la mission éditoriale et les règles anti-biais
   ci-dessus. Aucune contrainte de nombre, de pays ou de catégorie ne
   doit influencer la recherche.

3. Ajouter les nouveaux objets à la fin de SEED_NEWS dans
   dashboard-source.jsx (le plus grand id actuel est 62 au moment de
   la rédaction de ce prompt — vérifie le vrai maximum dans le fichier
   plutôt que de te fier à ce chiffre, il aura changé). Utiliser des id
   incrémentaux à partir de ce max + 1. Si le tableau dépasse 300
   éléments après ajout, retirer les plus anciens (id les plus petits)
   pour revenir à 300.

4. Régénérer index.html :
   node scripts/build.mjs
   Le script affiche la taille du fichier généré. S'il lève une
   erreur, arrête-toi et rapporte le message plutôt que de continuer.

5. VÉRIFICATION OBLIGATOIRE avant de publier (ne jamais sauter cette
   étape, même si ça semble ralentir le processus) : écris et exécute
   un script Node qui charge index.html avec jsdom (options :
   runScripts: 'dangerously', pretendToBeVisual: true), injecte un
   stub ResizeObserver minimal, attend environ 1,5 seconde, puis
   vérifie TOUTES ces conditions dans le HTML rendu :
     a) le texte "Radar Tech Mondial" est présent
     b) au moins un élément correspond au sélecteur ".view-tab"
     c) au moins 10 éléments correspondent au sélecteur ".cat-chip"
        (les 10 catégories + "Toutes")
     d) aucune exception JavaScript n'a été levée pendant le rendu
        (écoute l'événement 'error' sur la fenêtre jsdom et vérifie
        qu'aucun message ne contient "Cannot read properties" ou
        "undefined" — un objet catégorie mal formé fait planter le
        rendu silencieusement, c'est déjà arrivé)
   Si une seule de ces conditions échoue, NE PUSH PAS : corrige le
   problème (le plus souvent une catégorie mal orthographiée hors des
   10 clés valides, ou une virgule/guillemet mal échappé dans un item
   ajouté à l'étape 3), régénère, revérifie depuis le début.

6. Committer et pousser :
   git add -A
   git commit -m "Refresh quotidien : ajout de N articles"
   git push origin main
   (ne jamais committer node_modules/, il est dans .gitignore)

7. Résumé final : nombre d'articles ajoutés, domaines couverts (sans
   commenter leur "diversité"), taille totale du dataset, confirmation
   que la vérification a réussi avant le push.

RAPPELS
- Jamais de citation de plus de quelques mots d'un article source.
- Jamais de doublon d'URL.
- L'étape 5 est obligatoire, sans exception.
- Ne jamais réintroduire de dépendance CDN externe (unpkg, jsdelivr,
  etc.) dans scripts/build.mjs ou index.html.
- Ne jamais réintroduire de quota de pays, de catégorie ou de nombre
  d'articles, même implicitement.
- Une catégorie DOIT être une des 10 clés exactes listées plus haut.
  N'invente jamais une nouvelle clé (ex: pas de "materiel" au lieu de
  "materiaux") — cela casse le rendu (CATS[clé inconnue] est undefined
  et fait planter tout le composant à l'exécution).
```
