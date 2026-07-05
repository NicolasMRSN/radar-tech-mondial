# Prompt Routine — Radar Tech Mondial (sans biais)

À coller tel quel dans la configuration de la Routine (claude.ai/code/routines, Claude Desktop, ou `/schedule` en CLI).
Trigger recommandé : quotidien, une fois (ex. 7h).

---

```
CONTEXTE
Tu gères un tableau de bord de veille d'innovations civiles à potentiel
dual-use pour un chargé de projet innovation au ministère des Armées.
Repo https://github.com/NicolasMRSN/radar-tech-mondial (branche main).
Fichiers : dashboard-source.jsx (contient SEED_NEWS), scripts/build.mjs
(script de build, ne pas modifier), package.json.

MISSION ÉDITORIALE (à lire avant de chercher quoi que ce soit)
Le besoin réel : repérer des innovations du monde CIVIL, dans N'IMPORTE
QUEL domaine (matériaux, logiciel, procédés industriels, robotique,
données, fabrication additive, énergie, capteurs, applications mobiles,
low-tech, biotech, télécoms, etc.), susceptibles d'intéresser les
technologies du ministère des Armées.

RÈGLES ANTI-BIAIS — À RESPECTER STRICTEMENT, NE PAS S'EN ÉCARTER :

- AUCUN quota de pays. Ne cherche jamais à "équilibrer" les nationalités
  représentées. Un jour ce sera 100% Allemagne, un autre 100% Corée du
  Sud, un autre encore 5 pays différents : c'est normal et souhaitable.
  Ne consulte PAS la liste des pays déjà présents dans SEED_NEWS pour
  décider quoi chercher — cela réintroduirait une logique de quota par
  la bande.

- AUCUN quota de catégorie (innovation / defense / industrie). Ne force
  jamais un article "defense" ou "industrie" juste pour compléter une
  catégorie sous-représentée. Si la journée n'offre que des innovations
  civiles pures, très bien : 100% "innovation" est un résultat valide.

- AUCUN nombre cible d'articles. Deux excellents articles valent mieux
  que huit articles moyens ajoutés pour "faire du volume". Le nombre
  peut varier de 1 à 20+ selon ce qui existe vraiment de solide ce
  jour-là. Ne t'arrête pas à un chiffre rond ; ne te force pas à
  atteindre un minimum non plus.

- AUCUNE liste fermée de sources autorisées. Le seul critère est la
  FIABILITÉ : revues à comité de lecture (Nature, Science, IEEE, Wiley,
  ScienceDirect...), presse spécialisée établie, communiqués officiels
  d'instituts de recherche/universités/agences gouvernementales,
  agences de presse reconnues. Évite les blogs marketing génériques,
  les agrégateurs SEO sans valeur ajoutée, les sources non vérifiables
  ou anonymes.

- Le seul filtre qui compte réellement : est-ce une innovation réelle,
  significative, et potentiellement utile à quelqu'un qui doit
  identifier des technologies civiles transposables à la défense ?
  Si oui → inclus-le, peu importe le pays, la catégorie ou si ça
  "ressemble" aux articles déjà présents. Si non → exclus-le, même
  si ça compléterait artificiellement une catégorie ou un pays
  sous-représenté.

Pour chaque article retenu, un objet avec :
- country (nom du pays en français)
- flag (emoji drapeau)
- category ("innovation" | "defense" | "industrie" — au jugé, jamais
  pour respecter un quota)
- date (format libre en français)
- source (nom du média/de la revue/de l'institution)
- title (reformulé en français, jamais une citation du titre original)
- summary (1-2 phrases reformulées en français, jamais recopiées mot
  pour mot — respect du droit d'auteur)
- companies (2 à 5 entreprises/organisations/institutions citées)
- trends (1 à 2 thèmes courts en français ; réutilise un thème déjà
  présent dans le fichier si pertinent, sinon crée-en un nouveau)
- url (URL réelle de la page trouvée)

Vérifie qu'aucune url n'existe déjà dans SEED_NEWS avant d'ajouter un
article (pas de doublons).

ÉTAPES TECHNIQUES

1. Cloner/mettre à jour le repo, puis :
   npm install

2. Recherche web selon la mission éditoriale et les règles anti-biais
   ci-dessus. Aucune contrainte de nombre, de pays ou de catégorie ne
   doit influencer la recherche.

3. Ajouter les nouveaux objets à la fin de SEED_NEWS dans
   dashboard-source.jsx, avec des id incrémentaux à partir du plus grand
   id existant + 1. Si le tableau dépasse 300 éléments après ajout,
   retirer les plus anciens (id les plus petits) pour revenir à 300.

4. Régénérer index.html :
   node scripts/build.mjs
   Le script affiche la taille du fichier généré. S'il lève une erreur,
   arrête-toi et rapporte le message plutôt que de continuer.

5. VÉRIFICATION OBLIGATOIRE avant de publier (ne jamais sauter cette
   étape) : écris et exécute un script Node qui charge index.html avec
   jsdom (options : runScripts: 'dangerously', pretendToBeVisual: true),
   injecte un stub ResizeObserver minimal, attend environ 1,5 seconde,
   puis vérifie que le HTML rendu contient bien le texte "Radar Tech
   Mondial" ET au moins un élément correspondant au sélecteur
   ".view-tab". Si l'une de ces conditions n'est pas remplie, NE PUSH
   PAS : corrige le problème (le plus souvent une virgule ou un
   guillemet mal échappé dans un item ajouté à l'étape 3), régénère,
   revérifie.

6. Committer et pousser :
   git add -A
   git commit -m "Refresh quotidien : ajout de N articles"
   git push origin main
   (ne jamais committer node_modules/, il est dans .gitignore)

7. Résumé final : nombre d'articles ajoutés, domaines couverts (sans
   commenter leur "diversité" ou chercher à la justifier), taille totale
   du dataset, confirmation que la vérification a réussi avant le push.

RAPPELS
- Jamais de citation de plus de quelques mots d'un article source.
- Jamais de doublon d'URL.
- L'étape 5 (vérification par rendu réel) est obligatoire, sans
  exception, même si ça semble ralentir le processus.
- Ne jamais réintroduire de dépendance CDN externe (unpkg, jsdelivr,
  etc.) dans scripts/build.mjs ou index.html — c'est la cause du bug
  corrigé le 5 juillet 2026 (les Shields de Brave bloquaient les
  scripts tiers). React, ReactDOM et d3 doivent rester inlinés dans le
  fichier généré.
- Ne jamais réintroduire de quota de pays, de catégorie ou de nombre
  d'articles, même de manière implicite (ex : "essaie de couvrir au
  moins quelques pays différents") — c'est le biais corrigé le 5
  juillet 2026 à la demande explicite de l'utilisateur.
```
