import { useState, useMemo, useRef, useEffect } from "react";
import * as d3 from "d3";

/* ------------------------------------------------------------------ */
/*  SEED DATA — snapshot compiled from L'Usine Nouvelle, Zone Militaire /
    Opex360, The Verge, Breaking Defense, TechCrunch, Reuters/Al Jazeera,
    SCMP, CNBC, Aviation Week, Aerospace Global News, Jerusalem Post/Ctech,
    Crunchbase News, TechWire Asia, Digitimes, RoboticsTomorrow, McKinsey,
    Zone Armée, Aeroflap, Zonebourse, La Libre, SPA, L'Essentiel de l'Éco…
    Each item links to the real page it was drawn from. This is a starting
    snapshot — use "Actualiser" to pull fresh items live from the web.    */
/* ------------------------------------------------------------------ */

const CATS = {
  materiaux: { label: "Matériaux & structures", icon: "🧱", color: "#5EC8B8" },
  fabrication: { label: "Fabrication & procédés", icon: "🏭", color: "#9B7FE0" },
  robotique: { label: "Robotique & systèmes autonomes", icon: "🤖", color: "#E0708A" },
  logiciel_ia: { label: "IA, logiciel & données", icon: "💻", color: "#4FA8E0" },
  energie: { label: "Énergie & propulsion", icon: "🔋", color: "#7FCB6B" },
  capteurs_comms: { label: "Capteurs, optronique & communications", icon: "📡", color: "#D99A4E" },
  espace: { label: "Espace", icon: "🛰️", color: "#6E7FE0" },
  sante_biotech: { label: "Santé & biotech", icon: "🧬", color: "#E06B6B" },
  industrie_defense: { label: "Industrie & BITD de défense", icon: "🛡️", color: "#C1553F" },
  economie_regulation: { label: "Économie, financement & régulation", icon: "💶", color: "#B0A15E" },
};
const CAT_KEYS = Object.keys(CATS);

/* Approximate [longitude, latitude] centroids for every country currently
   used in the dataset. Purely for plotting bubbles on the map — a country
   missing here (e.g. one added later by the daily Routine) is simply
   skipped on the map without breaking anything else. */
const COUNTRY_COORDS = {
  "France": [2.5, 46.6], "Allemagne": [10.4, 51.2], "États-Unis": [-98.6, 39.8],
  "Chine": [104.2, 35.9], "Japon": [138.3, 36.2], "Inde": [79.0, 22.0],
  "Israël": [34.9, 31.0], "Royaume-Uni": [-2.0, 54.0], "Ukraine": [31.0, 49.0],
  "Corée du Sud": [127.8, 36.0], "Taïwan": [121.0, 23.7], "Brésil": [-51.9, -14.2],
  "Émirats arabes unis": [54.3, 24.0], "Arabie saoudite": [45.0, 23.9],
  "Pologne": [19.1, 52.1], "Australie": [133.8, -25.3], "Italie": [12.6, 42.5],
  "Canada": [-106.3, 56.1], "Turquie": [35.2, 39.0], "Indonésie": [113.9, 0.8],
  "Afrique du Sud": [24.7, -29.0], "Maroc": [-7.1, 31.8],
  "Belgique": [4.5, 50.5], "Finlande": [26.0, 64.0],
};

const FR_MONTHS = {
  "janvier": 0, "février": 1, "fevrier": 1, "mars": 2, "avril": 3, "mai": 4,
  "juin": 5, "juillet": 6, "août": 7, "aout": 7, "septembre": 8,
  "octobre": 9, "novembre": 10, "décembre": 11, "decembre": 11,
};

/* Lenient parser for the free-text French dates in the dataset ("30 juin
   2026", "juin 2026", "10 décembre 2025"...). Returns null rather than
   throwing when a date can't be parsed (e.g. Routine-generated text that
   doesn't match), so callers can just skip unplaceable items. */
function parseFrenchDate(str) {
  if (!str) return null;
  const s = str.toLowerCase();
  const names = Object.keys(FR_MONTHS).join("|");
  const m = s.match(new RegExp(`(\\d{1,2})?\\s*(${names})\\s*(\\d{4})`, "i"));
  if (!m) return null;
  const day = m[1] ? parseInt(m[1], 10) : 15;
  const month = FR_MONTHS[m[2]];
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, Math.min(Math.max(day, 1), 28));
  return isNaN(d.getTime()) ? null : d;
}

const SEED_NEWS = [
  { id: 1, country: "France", flag: "🇫🇷", categories: ["robotique", "industrie_defense"], date: "30 juin 2026", source: "L'Usine Nouvelle",
    title: "Harmattan AI devient le premier droniste des armées françaises",
    summary: "La pépite française décroche une commande supplémentaire de 5 000 drones auprès de la DGA, s'arrogeant la moitié des commandes de l'année. Sa future usine francilienne doit atteindre 10 000 drones par mois d'ici fin 2026.",
    companies: ["Harmattan AI", "DGA"], trends: ["Guerre des drones", "Souveraineté technologique"],
    url: "https://www.linkedin.com/company/l-usine-nouvelle/" },
  { id: 2, country: "France", flag: "🇫🇷", categories: ["industrie_defense", "fabrication"], date: "28 juin 2026", source: "L'Usine Nouvelle",
    title: "Safran Electronics & Defense réorganise son outil industriel",
    summary: "Le site de Mantes-la-Ville doit fermer, ses activités étant transférées vers deux sites montant en puissance sur l'aviation civile et la défense.",
    companies: ["Safran"], trends: ["Consolidation industrielle"],
    url: "https://www.usinenouvelle.com/quotidien-des-usines/" },
  { id: 3, country: "France", flag: "🇫🇷", categories: ["energie", "fabrication"], date: "27 juin 2026", source: "L'Usine Nouvelle",
    title: "EDF réinternalise la production de pièces critiques des EPR2",
    summary: "Plusieurs centaines de millions d'euros sont investis pour rapatrier la fabrication de composants sensibles chez Framatome et Arabelle Solutions.",
    companies: ["EDF", "Framatome", "Arabelle Solutions"], trends: ["Souveraineté technologique"],
    url: "https://www.usinenouvelle.com/quotidien-des-usines/" },
  { id: 4, country: "France", flag: "🇫🇷", categories: ["industrie_defense"], date: "15 juin 2026", source: "L'Usine Nouvelle",
    title: "Lance-roquettes souverain : Paris tranche entre deux consortiums",
    summary: "À l'ouverture d'Eurosatory, la ministre des Armées Catherine Vautrin ouvre des négociations exclusives avec MBDA et Safran, écartant le tandem Thales/ArianeGroup pour la fourniture du futur lance-roquettes.",
    companies: ["MBDA", "Safran", "Thales", "ArianeGroup"], trends: ["Réarmement", "Souveraineté technologique"],
    url: "https://www.usinenouvelle.com/aero-spatial/safran/" },
  { id: 5, country: "France", flag: "🇫🇷", categories: ["logiciel_ia", "fabrication"], date: "7 mai 2026", source: "Usine Nouvelle / Safran",
    title: "Safran et la start-up Quandela explorent le calcul quantique",
    summary: "Un projet de recherche de deux ans doit préparer de futurs algorithmes quantiques capables d'affiner la simulation des écoulements dans les moteurs d'avion.",
    companies: ["Safran", "Quandela"], trends: ["IA physique & robotique"],
    url: "https://www.usinenouvelle.com/aero-spatial/safran/" },
  { id: 6, country: "France", flag: "🇫🇷", categories: ["robotique", "capteurs_comms", "industrie_defense"], date: "10 juin 2026", source: "L'Usine Nouvelle",
    title: "Un démonstrateur anti-drones commandé à quatre industriels",
    summary: "La DGA a confié à MBDA, Safran, Thales et Cilas le développement du démonstrateur Syderal, destiné à neutraliser drones, roquettes et mortiers à distance.",
    companies: ["MBDA", "Safran", "Thales", "Cilas", "DGA"], trends: ["Guerre des drones", "Réarmement"],
    url: "https://www.usinenouvelle.com/aero-spatial/safran/" },
  { id: 7, country: "Allemagne", flag: "🇩🇪", categories: ["industrie_defense", "economie_regulation"], date: "11 mars 2026", source: "Breaking Defense",
    title: "Rheinmetall vise 45 % de croissance en 2026",
    summary: "Le groupe allemand table sur un chiffre d'affaires de 14,5 milliards d'euros, porté par une demande record des forces armées pour véhicules, munitions et drones. Ses commandes domestiques pourraient atteindre 32 milliards d'euros.",
    companies: ["Rheinmetall"], trends: ["Réarmement"],
    url: "https://breakingdefense.com/2026/03/germanys-rheinmetall-predicts-16-8b-annual-order-boom-will-focus-entirely-on-defense/" },
  { id: 8, country: "Allemagne", flag: "🇩🇪", categories: ["industrie_defense", "economie_regulation"], date: "24 juin 2026", source: "CNBC",
    title: "Berlin annule le programme de frégates F126, Rheinmetall dévisse",
    summary: "L'Allemagne renonce à six frégates F126 au profit de huit corvettes Meko A-200 plus petites, commandées à TKMS. Le titre Rheinmetall perd jusqu'à 18 %, Hensoldt et Renk chutent aussi.",
    companies: ["Rheinmetall", "TKMS", "Hensoldt", "Renk"], trends: ["Réarmement", "Marine & sous-marins"],
    url: "https://www.cnbc.com/2026/06/24/rheinmetall-stock-defense-germany-warship-scrap-plans.html" },
  { id: 9, country: "Allemagne", flag: "🇩🇪", categories: ["industrie_defense", "economie_regulation"], date: "7 mai 2026", source: "The Defense Post",
    title: "Rheinmetall accélère son expansion navale",
    summary: "Après le rachat du chantier Naval Vessels Luerssen, le groupe fait une offre non contraignante sur German Naval Yards, actuellement détenu par le français CMN Naval.",
    companies: ["Rheinmetall", "Naval Vessels Luerssen", "CMN Naval"], trends: ["Consolidation industrielle", "Marine & sous-marins"],
    url: "https://thedefensepost.com/2026/05/07/rheinmetall-offer-germany-naval-yard/" },
  { id: 10, country: "Allemagne", flag: "🇩🇪", categories: ["industrie_defense", "economie_regulation"], date: "1 juillet 2026", source: "GuruFocus",
    title: "Berlin et Washington discutent d'une coproduction d'armement",
    summary: "Le titre Rheinmetall progresse après des informations sur une collaboration germano-américaine visant à coproduire des missiles Tomahawk longue portée et des intercepteurs PAC-3 pour les systèmes Patriot.",
    companies: ["Rheinmetall", "Lockheed Martin"], trends: ["Réarmement"],
    url: "https://www.gurufocus.com/news/8941254/rheinmetall-rnmbf-sees-5-rise-amid-usgermany-defense-partnership-talks" },
  { id: 11, country: "États-Unis", flag: "🇺🇸", categories: ["industrie_defense", "robotique", "economie_regulation"], date: "28 mai 2026", source: "ExecutiveGov",
    title: "Le budget FY27 de l'US Air Force muscle l'aviation de 6ᵉ génération",
    summary: "3 milliards de dollars supplémentaires sont demandés pour le chasseur furtif F-47 de Boeing, appelé à voler aux côtés de drones autonomes du programme Collaborative Combat Aircraft.",
    companies: ["Boeing", "Lockheed Martin", "Northrop Grumman", "General Atomics", "Anduril"], trends: ["Réarmement"],
    url: "https://www.executivegov.com/articles/air-force-fy27-budget-hypersonics-autonomy" },
  { id: 12, country: "États-Unis", flag: "🇺🇸", categories: ["industrie_defense", "energie"], date: "24 juin 2026", source: "Aviation Week",
    title: "Lockheed dévoile un planeur hypersonique low-cost",
    summary: "Le nouveau concept NXGB doit réduire drastiquement les coûts de production après que l'US Army a annoncé vouloir abandonner l'actuel Long Range Hypersonic Weapon, trop cher à produire en série.",
    companies: ["Lockheed Martin", "Northrop Grumman", "Castelion"], trends: ["Hypersoniques"],
    url: "https://aviationweek.com/defense/missile-defense-weapons/lockheed-unveils-low-cost-hypersonic-glide-missile" },
  { id: 13, country: "États-Unis", flag: "🇺🇸", categories: ["logiciel_ia", "energie"], date: "3 juillet 2026", source: "The Verge",
    title: "Nvidia minimise l'impact hydrique de ses data centers IA",
    summary: "Face à une opposition publique croissante (70 % des Américains y seraient défavorables selon Gallup), Nvidia affirme que sa nouvelle génération de puces réduit fortement la consommation d'eau.",
    companies: ["Nvidia"], trends: ["IA & entreprise"],
    url: "https://markmcneilly.substack.com/p/the-new-news-in-ai-7326-edition" },
  { id: 14, country: "États-Unis", flag: "🇺🇸", categories: ["logiciel_ia", "fabrication"], date: "3 juillet 2026", source: "The Verge",
    title: "Ford réembauche en urgence après un pari raté sur l'IA",
    summary: "Le constructeur a dû rappeler et former des centaines d'ingénieurs expérimentés après que ses systèmes de conception assistés par IA ont provoqué une vague de rappels de véhicules.",
    companies: ["Ford"], trends: ["IA & entreprise"],
    url: "https://markmcneilly.substack.com/p/the-new-news-in-ai-7326-edition" },
  { id: 15, country: "États-Unis", flag: "🇺🇸", categories: ["logiciel_ia", "economie_regulation"], date: "2 juillet 2026", source: "TechCrunch",
    title: "Microsoft lance sa propre unité de déploiement d'IA d'entreprise",
    summary: "\"Microsoft Frontier Company\" mobilise 2,5 milliards de dollars et 6 000 experts pour accompagner directement les grands clients dans le déploiement de ses outils d'IA.",
    companies: ["Microsoft"], trends: ["IA & entreprise", "Financement IA"],
    url: "https://techcrunch.com/2026/07/02/microsoft-launches-its-own-ai-deployment-company-with-2-5-billion-commitment/" },
  { id: 16, country: "États-Unis", flag: "🇺🇸", categories: ["logiciel_ia", "economie_regulation", "industrie_defense"], date: "26 juin 2026", source: "Crunchbase News",
    title: "Baseten lève 1,5 Md$, la defense-tech Stark 569 M$",
    summary: "Parmi les plus grosses levées de la semaine : l'infrastructure d'inférence IA Baseten (série F) et la start-up berlinoise de défense Stark, soutenue par Founders Fund et Sequoia.",
    companies: ["Baseten", "Stark"], trends: ["Financement IA"],
    url: "https://news.crunchbase.com/venture/biggest-funding-rounds-ai-marketing-robotics-baseten/" },
  { id: 17, country: "États-Unis", flag: "🇺🇸", categories: ["logiciel_ia", "economie_regulation"], date: "20 juin 2026", source: "Crunchbase News",
    title: "88 % des financements IA vont à des entreprises américaines",
    summary: "OpenAI, Anthropic et xAI captent l'essentiel des méga-levées mondiales en 2026, accentuant la concentration géographique du capital-risque autour de l'intelligence artificielle.",
    companies: ["OpenAI", "Anthropic", "xAI"], trends: ["Financement IA"],
    url: "https://news.crunchbase.com/venture/us-ai-startup-funding-boom-data/" },
  { id: 18, country: "États-Unis", flag: "🇺🇸", categories: ["logiciel_ia", "economie_regulation"], date: "1 juin 2026", source: "Al Jazeera",
    title: "Washington resserre l'étau sur l'exportation de puces IA",
    summary: "Le Department of Commerce précise que ses restrictions s'appliquent aussi aux filiales de groupes chinois situées hors de Chine, fermant une brèche que Nvidia aurait exploitée.",
    companies: ["Nvidia", "AMD", "Intel", "TSMC"], trends: ["Semi-conducteurs & export controls"],
    url: "https://www.aljazeera.com/economy/2026/6/1/us-says-ban-on-ai-chip-shipments-applies-to-chinese-firms-outside-china" },
  { id: 19, country: "Chine", flag: "🇨🇳", categories: ["logiciel_ia", "economie_regulation"], date: "6 mai 2026", source: "TechWire Asia",
    title: "Huawei accélère malgré les sanctions américaines",
    summary: "Le chiffre d'affaires des puces IA de Huawei devrait bondir de 60 % à 12 milliards de dollars en 2026, tandis que Cambricon et CXMT montent en puissance pour réduire la dépendance chinoise à Nvidia.",
    companies: ["Huawei", "Cambricon", "CXMT"], trends: ["Semi-conducteurs & export controls"],
    url: "https://techwireasia.com/2026/05/china-semiconductor-self-sufficiency-wafer-target-2026/" },
  { id: 20, country: "Chine", flag: "🇨🇳", categories: ["logiciel_ia", "fabrication"], date: "20 février 2026", source: "American Affairs Journal",
    title: "La Chine pousse ses fondeurs vers les nœuds avancés",
    summary: "SMIC et Hua Hong intensifient leurs efforts de gravure avancée par multi-patterning, une méthode plus coûteuse mais qui contourne partiellement les restrictions sur les équipements EUV.",
    companies: ["SMIC", "Hua Hong", "CXMT"], trends: ["Semi-conducteurs & export controls"],
    url: "https://americanaffairsjournal.org/2026/02/innovation-under-pressure-chinas-semiconductor-industry-at-a-crossroads/" },
  { id: 21, country: "Japon", flag: "🇯🇵", categories: ["robotique", "logiciel_ia", "economie_regulation"], date: "30 juin 2026", source: "Let's Data Science",
    title: "Tokyo mise 6,2 Md$ sur l'IA physique avec le consortium Noetra",
    summary: "Piloté par SoftBank, Sony, NEC et Honda, ce programme public vise le déploiement de 10 millions de robots dotés d'IA dans 18 secteurs d'ici 2040.",
    companies: ["SoftBank", "Sony", "NEC", "Honda", "Toyota"], trends: ["IA physique & robotique"],
    url: "https://letsdatascience.com/news/japan-targets-sovereign-ai-model-and-10-million-robots-83b74c54" },
  { id: 22, country: "Japon", flag: "🇯🇵", categories: ["robotique", "logiciel_ia"], date: "9 mars 2026", source: "The Japan Times",
    title: "Une start-up d'anciens de Google démarche les industriels japonais",
    summary: "Integral AI, fondée par d'anciens chercheurs de Google, discute avec Toyota, Sony, Honda, Nissan et Mitsui Chemicals pour apprendre aux robots industriels de nouvelles tâches par observation.",
    companies: ["Integral AI", "Toyota", "Sony", "Honda", "Nissan", "Denso"], trends: ["IA physique & robotique"],
    url: "https://www.japantimes.co.jp/business/2026/03/09/companies/integral-ai-tokyo-startup/" },
  { id: 23, country: "Japon", flag: "🇯🇵", categories: ["robotique"], date: "28 mai 2026", source: "RoboticsTomorrow",
    title: "Tokyo accueille le premier Humanoids Summit d'Asie",
    summary: "Toyota, Honda, Panasonic, Boston Dynamics et Unitree se retrouvent autour des robots humanoïdes, alors que le Japon cherche à compenser sa pénurie de main-d'œuvre par l'automatisation.",
    companies: ["Toyota", "Honda", "Panasonic", "Boston Dynamics", "Unitree"], trends: ["IA physique & robotique"],
    url: "https://www.roboticstomorrow.com/news/2026/04/08/global-robotics-industry-converges-on-japan-for-humanoids-summit-tokyo-2026/26378/" },
  { id: 24, country: "Inde", flag: "🇮🇳", categories: ["capteurs_comms", "materiaux"], date: "27 mai 2026", source: "Indian Defence News",
    title: "L'Inde maîtrise les puces radar au nitrure de gallium",
    summary: "Le DRDO devient le 7ᵉ acteur mondial à percer cette technologie, après le refus de la France de la transférer dans le cadre de l'accord Rafale — un revers transformé en déclic industriel.",
    companies: ["DRDO", "Dassault"], trends: ["Souveraineté technologique"],
    url: "https://www.indiandefensenews.in/2026/05/india-joins-elite-club-as-drdo.html" },
  { id: 25, country: "Inde", flag: "🇮🇳", categories: ["industrie_defense", "robotique"], date: "26 mai 2026", source: "Indian Defence News",
    title: "Adani Defence et le DRDO multiplient les essais réussis",
    summary: "Missile antinavire indigène, kit de guidage de précision et systèmes anti-drones montés sur véhicule illustrent la montée en puissance du modèle de partenariat public-privé indien.",
    companies: ["Adani Defence", "DRDO", "Bharat Dynamics"], trends: ["Souveraineté technologique"],
    url: "https://www.indiandefensenews.in/2026/05/adani-defence-and-drdo-drive.html" },
  { id: 26, country: "Inde", flag: "🇮🇳", categories: ["industrie_defense", "capteurs_comms"], date: "20 juin 2026", source: "Defence News India",
    title: "Nouveau S-400 russe en vue, en parallèle du programme Kusha",
    summary: "New Delhi négocierait un second contrat S-400 avec Moscou fin 2026, tout en développant Kusha, son propre bouclier antimissile longue portée, pour réduire sa dépendance aux fournisseurs étrangers.",
    companies: ["DRDO"], trends: ["Souveraineté technologique"],
    url: "https://defence.in/threads/india-expected-to-sign-second-s-400-deal-with-russia-by-late-2026-with-target-for-initial-deliveries-in-2028.18051/" },
  { id: 27, country: "Inde", flag: "🇮🇳", categories: ["industrie_defense", "energie"], date: "13 février 2026", source: "Indian Defence News",
    title: "Vers un transfert de technologie complet pour le moteur de l'AMCA",
    summary: "HAL, Tata Advanced Systems et L&T sont en lice pour le futur avion de transport indien, tandis que Safran et le DRDO avancent sur un accord de transfert total pour le moteur du chasseur AMCA.",
    companies: ["HAL", "Tata Advanced Systems", "L&T", "Safran", "DRDO"], trends: ["Souveraineté technologique", "Réarmement"],
    url: "https://www.indiandefensenews.in/2026/02/defence-acquisition-procedure-dap-2026.html" },
  { id: 28, country: "Israël", flag: "🇮🇱", categories: ["industrie_defense", "economie_regulation"], date: "2 janvier 2026", source: "Breaking Defense",
    title: "Les trois grands industriels israéliens visent l'Europe et l'Asie",
    summary: "Après des ventes record portées par des systèmes testés au combat, Elbit Systems, Rafael et Israel Aerospace Industries cherchent à percer sur de nouveaux marchés, dont la Grèce pour la défense antiaérienne.",
    companies: ["Elbit Systems", "Rafael", "Israel Aerospace Industries"], trends: ["Réarmement"],
    url: "https://breakingdefense.com/2026/01/israeli-defense-industry-looks-to-capitalize-on-hard-won-combat-lessons-2026-preview/" },
  { id: 29, country: "Israël", flag: "🇮🇱", categories: ["industrie_defense", "economie_regulation"], date: "10 décembre 2025", source: "The Jerusalem Post",
    title: "Le ministère de la Défense mise sur les start-ups plutôt que sur les mastodontes",
    summary: "Au moins 10 % du budget R&D 2026 ira aux jeunes pousses plutôt qu'aux trois grands groupes, avec l'émergence de Kela, un challenger sur les systèmes de commandement.",
    companies: ["Kela", "Elbit Systems", "Rafael", "Israel Aerospace Industries"], trends: ["Financement IA"],
    url: "https://www.jpost.com/defense-and-tech/article-879734" },
  { id: 30, country: "Israël", flag: "🇮🇱", categories: ["industrie_defense"], date: "30 juin 2026", source: "The Jerusalem Post",
    title: "Anduril s'implante en Israël et s'associe à Elbit",
    summary: "La pépite américaine de la défense propose avec Elbit un système d'artillerie pour l'US Army et espère utiliser les entreprises israéliennes comme tremplin vers les marchés européens.",
    companies: ["Anduril", "Elbit Systems", "Oshkosh"], trends: ["Réarmement"],
    url: "https://www.jpost.com/defense-and-tech/article-900917" },
  { id: 31, country: "Royaume-Uni", flag: "🇬🇧", categories: ["robotique", "industrie_defense", "economie_regulation"], date: "1 juillet 2026", source: "Aerospace Global News",
    title: "Londres investit 5 milliards de livres dans les drones",
    summary: "L'annonce doit transformer les capacités de l'Armée de terre, de la Royal Navy et de la RAF face à la multiplication des menaces de drones sur les théâtres actuels.",
    companies: ["Ministère de la Défense (UK)"], trends: ["Guerre des drones", "Réarmement"],
    url: "https://aerospaceglobalnews.com/" },
  { id: 32, country: "Ukraine", flag: "🇺🇦", categories: ["industrie_defense", "economie_regulation"], date: "1 juillet 2026", source: "Aerospace Global News",
    title: "Kiev signe pour des Gripen E suédois",
    summary: "Un contrat de 2,5 milliards de dollars avec Saab doit poser les bases de la future armée de l'air ukrainienne.",
    companies: ["Saab"], trends: ["Réarmement"],
    url: "https://aerospaceglobalnews.com/" },
  { id: 33, country: "États-Unis", flag: "🇺🇸", categories: ["espace", "economie_regulation"], date: "29 juin 2026", source: "Aerospace Global News",
    title: "Rocket Lab rachète Iridium pour 8 milliards de dollars",
    summary: "L'opération rebat les cartes du marché des communications satellitaires et illustre la vague de consolidation en cours dans le secteur spatial.",
    companies: ["Rocket Lab", "Iridium"], trends: ["Consolidation industrielle"],
    url: "https://aerospaceglobalnews.com/" },
  { id: 34, country: "Corée du Sud", flag: "🇰🇷", categories: ["robotique", "industrie_defense"], date: "1 juillet 2026", source: "Aerospace Global News",
    title: "Séoul teste ses défenses anti-essaims de drones",
    summary: "Un exercice de grande ampleur démontre qu'aucun système isolé ne suffit à arrêter une attaque coordonnée de drones, obligeant à combiner plusieurs couches de défense.",
    companies: ["Forces armées sud-coréennes"], trends: ["Guerre des drones"],
    url: "https://aerospaceglobalnews.com/" },
  { id: 35, country: "États-Unis", flag: "🇺🇸", categories: ["logiciel_ia", "economie_regulation"], date: "1 juillet 2026", source: "L'Usine Nouvelle",
    title: "Claude Sonnet 5 lancé sous surveillance de Washington",
    summary: "Anthropic déploie son nouveau modèle tandis que Claude Fable 5 et Mythos 5 retrouvent le marché après une suspension temporaire liée aux contrôles à l'export américains.",
    companies: ["Anthropic"], trends: ["IA & entreprise", "Semi-conducteurs & export controls"],
    url: "https://www.usinenouvelle.com/" },
  { id: 36, country: "France", flag: "🇫🇷", categories: ["fabrication", "robotique"], date: "juin 2026", source: "L'Usine Nouvelle",
    title: "Le verrier Arc redémarre aux Émirats, Waymo s'installe en France",
    summary: "Alors que les tensions régionales s'apaisent, le fabricant de verre Arc relance son usine émiratie ; en parallèle, Waymo ouvre discrètement une filiale française pour étendre ses ambitions de taxis autonomes en Europe.",
    companies: ["Arc", "Waymo"], trends: ["IA & entreprise"],
    url: "https://www.usinenouvelle.com/" },
  { id: 37, country: "États-Unis", flag: "🇺🇸", categories: ["robotique", "economie_regulation"], date: "1 juillet 2026", source: "TechCrunch",
    title: "La course aux véhicules autonomes rejoue le scénario de 2016",
    summary: "Le fondateur d'Uber Travis Kalanick relance une entreprise de robotique tandis que capitaux et talents affluent de nouveau vers l'autonomie, portés par ceux qui ont vécu la première vague.",
    companies: ["Humble Robotics"], trends: ["IA physique & robotique", "Financement IA"],
    url: "https://techcrunch.com/" },
  { id: 38, country: "Taïwan", flag: "🇹🇼", categories: ["logiciel_ia", "economie_regulation"], date: "15 juin 2026", source: "DigiTimes",
    title: "SK Hynix et Foxconn resserreraient leurs liens sur l'IA",
    summary: "Alors que le secteur taïwanais de la conception de puces enregistre ses meilleurs gains depuis des années, des discussions viseraient à approfondir la chaîne d'approvisionnement IA entre Taïwan et la Corée du Sud.",
    companies: ["SK Hynix", "Foxconn"], trends: ["Chaînes d'approvisionnement", "Semi-conducteurs & export controls"],
    url: "https://www.digitimes.com/news/a20260615PD212/substrate-exports-capacity-2026-market.html" },
  { id: 39, country: "Brésil", flag: "🇧🇷", categories: ["industrie_defense"], date: "24 avril 2026", source: "Aeroflap",
    title: "Embraer veut aussi construire des frégates",
    summary: "Un protocole d'accord avec le ministère brésilien de la Défense et l'allemand TKMS ouvre la voie à un second lot de quatre frégates Tamandaré, prolongeant le transfert de technologie naval entre les deux pays.",
    companies: ["Embraer", "TKMS"], trends: ["Marine & sous-marins", "Souveraineté technologique"],
    url: "https://www.aeroflap.com.br/fr/Embraer-ne-se-contente-pas-de-construire-des-avions-et-ambitionne-de-b%C3%A2tir-des-fr%C3%A9gates./" },
  { id: 40, country: "Brésil", flag: "🇧🇷", categories: ["industrie_defense", "fabrication"], date: "26 mars 2026", source: "Zonebourse",
    title: "Premier chasseur Gripen E assemblé au Brésil",
    summary: "Fruit d'une coopération entre Embraer, Saab et la force aérienne brésilienne, cet appareil fait entrer le pays dans le cercle restreint des nations capables de produire des chasseurs supersoniques avancés.",
    companies: ["Embraer", "Saab"], trends: ["Souveraineté technologique"],
    url: "https://www.zonebourse.com/actualite-bourse/embraer-devoile-le-premier-chasseur-gripen-e-produit-au-bresil-ce7e51dad188f123" },
  { id: 41, country: "Émirats arabes unis", flag: "🇦🇪", categories: ["logiciel_ia", "energie"], date: "juin 2025", source: "LesNews",
    title: "Stargate UAE : un géant du calcul IA prend forme dans le Golfe",
    summary: "Porté par OpenAI, G42, Oracle, Nvidia et SoftBank, ce hub de data centers doit atteindre 1 gigawatt de capacité, dont 200 mégawatts dès 2026.",
    companies: ["OpenAI", "G42", "Oracle", "Nvidia", "SoftBank"], trends: ["IA & entreprise"],
    url: "https://lesnews.ca/intelligence-artificielle/arabie-saoudite-et-emirats-en-course-pour-la-suprematie-de-lia-au-moyen-orient/" },
  { id: 42, country: "Arabie saoudite", flag: "🇸🇦", categories: ["logiciel_ia", "energie"], date: "28 avril 2026", source: "Agence de presse saoudienne (SPA)",
    title: "Riyad multiplie les data centers pour son ambition IA",
    summary: "La capacité opérationnelle du royaume est passée de 68 à plus de 440 mégawatts en quatre ans, avec plus de 60 centres de données désormais en service, dans le cadre de Vision 2030.",
    companies: ["NEOM"], trends: ["IA & entreprise"],
    url: "https://spa.gov.sa/fr/N2572947" },
  { id: 43, country: "Pologne", flag: "🇵🇱", categories: ["industrie_defense", "economie_regulation"], date: "29 juin 2026", source: "Zone Militaire",
    title: "Varsovie commande trois sous-marins A26 à Saab",
    summary: "Le contrat de 4,6 milliards d'euros, notifié lors d'un sommet à Gdynia, met fin à sept mois de négociation. Saab l'emporte face à Naval Group, TKMS et Fincantieri dans le cadre du programme Orka.",
    companies: ["Saab", "TKMS", "Naval Group"], trends: ["Réarmement", "Marine & sous-marins"],
    url: "https://www.opex360.com/2026/06/29/la-pologne-confirme-la-commande-de-trois-sous-marins-de-type-a26-aupres-de-saab-pour-plus-de-4-milliards-deuros/" },
  { id: 44, country: "Pologne", flag: "🇵🇱", categories: ["industrie_defense", "fabrication"], date: "30 mai 2026", source: "Forum Militaire",
    title: "257 véhicules blindés Borsuk commandés, sur un total visé de 1 400",
    summary: "Un nouveau contrat de 2,07 milliards de dollars porté par le consortium PGZ-HSW illustre le rythme de réarmement polonais, désormais porté à environ 4,8 % du PIB.",
    companies: ["PGZ", "HSW"], trends: ["Réarmement", "Consolidation industrielle"],
    url: "https://www.forum-militaire.fr/encore-146-vehicules-blindes-commandes-par-la-pologne-et-ce-nest-que-le-haut-de-liceberg-puisque-varsovie-en-voudrait-1-400-au-total-dici-dix-ans/" },
  { id: 45, country: "Pologne", flag: "🇵🇱", categories: ["industrie_defense", "economie_regulation"], date: "juin 2026", source: "L'Essentiel de l'Éco",
    title: "La Pologne, championne des dépenses OTAN, courtise les industriels français",
    summary: "À Eurosatory 2026, Varsovie présente son écosystème de sous-traitance (PGM, réseau Łukasiewicz) aux groupes français et européens en quête de nouveaux partenaires de production.",
    companies: ["PGZ"], trends: ["Réarmement", "Consolidation industrielle"],
    url: "https://lessentieldeleco.fr/7284-eurosatory-2026-la-pologne-championne-des-depenses-de-defense-de-lotan-tend-la-main-aux-industriels-francais/" },
  { id: 46, country: "Australie", flag: "🇦🇺", categories: ["industrie_defense", "economie_regulation"], date: "22 mai 2026", source: "Zone Militaire",
    title: "Canberra prolonge ses vieux sous-marins Collins jusqu'en 2040",
    summary: "6,7 milliards d'euros doivent maintenir la flotte actuelle en service face aux retards du programme AUKUS, qui doit fournir à terme des sous-marins nucléaires américains et britanniques.",
    companies: ["AUKUS"], trends: ["Marine & sous-marins", "Réarmement"],
    url: "https://www.opex360.com/2026/05/22/laustralie-va-depenser-67-milliards-deuros-pour-garder-ses-vieux-sous-marins-de-type-collins-en-service-jusquen-2040/" },
  { id: 47, country: "Australie", flag: "🇦🇺", categories: ["industrie_defense", "economie_regulation"], date: "31 mai 2026", source: "La Libre",
    title: "AUKUS revu : l'Australie recevra des sous-marins Virginia d'occasion",
    summary: "Washington, Londres et Canberra simplifient l'accord initial : les trois submersibles nucléaires promis à l'Australie viendront directement de la flotte en service de l'US Navy plutôt que d'être neufs.",
    companies: ["AUKUS"], trends: ["Marine & sous-marins", "Réarmement"],
    url: "https://www.lalibre.be/international/oceanie/2026/05/31/laustralie-va-recevoir-des-sous-marins-americains-doccasion-dans-le-cadre-dun-accord-rationalise-4WOC2LNHOVDMZEHYCNSTGU4ENI/" },
  { id: 48, country: "Italie", flag: "🇮🇹", categories: ["industrie_defense", "fabrication"], date: "16 juin 2026", source: "Zone Armée",
    title: "Leonardo dévoile son véhicule blindé amphibie à Eurosatory",
    summary: "Le VBA, destiné à la marine italienne, combine mobilité, protection et modularité pour des opérations littorales — une vitrine de plus pour l'industriel transalpin sur le segment naval et terrestre.",
    companies: ["Leonardo"], trends: ["Réarmement"],
    url: "https://www.zonearmee.com/eurosatory-2026-leonardo-presente-le-vehicule-blinde-vba-pour-la-marine-italienne/" },
  { id: 49, country: "Italie", flag: "🇮🇹", categories: ["industrie_defense", "economie_regulation"], date: "9 janvier 2026", source: "Atalayar",
    title: "Leonardo bâtit un géant industriel entre Rome et Berlin",
    summary: "Avec 17,8 milliards d'euros de chiffre d'affaires et 80 % d'exportations, le groupe italien a repris Iveco Defence Vehicles et formalisé une coentreprise à 50/50 avec Rheinmetall pour succéder au char Ariete — signe d'une consolidation accélérée de la BITD européenne.",
    companies: ["Leonardo", "Rheinmetall", "Iveco Defence Vehicles"], trends: ["Consolidation industrielle", "Réarmement"],
    url: "https://www.atalayar.com/en/articulo/new-technologies-innovation/leonardo-italys-leading-technology-voice-in-the-aerospace-and-defence-sector/20260109190000222200.html" },
  { id: 50, country: "Italie", flag: "🇮🇹", categories: ["industrie_defense", "economie_regulation"], date: "19 mai 2026", source: "IREFI / Le Monde",
    title: "Changement de direction chez Leonardo en pleine montée en cadence",
    summary: "Lorenzo Mariani prend la tête du groupe avec un profil industriel affirmé, chargé notamment de superviser le GCAP, le chasseur de 6ᵉ génération développé avec BAE Systems et Mitsubishi Heavy Industries.",
    companies: ["Leonardo", "BAE Systems", "Mitsubishi Heavy Industries"], trends: ["Réarmement", "Consolidation industrielle"],
    url: "https://irefi.eu/lorenzo-mariani-prend-les-renes-de-leonardo-un-tournant-industriel-pour-le-geant-italien-de-la-defense/" },
  { id: 51, country: "Canada", flag: "🇨🇦", categories: ["industrie_defense", "economie_regulation"], date: "9 mars 2026", source: "Gouvernement du Canada",
    title: "Ottawa investit 900 M$ dans sa nouvelle stratégie industrielle de défense",
    summary: "Le Conseil national de recherches finance des capacités souveraines en drones, quantique et biomédical, via un nouveau Drone Innovation Hub et un partenariat renforcé avec l'industrie canadienne.",
    companies: ["Conseil national de recherches Canada"], trends: ["Souveraineté technologique", "Réarmement"],
    url: "https://www.canada.ca/en/innovation-science-economic-development/news/2026/03/canada-advances-defence-industrial-strategy-to-strengthen-security-sovereignty-and-prosperity.html" },
  { id: 52, country: "Canada", flag: "🇨🇦", categories: ["logiciel_ia", "robotique", "economie_regulation"], date: "17 février 2026", source: "Cabinet du Premier ministre du Canada",
    title: "Carney lance la première stratégie industrielle de défense du pays",
    summary: "Le nouveau bureau BOREALIS doit coordonner la recherche de pointe en IA, quantique et systèmes autonomes, avec l'objectif de porter à 70 % la part des acquisitions confiées à des entreprises canadiennes.",
    companies: ["BOREALIS", "Conseil national de recherches Canada"], trends: ["Souveraineté technologique"],
    url: "https://www.pm.gc.ca/en/news/news-releases/2026/02/17/prime-minister-carney-launches-canadas-first-defence-industrial" },
  { id: 53, country: "Turquie", flag: "🇹🇷", categories: ["robotique", "industrie_defense", "economie_regulation"], date: "3 février 2026", source: "Türkiye Today",
    title: "Baykar bat son record à 2,2 milliards de dollars d'exportations",
    summary: "Le turc reste pour la troisième année consécutive le premier exportateur mondial de drones armés ; son drone de combat Kizilelma doit entrer en service en 2026.",
    companies: ["Baykar", "Roketsan"], trends: ["Guerre des drones", "Réarmement"],
    url: "https://www.turkiyetoday.com/nation/baykar-sets-22b-export-record-kizilelma-to-enter-inventory-in-2026-3213966" },
  { id: 54, country: "Turquie", flag: "🇹🇷", categories: ["robotique", "logiciel_ia"], date: "16 mars 2026", source: "Breaking Defense",
    title: "Baykar dévoile son drone kamikaze K2 doté d'IA d'essaim",
    summary: "Le nouvel appareil a réussi des vols de formation autonomes à cinq exemplaires, une capacité jugée décisive pour son potentiel à l'export dans un marché mondial très concurrentiel.",
    companies: ["Baykar"], trends: ["Guerre des drones", "IA physique & robotique"],
    url: "https://breakingdefense.com/2026/03/baykar-unveils-k2-kamikaze-drone-with-swarming-capabilities/" },
  { id: 55, country: "Turquie", flag: "🇹🇷", categories: ["industrie_defense", "economie_regulation", "robotique"], date: "8 janvier 2026", source: "War on the Rocks",
    title: "Après avoir racheté l'italien Piaggio, Baykar s'allie à Leonardo",
    summary: "La coentreprise LBA Systems doit combiner les plateformes turques et les capteurs italiens pour produire des drones conformes aux standards de l'OTAN, avec un premier prototype attendu en 2026.",
    companies: ["Baykar", "Leonardo"], trends: ["Consolidation industrielle", "Réarmement"],
    url: "https://warontherocks.com/2026/01/turkeys-drone-industry-at-a-strategic-crossroads" },
  { id: 56, country: "Indonésie", flag: "🇮🇩", categories: ["robotique", "industrie_defense", "economie_regulation"], date: "13 mai 2026", source: "Defence Industry EU",
    title: "L'Indonésie commande 12 drones de combat Kizilelma à Baykar",
    summary: "Premier contrat export de ce modèle turc, il prévoit aussi une production, une maintenance et une formation locales, avec une option pour 48 appareils supplémentaires.",
    companies: ["Baykar", "Republikorp"], trends: ["Guerre des drones", "Souveraineté technologique"],
    url: "https://defence-industry.eu/turkiyes-baykar-secures-first-export-order-for-bayraktar-kizilelma-combat-drones-from-indonesia/" },
  { id: 57, country: "Afrique du Sud", flag: "🇿🇦", categories: ["industrie_defense", "economie_regulation"], date: "6 janvier 2026", source: "Wikipédia",
    title: "Denel reste connecté aux grands groupes européens malgré ses difficultés",
    summary: "Le sud-africain conserve une coentreprise de munitions avec l'allemand Rheinmetall (Rheinmetall Denel Munition) et une participation dans l'optronique aux côtés d'Airbus Defence and Space.",
    companies: ["Denel", "Rheinmetall", "Airbus Defence and Space"], trends: ["Consolidation industrielle"],
    url: "https://fr.wikipedia.org/wiki/Denel_(Afrique_du_Sud)" },
  { id: 58, country: "Afrique du Sud", flag: "🇿🇦", categories: ["economie_regulation", "logiciel_ia"], date: "18 mai 2026", source: "Africa News Agency",
    title: "Pretoria consacre 572 millions de dollars à l'innovation",
    summary: "Ce budget 2026-2027 doit financer l'intelligence artificielle, la fabrication de vaccins et les infrastructures scientifiques, avec l'objectif de porter la R&D à 1,5 % du PIB.",
    companies: [], trends: ["IA & entreprise"],
    url: "https://africa-news-agency.com/afrique-du-sud-572-millions-pour-accelerer-linnovation-et-la-recherche/" },
  { id: 59, country: "Maroc", flag: "🇲🇦", categories: ["fabrication", "economie_regulation"], date: "27 mai 2026", source: "Le Desk",
    title: "Le Maroc détrône l'Afrique du Sud à la tête de l'industrie africaine",
    summary: "Porté par l'automobile et une filière aéronautique qui a attiré Boeing, Safran et Airbus autour de Casablanca et Tanger, le royaume prend la première place du nouveau baromètre industriel de la BAD.",
    companies: ["Boeing", "Safran", "Airbus"], trends: ["Consolidation industrielle"],
    url: "https://ledesk.ma/datadesk/le-maroc-detrone-lafrique-du-sud-a-la-tete-de-lindustrie-africaine/" },
  { id: 60, country: "Chine", flag: "🇨🇳", categories: ["materiaux", "capteurs_comms"], date: "5 novembre 2025", source: "Advanced Materials Technologies (Wiley)",
    title: "Vers des matériaux furtifs actifs sur plusieurs bandes à la fois",
    summary: "Des chercheurs de l'université Beihang passent en revue les stratégies permettant de combiner l'absorption micro-ondes/térahertz et le camouflage infrarouge dans un même matériau — un axe clé pour la furtivité multi-spectrale de nouvelle génération.",
    companies: ["Université Beihang"], trends: ["Matériaux furtifs"],
    url: "https://advanced.onlinelibrary.wiley.com/doi/10.1002/admt.202501616" },
  { id: 61, country: "Allemagne", flag: "🇩🇪", categories: ["fabrication", "materiaux"], date: "20 avril 2026", source: "Tech Xplore",
    title: "Impression 3D multi-matériaux pour l'aérospatial et la mécanique",
    summary: "Le Karlsruhe Institute of Technology dévoile CeraMMAM, un procédé capable de produire en une seule fois des pièces haute performance combinant plusieurs matériaux via un système de liant universel, présenté au salon Hannover Messe.",
    companies: ["Karlsruhe Institute of Technology"], trends: ["Fabrication additive"],
    url: "https://techxplore.com/news/2026-04-multi-material-3d-industrial-applications.html" },
  { id: 62, country: "Royaume-Uni", flag: "🇬🇧", categories: ["logiciel_ia", "energie"], date: "1 avril 2026", source: "Rest of World",
    title: "L'IA frugale s'impose face aux géants du cloud",
    summary: "Le Frugal AI Hub de Cambridge et plusieurs équipes de recherche développent des modèles d'IA volontairement allégés, capables de tourner hors ligne sur du matériel peu coûteux — une piste directe pour l'autonomie énergétique et la souveraineté numérique loin des grands centres de calcul.",
    companies: ["Frugal AI Hub (Cambridge)"], trends: ["IA frugale"],
    url: "https://restofworld.org/2026/frugal-ai-big-tech/" },
  { id: 63, country: "États-Unis", flag: "🇺🇸", categories: ["robotique", "sante_biotech"], date: "17 juin 2026", source: "Science Robotics / Northwestern University",
    title: "Un exosquelette bidirectionnel pour réapprendre à marcher après un AVC",
    summary: "Des chercheurs de Northwestern couplent virtuellement thérapeute et patient, chacun équipé d'un exosquelette des membres inférieurs relié par un système ressort-amortisseur, ce qui améliore l'amplitude articulaire et l'activation musculaire par rapport à la rééducation classique. Les algorithmes de couplage de force homme-machine mis au point pour cette rééducation intéressent directement les exosquelettes d'assistance au combattant.",
    companies: ["Northwestern University", "Shirley Ryan AbilityLab"], trends: ["IA physique & robotique"],
    url: "https://news.northwestern.edu/stories/2026/06/new-exoskeleton-therapy-could-redefine-how-stroke-survivors-relearn-to-walk" },
  { id: 64, country: "Japon", flag: "🇯🇵", categories: ["robotique", "espace"], date: "18 juin 2026", source: "JAXA / Science Robotics",
    title: "Le mini-robot lunaire transformable SORA-Q livre ses résultats de navigation autonome",
    summary: "La JAXA, Sony, TOMY et l'université Doshisha publient l'analyse complète du robot LEV-2/SORA-Q (78 mm, 228 g), qui s'est déplié seul d'une forme sphérique vers une configuration à deux roues sur la Lune, s'est déplacé et a transmis des images sans téléopération. Cette miniaturisation extrême couplée à une locomotion autonome par transformation intéresse les robots de reconnaissance de petite taille.",
    companies: ["JAXA", "Sony", "TOMY", "Université Doshisha"], trends: ["IA physique & robotique"],
    url: "https://global.jaxa.jp/press/2026/06/20260618-1_e.html" },
  { id: 65, country: "États-Unis", flag: "🇺🇸", categories: ["espace", "capteurs_comms"], date: "17 juin 2026", source: "Space.com",
    title: "Record de la plus grande antenne commerciale en orbite basse pour la connexion directe aux mobiles",
    summary: "SpaceX a mis en orbite trois satellites BlueBird d'AST SpaceMobile, chacun doté d'un réseau phasé déployable d'environ 220 m², pour connecter directement des smartphones 4G/5G standards à 120 Mbit/s sans terminal spécifique. Ces grandes antennes déployables et les liaisons satellite-terminal direct intéressent les communications militaires résilientes, indépendantes des infrastructures au sol.",
    companies: ["AST SpaceMobile", "SpaceX"], trends: ["Souveraineté technologique"],
    url: "https://www.space.com/space-exploration/launches-spacecraft/spacex-falcon-9-bluebird-8-to-10-direct-to-cell-launch" },
  { id: 66, country: "Allemagne", flag: "🇩🇪", categories: ["capteurs_comms"], date: "23 juin 2026", source: "Helmholtz-Zentrum Berlin",
    title: "Premier spectromètre X à capteurs supraconducteurs TES d'Europe mis en service",
    summary: "Le HZB, avec le Max Planck Institute for Chemical Energy Conversion et le NIST américain, met en service sur la source de lumière BESSY II un spectromètre à 248 capteurs à transition supraconductrice refroidis à 25 milliKelvin, multipliant par 100 à 1000 l'efficacité de détection de photons par rapport aux spectromètres classiques. Cette détection ultrasensible de photons est aussi une brique clé des technologies de détection de traces utilisées en criminalistique nucléaire.",
    companies: ["Helmholtz-Zentrum Berlin", "Max Planck Institute for Chemical Energy Conversion", "NIST"], trends: ["Souveraineté technologique"],
    url: "https://www.sciencedaily.com/releases/2026/06/260623083108.htm" },
  { id: 67, country: "États-Unis", flag: "🇺🇸", categories: ["robotique", "logiciel_ia"], date: "22 juin 2026", source: "NVIDIA Newsroom",
    title: "NVIDIA étend sa pile de sécurité des véhicules autonomes aux robots physiques",
    summary: "NVIDIA lance Halos for Robotics, une architecture associant calculateurs IGX Thor, couche logicielle de sécurité et laboratoire de certification accrédité pour homologuer robots et humanoïdes autonomes ; Agility Robotics est le premier partenaire à l'adopter pour ses humanoïdes logistiques. Une architecture normalisée de certification de sécurité pour systèmes physiques autonomes pourrait s'étendre à la certification de robots terrestres militaires.",
    companies: ["NVIDIA", "Agility Robotics", "Amazon", "Toyota"], trends: ["IA physique & robotique"],
    url: "https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai" },
  { id: 68, country: "Belgique", flag: "🇧🇪", categories: ["materiaux", "capteurs_comms"], date: "22 juin 2026", source: "imec",
    title: "Des transistors à matériaux 2D intégrés sur plaque de 300 mm, une étape vers l'après-silicium",
    summary: "Imec, ASML et TSMC démontrent pour la première fois des transistors complémentaires à base de matériaux bidimensionnels (MoS2 et WS2/WSe2) intégrés sur une plaque complète de 300 mm avec un pas de grille de 50 nm, une étape charnière avant l'épuisement des gains de miniaturisation du silicium. 94 % des transistors obtenus fonctionnent correctement, avec un rapport on/off supérieur à 100 000.",
    companies: ["imec", "ASML", "TSMC"], trends: ["Semi-conducteurs & export controls"],
    url: "https://www.imec-int.com/en/press/asml-tsmc-and-imec-bring-industry-ready-2d-material-transistors-closer-breakthrough-300mm" },
  { id: 69, country: "Chine", flag: "🇨🇳", categories: ["logiciel_ia", "capteurs_comms"], date: "3 juillet 2026", source: "Science",
    title: "Une puce à mémoire à changement de phase calcule un réseau neuronal en moins de 10 millisecondes",
    summary: "Des équipes de l'université de Pékin et de l'Académie chinoise des sciences présentent une puce memristive de 40 nm effectuant un calcul neurodynamique en mémoire en 2,12 millisecondes par étape, jusqu'à plusieurs centaines de fois plus vite qu'un GPU Nvidia A100 sur une tâche de reconstruction corticale, pour une consommation très réduite. Ce calcul en mémoire, ultra-rapide et sobre en énergie, vise les applications d'IA embarquée et de fusion de capteurs en temps réel.",
    companies: ["Université de Pékin", "Académie chinoise des sciences"], trends: ["IA physique & robotique"],
    url: "https://www.science.org/doi/10.1126/science.aee6277" },
  { id: 70, country: "Chine", flag: "🇨🇳", categories: ["logiciel_ia", "capteurs_comms"], date: "24 juin 2026", source: "China Daily / Quantum Computing Report",
    title: "Un ordinateur quantique photonique de 2682 photons mis en exploitation commerciale",
    summary: "China Telecom Quantum Group et Jiuzhang (Jinan) Quantum Technology mettent en service le calculateur photonique Tianyan-P2000, relié à une plateforme cloud, et revendiquent l'exécution d'un calcul de référence en 29 microsecondes contre environ 16 milliards d'années pour un supercalculateur classique. Cet avantage quantique accessible en ligne intéresse directement la cryptanalyse et la planification post-quantique.",
    companies: ["China Telecom Quantum Group", "Jiuzhang (Jinan) Quantum Technology", "Académie chinoise des sciences"], trends: ["Souveraineté technologique"],
    url: "https://quantumcomputingreport.com/china-telecom-deploys-2682-photon-tianyan-p2000-web-platform-to-achieve-dual-modality-quantum-advantage-services/amp/" },
  { id: 71, country: "France", flag: "🇫🇷", categories: ["sante_biotech", "materiaux"], date: "16 juin 2026", source: "France 3 Régions",
    title: "Une biotech du marc de café primée pour un pansement connecté de zone de guerre",
    summary: "La startup rémoise V.Biotech, d'abord tournée vers la valorisation cosmétique du marc de café, remporte le premier prix DefStart à Eurosatory pour P2i, un pansement connecté détectant précocement l'infection et le stade de cicatrisation, pensé pour les blessés de guerre avant une déclinaison civile. Une levée de fonds de 3,5 millions d'euros doit financer un site de production dans le Cher.",
    companies: ["V.Biotech", "Eurosatory / DefStart"], trends: ["Médecine de terrain"],
    url: "https://france3-regions.franceinfo.fr/grand-est/marne/un-pansement-intelligent-pour-les-zones-de-guerre-cette-biotech-francaise-recompensee-3374017.html" },
  { id: 72, country: "Inde", flag: "🇮🇳", categories: ["sante_biotech", "materiaux"], date: "18 mai 2026", source: "Advanced Materials (Wiley)",
    title: "Un nanozyme à base d'oxyde de cérium élimine le staphylocoque doré résistant et accélère la cicatrisation",
    summary: "Des chercheurs du NIAB et du RCB indiens conçoivent un nanozyme à oxyde de cérium couplé à la glucose-oxydase qui génère des espèces réactives de l'oxygène au contact du glucose, éliminant des souches cliniques de SARM productrices de bêta-lactamase et accélérant la fermeture des plaies chez l'animal, sans recourir aux antibiotiques classiques. Une piste directement utile contre les infections de plaies de guerre résistantes aux antibiotiques.",
    companies: ["National Institute of Animal Biotechnology", "Regional Centre for Biotechnology"], trends: ["Médecine de terrain"],
    url: "https://advanced.onlinelibrary.wiley.com/doi/10.1002/adma.202520966" },
  { id: 73, country: "Finlande", flag: "🇫🇮", categories: ["economie_regulation", "capteurs_comms"], date: "2 juillet 2026", source: "HPCwire",
    title: "IQM devient la première entreprise européenne d'informatique quantique cotée à Wall Street",
    summary: "Le finlandais IQM Quantum Computers finalise sa fusion avec le SPAC coté Real Asset Acquisition Corp et débute sa cotation au Nasdaq sous le symbole IQMX, levant environ 199 millions d'euros pour une valorisation pré-money proche de 1,8 milliard de dollars. La société a déjà livré 18 de ses 23 ordinateurs quantiques supraconducteurs vendus, dont un au laboratoire national américain d'Oak Ridge.",
    companies: ["IQM Quantum Computers", "Real Asset Acquisition Corp", "Oak Ridge National Laboratory"], trends: ["Souveraineté technologique"],
    url: "https://www.hpcwire.com/off-the-wire/iqm-completes-spac-merger-and-begins-trading-on-nasdaq-as-iqmx/" },
  { id: 74, country: "États-Unis", flag: "🇺🇸", categories: ["energie", "espace"], date: "1 juin 2026", source: "MIT News",
    title: "Une propulsion bimode permet aux nanosatellites d'être à la fois rapides et économes en carburant",
    summary: "Des chercheurs du MIT montrent qu'un même propergol vert, l'ASCENT initialement développé par l'US Air Force pour remplacer l'hydrazine, peut alimenter depuis un réservoir unique un propulseur chimique pour des poussées rapides et des propulseurs à électrospray pour des manœuvres de précision économes en carburant. Une démonstration en vol sur un CubeSat de la NASA est prévue fin 2026.",
    companies: ["MIT", "US Air Force", "NASA"], trends: ["Propulsion spatiale"],
    url: "https://news.mit.edu/2026/new-propulsion-system-could-make-tiny-satellites-fast-fuel-efficient-0601" },
  { id: 75, country: "États-Unis", flag: "🇺🇸", categories: ["energie"], date: "4 juin 2026", source: "U.S. Army",
    title: "Un micro-réacteur nucléaire civil atteint la criticité pour l'autonomie énergétique des bases militaires",
    summary: "La startup civile Antares Nuclear atteint la criticité à puissance nulle de son démonstrateur Mark-0, un micro-réacteur refroidi par caloducs au sodium et alimenté en combustible TRISO HALEU, au laboratoire national d'Idaho — une première pour un réacteur privé non à eau légère depuis 40 ans. Le résultat conforte le programme Janus de l'armée américaine, qui vise à déployer ces micro-réacteurs pour l'autonomie énergétique de ses installations.",
    companies: ["Antares Nuclear", "U.S. Department of Energy", "Idaho National Laboratory", "U.S. Army"], trends: ["Souveraineté technologique"],
    url: "https://www.army.mil/article/293057/antares_nuclears_successful_zero_power_criticality_test_marks_major_step_for_military_applications_of_advanced_microreactors" },
  { id: 76, country: "Allemagne", flag: "🇩🇪", categories: ["energie", "materiaux"], date: "21 juin 2026", source: "Cell Reports Physical Science",
    title: "Premier démontage indépendant d'une batterie sodium-ion commerciale chinoise",
    summary: "Des chercheurs de RWTH Aachen analysent une batterie sodium-ion du fabricant chinois Hina, déjà déployée dans des véhicules et du stockage stationnaire en Chine, et révèlent une architecture de collecteurs de courant en aluminium sans languette proche de celle des cellules Tesla, avec une qualité de fabrication comparable malgré des lacunes en densité énergétique et en charge par temps froid. L'une des premières validations scientifiques indépendantes de cette filière batterie alternative au lithium.",
    companies: ["RWTH Aachen University", "Hina Battery Technology"], trends: ["Chaînes d'approvisionnement"],
    url: "https://www.cell.com/cell-reports-physical-science/fulltext/S2666-3864(26)00229-8" },
];

/* ------------------------------------------------------------------ */
/*  LIVE REFRESH — calls the Anthropic API (web search tool) directly   */
/*  from the artifact to pull fresh items from anywhere in the world.   */
/* ------------------------------------------------------------------ */

const REFRESH_PROMPT = `Tu es un service de veille pour un chargé de projet innovation au ministère des Armées, qui repère des innovations civiles à potentiel dual-use dans N'IMPORTE QUEL domaine (matériaux, logiciel, procédés, robotique, données, fabrication additive, énergie, capteurs, espace, santé, économie/régulation). Cherche sur le web des actualités RÉCENTES et FIABLES (revues à comité de lecture, presse spécialisée établie, instituts de recherche, agences de presse reconnues), n'importe où dans le monde.

N'impose AUCUN quota : ni de pays, ni de catégorie, ni de nombre d'articles. Le seul critère est la pertinence et la fiabilité de la source — pas un équilibre statistique.

Réponds EXCLUSIVEMENT avec un tableau JSON valide, sans texte autour, sans balises markdown ni \`\`\`. Chaque objet du tableau doit suivre exactement ce schéma :
{
  "country": "nom du pays en français",
  "flag": "emoji drapeau du pays",
  "categories": ["1 à 3 valeurs parmi: materiaux, fabrication, robotique, logiciel_ia, energie, capteurs_comms, espace, sante_biotech, industrie_defense, economie_regulation"],
  "date": "date approximative en français",
  "source": "nom du média",
  "title": "titre factuel court, max 12 mots, en français",
  "summary": "résumé reformulé en français en 1-2 phrases, jamais recopié mot pour mot",
  "companies": ["2 à 5 entreprises ou organisations citées"],
  "trends": ["1 à 2 thèmes courts en français"],
  "url": "URL réelle de la page trouvée"
}

Renvoie autant d'objets que le justifie la qualité réelle de ce que tu trouves — cela peut être 2 ou 15, sans chercher un nombre rond.`;

function extractJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("Aucun JSON exploitable dans la réponse.");
  return JSON.parse(text.slice(start, end + 1));
}

async function fetchFreshNews() {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: REFRESH_PROMPT }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  if (!resp.ok) throw new Error(`Requête échouée (${resp.status})`);
  const data = await resp.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const parsed = extractJsonArray(text);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Réponse vide ou invalide.");
  const base = Date.now();
  return parsed
    .filter((it) => it && it.title && Array.isArray(it.categories) && it.categories.some((c) => CATS[c]))
    .map((it, i) => ({
      id: base + i,
      country: it.country || "Inconnu",
      flag: it.flag || "🌐",
      categories: it.categories.filter((c) => CATS[c]).slice(0, 4),
      date: it.date || "récemment",
      source: it.source || "Web",
      title: String(it.title),
      summary: it.summary ? String(it.summary) : "",
      companies: Array.isArray(it.companies) ? it.companies.slice(0, 6).map(String) : [],
      trends: Array.isArray(it.trends) ? it.trends.slice(0, 2).map(String) : [],
      url: typeof it.url === "string" && it.url.startsWith("http") ? it.url : null,
      fresh: true,
    }));
}

/* ------------------------------------------------------------------ */
/*  NETWORK GRAPH — company co-occurrence, laid out with d3-force.      */
/*  Node color = the category most often associated with that company,  */
/*  computed live from whatever is in the feed (fully dynamic).         */
/* ------------------------------------------------------------------ */

function useNetworkLayout(items, width, height) {
  return useMemo(() => {
    const counts = new Map();
    const catCounts = new Map();
    const linkMap = new Map();
    items.forEach((n) => {
      n.companies.forEach((c) => {
        counts.set(c, (counts.get(c) || 0) + 1);
        if (!catCounts.has(c)) catCounts.set(c, {});
        const bucket = catCounts.get(c);
        n.categories.forEach((cat) => { bucket[cat] = (bucket[cat] || 0) + 1; });
      });
      for (let i = 0; i < n.companies.length; i++) {
        for (let j = i + 1; j < n.companies.length; j++) {
          const a = n.companies[i], b = n.companies[j];
          const key = [a, b].sort().join("::");
          linkMap.set(key, (linkMap.get(key) || 0) + 1);
        }
      }
    });
    const nodes = Array.from(counts.entries()).map(([id, count]) => {
      const bucket = catCounts.get(id);
      const sector = Object.entries(bucket).sort((a, b) => b[1] - a[1])[0][0];
      return { id, count, sector };
    });
    const links = Array.from(linkMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split("::");
      return { source, target, weight };
    });
    if (nodes.length === 0) return { nodes: [], links: [] };

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(58).strength(0.55))
      .force("charge", d3.forceManyBody().strength(-90))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide((d) => 8 + d.count * 2.6))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();

    const pad = 24;
    nodes.forEach((n) => {
      n.x = Math.max(pad, Math.min(width - pad, n.x));
      n.y = Math.max(pad, Math.min(height - pad, n.y));
    });
    return { nodes, links };
  }, [items, width, height]);
}

function NetworkGraph({ items, selectedCompany, onSelectCompany, expanded = false }) {
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ w: 320, h: 300 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const h = expanded
        ? Math.max(420, Math.min(720, w * 0.75))
        : Math.max(260, Math.min(360, w * 0.72));
      setDims({ w: Math.max(260, w), h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  const { nodes, links } = useNetworkLayout(items, dims.w, dims.h);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const connected = useMemo(() => {
    if (!selectedCompany) return null;
    const set = new Set([selectedCompany]);
    links.forEach((l) => {
      const sId = l.source.id || l.source, tId = l.target.id || l.target;
      if (sId === selectedCompany) set.add(tId);
      if (tId === selectedCompany) set.add(sId);
    });
    return set;
  }, [selectedCompany, links]);

  if (nodes.length === 0) {
    return <div className="empty-graph">Aucun acteur à afficher pour ce filtre.</div>;
  }

  return (
    <div ref={wrapRef} className="graph-wrap">
      <svg width="100%" height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
        <defs>
          <radialGradient id="radarFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8A33D" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#E8A33D" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={dims.w} height={dims.h} fill="url(#radarFade)" />
        {[0.18, 0.32, 0.46].map((r, i) => (
          <circle key={i} cx={dims.w / 2} cy={dims.h / 2} r={r * Math.min(dims.w, dims.h)}
            fill="none" stroke="#24314A" strokeWidth="1" strokeDasharray="2 5" />
        ))}
        {links.map((l, i) => {
          const s = typeof l.source === "object" ? l.source : nodeById.get(l.source);
          const t = typeof l.target === "object" ? l.target : nodeById.get(l.target);
          if (!s || !t) return null;
          const dim = connected && !(connected.has(s.id) && connected.has(t.id));
          return (
            <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={dim ? "#1B2438" : "#5C7CA6"}
              strokeOpacity={dim ? 0.4 : 0.85}
              strokeWidth={Math.min(4, 0.8 + l.weight * 0.9)} />
          );
        })}
        {nodes.map((n) => {
          const r = (expanded ? 8 : 6) + n.count * (expanded ? 3.4 : 2.6);
          const dim = connected && !connected.has(n.id);
          const isSel = n.id === selectedCompany;
          const maxLen = expanded ? 26 : 16;
          const showLabel = n.count >= 2 || isSel || (connected && connected.has(n.id));
          return (
            <g key={n.id}
              onClick={() => onSelectCompany(isSel ? null : n.id)}
              style={{ cursor: "pointer" }}>
              <circle cx={n.x} cy={n.y} r={r}
                fill={CATS[n.sector].color}
                fillOpacity={dim ? 0.25 : 0.9}
                stroke={isSel ? "#E8A33D" : "#0B1220"}
                strokeWidth={isSel ? 2.5 : 1}>
                <title>{`${n.id} — ${n.count} article${n.count > 1 ? "s" : ""}`}</title>
              </circle>
              {showLabel && (
                <text x={n.x} y={n.y + r + (expanded ? 13 : 11)} textAnchor="middle"
                  fontSize={expanded ? "12" : "9.5"} fontFamily="'IBM Plex Mono', monospace"
                  fill={dim ? "#4A5670" : "#C7D0DE"}>
                  {n.id.length > maxLen ? n.id.slice(0, maxLen - 1) + "…" : n.id}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="network-top-list">
        <div className="network-top-caption">
          Top acteurs {!expanded && nodes.length > 8 ? `(8 sur ${nodes.length})` : `(${nodes.length})`}
        </div>
        <div className="network-top-rows">
          {[...nodes].sort((a, b) => b.count - a.count).slice(0, expanded ? 200 : 8).map((n) => (
            <button key={n.id}
              className={`network-top-row ${n.id === selectedCompany ? "network-top-row--active" : ""}`}
              onClick={() => onSelectCompany(n.id === selectedCompany ? null : n.id)}>
              <span className="legend-dot" style={{ background: CATS[n.sector].color, flexShrink: 0 }} />
              <span className="network-top-name">{n.id}</span>
              <span className="tab-count">{n.count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TREND BARS                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  WORLD MAP — proportional-symbol (bubble) map, not a choropleth: for  */
/*  raw counts rather than normalized rates, bubbles are the honest      */
/*  choice. Pure d3-geo math (projection + graticule) — no topojson/     */
/*  coastline file needed, so it renders identically in the Claude.ai    */
/*  artifact preview and the exported static site, with zero network.    */
/* ------------------------------------------------------------------ */

function WorldMap({ items, selectedCountryKey, onSelectCountry, expanded = false }) {
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ w: 320, h: 200 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const h = expanded
        ? Math.max(360, Math.min(620, w * 0.55))
        : Math.max(160, Math.min(260, w * 0.5));
      setDims({ w: Math.max(260, w), h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  const { projection, graticulePath, bubbles } = useMemo(() => {
    const projection = d3.geoNaturalEarth1()
      .scale(dims.w / 6.05)
      .translate([dims.w / 2, dims.h / 1.9]);
    const path = d3.geoPath(projection);
    const graticulePath = path(d3.geoGraticule().step([20, 20])());

    const byCountry = new Map();
    items.forEach((n) => {
      const key = `${n.flag} ${n.country}`;
      if (!byCountry.has(key)) {
        byCountry.set(key, { country: n.country, flag: n.flag, count: 0, cats: {} });
      }
      const bucket = byCountry.get(key);
      bucket.count += 1;
      n.categories.forEach((cat) => { bucket.cats[cat] = (bucket.cats[cat] || 0) + 1; });
    });

    const rawBubbles = Array.from(byCountry.entries())
      .map(([key, b]) => {
        const coords = COUNTRY_COORDS[b.country];
        if (!coords) return null;
        const [x, y] = projection(coords);
        const sector = Object.entries(b.cats).sort((a, c) => c[1] - a[1])[0][0];
        return { key, ...b, x0: x, y0: y, x, y, sector };
      })
      .filter(Boolean);

    const maxCount = Math.max(1, ...rawBubbles.map((b) => b.count));
    const radiusOf = (b) => (expanded ? 7 : 5) + (b.count / maxCount) * (expanded ? 24 : 16);
    rawBubbles.forEach((b) => { b.r = radiusOf(b); });

    // Dodge overlapping bubbles (e.g. France/Germany/Italy/Poland/UK cluster
    // in Western Europe) while keeping them anchored near their true
    // position — a mild "collision map" rather than a full cartogram.
    const sim = d3.forceSimulation(rawBubbles)
      .force("x", d3.forceX((d) => d.x0).strength(0.85))
      .force("y", d3.forceY((d) => d.y0).strength(0.85))
      .force("collide", d3.forceCollide((d) => d.r + (expanded ? 6 : 3)).strength(1))
      .stop();
    for (let i = 0; i < 150; i++) sim.tick();

    return { projection, graticulePath, bubbles: rawBubbles };
  }, [items, dims, expanded]);

  const maxCount = Math.max(1, ...bubbles.map((b) => b.count));
  const sizeRefs = Array.from(new Set([1, Math.max(1, Math.round(maxCount / 2)), maxCount])).sort((a, b) => a - b);

  return (
    <div ref={wrapRef} className="map-wrap">
      <svg width="100%" height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
        <path d={graticulePath} fill="none" stroke="#1C2740" strokeWidth="1" />
        {bubbles.map((b) => {
          const dodged = Math.hypot(b.x - b.x0, b.y - b.y0) > 2;
          return dodged ? (
            <line key={`leader-${b.key}`} x1={b.x0} y1={b.y0} x2={b.x} y2={b.y}
              stroke="#3A4A6B" strokeWidth="0.75" strokeDasharray="1.5 2" />
          ) : null;
        })}
        {bubbles.map((b) => {
          const r = b.r;
          const isSel = selectedCountryKey === b.key;
          const dim = selectedCountryKey && !isSel;
          return (
            <g key={b.key} onClick={() => onSelectCountry(isSel ? "all" : b.key)} style={{ cursor: "pointer" }}>
              <circle cx={b.x} cy={b.y} r={r} fill={CATS[b.sector].color}
                fillOpacity={dim ? 0.25 : 0.75} stroke={isSel ? "#E8A33D" : "#0B1220"}
                strokeWidth={isSel ? 2 : 1} />
              <text x={b.x} y={b.y - r - 3} textAnchor="middle" fontSize={expanded ? "12" : "9"}
                fontFamily="'IBM Plex Mono', monospace" fill={dim ? "#4A5670" : "#C7D0DE"}>
                {expanded ? `${b.flag} ${b.country} (${b.count})` : `${b.flag} ${b.count}`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        <div className="map-legend-group">
          <span className="map-legend-caption">Taille = articles</span>
          <svg width={90} height={40} viewBox="0 0 90 40">
            {sizeRefs.map((v, i) => {
              const r = 5 + (v / maxCount) * 16;
              const cx = 14 + i * 32;
              return (
                <g key={v}>
                  <circle cx={cx} cy={24} r={r} fill="none" stroke="#8B96AB" strokeWidth="1" />
                  <text x={cx} y={38} textAnchor="middle" fontSize="8.5" fontFamily="'IBM Plex Mono', monospace" fill="#8B96AB">{v}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="legend">
          {CAT_KEYS.map((c) => (
                  <span key={c}><span className="legend-dot" style={{ background: CATS[c].color }} />{CATS[c].icon} {CATS[c].label}</span>
                ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TIMELINE — event strip (dots colored by category) over a weekly      */
/*  density histogram, modeled on the classic intelligence-dashboard     */
/*  pattern: overview of recency/bursts before any per-article detail.   */
/* ------------------------------------------------------------------ */

function Timeline({ items, expanded = false }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(320);
  const height = expanded ? 320 : 140;
  const barMax = expanded ? 90 : 22;
  const baseline = height - (expanded ? 40 : 34);
  const dotR = expanded ? 5.5 : 4;
  const swarmTop = 8;
  const swarmBottom = baseline - barMax - (expanded ? 16 : 10);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.max(260, entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { dated, xScale, buckets, maxBucket } = useMemo(() => {
    const dated = items
      .map((it) => ({ ...it, _date: parseFrenchDate(it.date) }))
      .filter((it) => it._date);
    if (dated.length === 0) return { dated: [], xScale: null, buckets: [], maxBucket: 1 };

    const extent = d3.extent(dated, (d) => d._date);
    const pad = 18;
    const domain = extent[0].getTime() === extent[1].getTime()
      ? [d3.timeDay.offset(extent[0], -3), d3.timeDay.offset(extent[1], 3)]
      : extent;
    const xScale = d3.scaleTime().domain(domain).range([pad, width - pad]);

    const weekMs = 7 * 24 * 3600 * 1000;
    const bucketMap = new Map();
    dated.forEach((d) => {
      const bk = Math.floor(d._date.getTime() / weekMs);
      bucketMap.set(bk, (bucketMap.get(bk) || 0) + 1);
    });
    const buckets = Array.from(bucketMap.entries()).map(([bk, count]) => ({
      x0: xScale(new Date(bk * weekMs)),
      x1: xScale(new Date((bk + 1) * weekMs)),
      count,
    }));
    const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

    // Beeswarm: x is fixed to the true date, y is only used to dodge dots
    // that would otherwise overlap (several articles the same week/day).
    // This is what actually makes individual points legible again.
    const swarmCenter = (swarmTop + swarmBottom) / 2;
    dated.forEach((d) => { d.x = xScale(d._date); d.y = swarmCenter; });
    const sim = d3.forceSimulation(dated)
      .force("x", d3.forceX((d) => xScale(d._date)).strength(1))
      .force("y", d3.forceY(swarmCenter).strength(0.05))
      .force("collide", d3.forceCollide(dotR + 1.4))
      .stop();
    for (let i = 0; i < 140; i++) sim.tick();
    dated.forEach((d) => { d.y = Math.max(swarmTop, Math.min(swarmBottom, d.y)); });

    return { dated, xScale, buckets, maxBucket };
  }, [items, width, expanded]);

  if (dated.length === 0) {
    return <div className="empty-graph">Pas de dates exploitables pour cette sélection.</div>;
  }

  const ticks = xScale.ticks(width < 400 ? 3 : 5);
  const fmtDate = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const peakBucket = buckets.reduce((max, b) => (b.count > max ? b.count : max), 0);

  return (
    <div ref={wrapRef} className="timeline-wrap">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {buckets.map((b, i) => (
          <rect key={i} x={Math.min(b.x0, b.x1)} y={baseline - (b.count / maxBucket) * barMax}
            width={Math.max(1, Math.abs(b.x1 - b.x0) - 2)} height={(b.count / maxBucket) * barMax}
            fill="#1C2740" />
        ))}
        <line x1="0" y1={baseline} x2={width} y2={baseline} stroke="#24314A" strokeWidth="1" />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={xScale(t)} y1={baseline} x2={xScale(t)} y2={baseline + 4} stroke="#4A5670" strokeWidth="1" />
            <text x={xScale(t)} y={baseline + 16} textAnchor="middle" fontSize={expanded ? "11" : "8.5"}
              fontFamily="'IBM Plex Mono', monospace" fill="#8B96AB">{fmtDate(t)}</text>
          </g>
        ))}
        {dated.map((d) => (
          <circle key={d.id} cx={d.x} cy={d.y} r={dotR}
            fill={CATS[d.categories[0]].color} fillOpacity="0.9" stroke="#0B1220" strokeWidth="0.5"
            style={{ cursor: d.url ? "pointer" : "default" }}
            onClick={() => d.url && window.open(d.url, "_blank", "noopener,noreferrer")}>
            <title>{`${d.title} — ${d.country}, ${d.date}`}</title>
          </circle>
        ))}
      </svg>
      <div className="timeline-legend">
        <span className="timeline-peak">Pic : {peakBucket} article{peakBucket > 1 ? "s" : ""}/semaine</span>
        <div className="legend">
          {CAT_KEYS.map((c) => (
                  <span key={c}><span className="legend-dot" style={{ background: CATS[c].color }} />{CATS[c].icon} {CATS[c].label}</span>
                ))}
        </div>
      </div>
      {expanded && (
        <div className="timeline-detail-list">
          {[...dated].sort((a, b) => b._date - a._date).map((d) => (
            <div key={d.id} className="timeline-detail-row">
              <span className="legend-dot" style={{ background: CATS[d.categories[0]].color, flexShrink: 0 }} />
              <span className="timeline-detail-date">{d.date}</span>
              <span className="timeline-detail-country">{d.flag} {d.country}</span>
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="timeline-detail-title">
                  <span className="timeline-detail-cats">{d.categories.map((c) => CATS[c].icon).join(" ")}</span>
                  {d.title} <span className="ext-icon">↗</span>
                </a>
              ) : (
                <span className="timeline-detail-title">
                  <span className="timeline-detail-cats">{d.categories.map((c) => CATS[c].icon).join(" ")}</span>
                  {d.title}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function TrendBars({ items, expanded = false }) {
  const counts = useMemo(() => {
    const m = new Map();
    items.forEach((n) => n.trends.forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, expanded ? 100 : 7);
  }, [items, expanded]);
  const max = counts.length ? counts[0][1] : 1;

  if (counts.length === 0) return <div className="empty-graph">Aucune tendance pour ce filtre.</div>;

  return (
    <div className="trend-list">
      {counts.map(([name, count]) => (
        <div key={name} className="trend-row">
          <div className="trend-label">{name}</div>
          <div className="trend-track">
            <div className="trend-fill" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <div className="trend-count">{count}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  INSIGHT TEXT — a short written synthesis of the current selection,   */
/*  for a "quick read" when there's no time to scan charts. Purely       */
/*  computed from the data (counts, ranking) — no external call.        */
/* ------------------------------------------------------------------ */

function generateInsightText(items) {
  if (items.length === 0) {
    return "Aucun article ne correspond aux filtres actuels — élargissez la sélection pour voir apparaître une synthèse.";
  }

  const catCounts = {};
  items.forEach((n) => n.categories.forEach((c) => { catCounts[c] = (catCounts[c] || 0) + 1; }));
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  const topCatPct = Math.round((topCat[1] / items.length) * 100);

  const trendMap = new Map();
  items.forEach((n) => n.trends.forEach((t) => trendMap.set(t, (trendMap.get(t) || 0) + 1)));
  const topTrends = Array.from(trendMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);

  const countryMap = new Map();
  items.forEach((n) => {
    const key = `${n.flag} ${n.country}`;
    countryMap.set(key, (countryMap.get(key) || 0) + 1);
  });
  const topCountries = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);

  const companyMap = new Map();
  items.forEach((n) => n.companies.forEach((c) => companyMap.set(c, (companyMap.get(c) || 0) + 1)));
  const topCompanies = Array.from(companyMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const parts = [];

  parts.push(
    `Sur ${items.length} article${items.length > 1 ? "s" : ""} suivi${items.length > 1 ? "s" : ""}, ` +
    `la catégorie ${CATS[topCat[0]].label.toLowerCase()} domine (${topCatPct}%)` +
    (topTrends.length ? `, portée notamment par « ${topTrends[0][0]} »${topTrends[0][1] > 1 ? ` (${topTrends[0][1]} occurrences)` : ""}.` : ".")
  );

  if (topCountries.length) {
    const [c1, n1] = topCountries[0];
    const second = topCountries[1] ? ` devant ${topCountries[1][0]} (${topCountries[1][1]})` : "";
    parts.push(`${c1} concentre le plus d'activité (${n1} article${n1 > 1 ? "s" : ""})${second}.`);
  }

  if (topCompanies.length) {
    const names = topCompanies.map(([name, count]) => `${name} (${count})`).join(", ");
    parts.push(`Les acteurs les plus cités : ${names}.`);
  }

  if (topTrends.length > 1) {
    parts.push(`À surveiller aussi : « ${topTrends[1][0]} » (${topTrends[1][1]} mention${topTrends[1][1] > 1 ? "s" : ""}).`);
  }

  return parts.join(" ");
}


/* ------------------------------------------------------------------ */
/*  CHART MODAL — full-size zoom view for any panel, with backdrop      */
/*  click and Escape-to-close.                                          */
/* ------------------------------------------------------------------ */

function ChartModal({ title, hint, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {hint && <div className="panel-hint" style={{ marginBottom: 0 }}>{hint}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NEWS CARD                                                          */
/* ------------------------------------------------------------------ */

function NewsCard({ item, selectedCompany, onSelectCompany, onToggleCategory }) {
  const primaryCat = CATS[item.categories[0]] || CATS[CAT_KEYS[0]];
  return (
    <article className="card" style={{ borderLeftColor: primaryCat.color }}>
      <div className="card-meta">
        {item.fresh && <span className="badge-new">nouveau</span>}
        <span className="chip-country">{item.flag} {item.country}</span>
        <span className="dot">•</span>
        <span className="card-source">{item.source}</span>
        <span className="card-date">{item.date}</span>
      </div>
      <div className="card-cats">
        {item.categories.map((c) => (
          <button key={c} className="card-cat-chip" style={{ color: CATS[c].color, borderColor: CATS[c].color }}
            onClick={() => onToggleCategory && onToggleCategory(c)}>
            {CATS[c].icon} {CATS[c].label}
          </button>
        ))}
      </div>
      {item.url ? (
        <a className="card-title-link" href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title} <span className="ext-icon">↗</span>
        </a>
      ) : (
        <h3 className="card-title-link card-title-static">{item.title}</h3>
      )}
      <p className="card-summary">{item.summary}</p>
      <div className="card-footer">
        {item.companies.map((co) => (
          <button key={co}
            className={`chip-company ${selectedCompany === co ? "chip-company--active" : ""}`}
            onClick={() => onSelectCompany(selectedCompany === co ? null : co)}>
            {co}
          </button>
        ))}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN DASHBOARD                                                     */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [items, setItems] = useState(SEED_NEWS);
  const [activeView, setActiveView] = useState("articles"); // "articles" | "graphiques"
  const [expandedChart, setExpandedChart] = useState(null); // null | "map" | "timeline" | "network" | "trends"
  const [country, setCountry] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]); // empty = all
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const countryCounts = useMemo(() => {
    const m = new Map();
    items.forEach((n) => {
      const key = `${n.flag} ${n.country}`;
      m.set(key, (m.get(key) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (country !== "all" && `${n.flag} ${n.country}` !== country) return false;
      if (selectedCategories.length > 0 && !n.categories.some((c) => selectedCategories.includes(c))) return false;
      if (company && !n.companies.includes(company)) return false;
      return true;
    }).sort((a, b) => b.id - a.id);
  }, [items, country, selectedCategories, company]);

  const categoryCounts = useMemo(() => {
    const m = {};
    CAT_KEYS.forEach((k) => { m[k] = 0; });
    items.forEach((n) => n.categories.forEach((c) => { m[c] = (m[c] || 0) + 1; }));
    return m;
  }, [items]);

  const topTrendName = useMemo(() => {
    const m = new Map();
    filtered.forEach((n) => n.trends.forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : null;
  }, [filtered]);

  const resetAll = () => { setCountry("all"); setSelectedCategories([]); setCompany(null); };
  const toggleCategory = (key) => {
    setSelectedCategories((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchFreshNews();
      if (fresh.length === 0) throw new Error("Aucun article exploitable dans la réponse.");
      setItems((prev) => [...fresh, ...prev.map((p) => ({ ...p, fresh: false }))]);
      setLastUpdated(new Date());
    } catch (e) {
      setError("Recherche en direct indisponible ici (elle ne fonctionne que dans une conversation Claude.ai). Ce tableau de bord est un instantané publié à la main — demande à Claude de le mettre à jour et de republier une nouvelle version quand tu veux des données plus récentes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dash">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .dash {
          --ink: #0B1220;
          --panel: #121B2E;
          --panel2: #16213A;
          --border: #24314A;
          --text: #EDEFF4;
          --muted: #8B96AB;
          --amber: #E8A33D;
          background: var(--ink);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          padding: 18px 14px 40px;
          box-sizing: border-box;
        }
        .dash * { box-sizing: border-box; }
        @media (min-width: 900px) {
          .dash { padding: 28px 40px 56px; }
        }
        @media (min-width: 1300px) {
          .dash { padding: 32px 64px 64px; }
          .dash-inner { max-width: 1500px; margin: 0 auto; }
        }

        .header { margin-bottom: 16px; display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; align-items: flex-start; }
        .header-text { flex: 1 1 320px; }
        .eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--amber); margin-bottom: 6px;
        }
        .h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700; font-size: 26px; line-height: 1.15; margin: 0 0 6px;
        }
        .sub { color: var(--muted); font-size: 13px; max-width: 640px; line-height: 1.5; }
        @media (min-width: 900px) {
          .h1 { font-size: 34px; }
          .sub { font-size: 14px; max-width: 760px; }
          .eyebrow { font-size: 12px; }
        }

        .refresh-box { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .refresh-btn {
          font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13px;
          padding: 9px 16px; border-radius: 10px; border: 1px solid var(--amber);
          background: #2A2213; color: var(--amber); cursor: pointer; white-space: nowrap;
          display: flex; align-items: center; gap: 7px;
        }
        .refresh-btn:disabled { opacity: 0.6; cursor: wait; }
        .spin { display: inline-block; width: 12px; height: 12px; border-radius: 50%;
          border: 2px solid rgba(232,163,61,0.3); border-top-color: var(--amber);
          animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .last-updated { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--muted); }
        .error-banner {
          font-size: 11.5px; color: #E8A33D; background: #2A2213; border: 1px solid #4A3A1C;
          padding: 6px 10px; border-radius: 8px; max-width: 240px; text-align: right;
        }

        .cat-select { display: flex; gap: 7px; margin: 18px 0 6px; flex-wrap: wrap; }
        .cat-chip {
          font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600;
          padding: 7px 12px; border-radius: 999px; border: 1px solid var(--border);
          background: var(--panel); color: var(--muted); cursor: pointer; white-space: nowrap;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .cat-chip--all.cat-chip--active { border-color: var(--amber); background: #2A2213; color: var(--amber); }
        .cat-chip:hover { border-color: var(--muted); }
        .cat-select-hint { font-size: 11px; color: var(--muted); margin-bottom: 12px; font-style: italic; }
        .tab-count { opacity: 0.7; font-weight: 500; margin-left: 4px; font-size: 11px; }

        .country-strip {
          display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 14px;
          scrollbar-width: thin;
        }
        @media (min-width: 900px) {
          .country-strip { flex-wrap: wrap; overflow-x: visible; padding-bottom: 4px; }
          .country-chip { font-size: 12.5px; padding: 7px 14px; }
        }
        .country-chip {
          flex: 0 0 auto; font-family: 'IBM Plex Mono', monospace; font-size: 12px;
          padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border);
          background: var(--panel); color: var(--text); cursor: pointer; white-space: nowrap;
        }
        .country-chip--active { border-color: var(--amber); background: #2A2213; color: var(--amber); }

        .insight-panel { margin: 16px 0; border-left: 3px solid var(--amber); }
        .insight-text { font-size: 13.5px; line-height: 1.65; color: #C7D0DE; margin: 0; }

        .view-switch {
          display: flex; align-items: center; gap: 8px; margin: 4px 0 16px; flex-wrap: wrap;
          border-bottom: 1px solid var(--border); padding-bottom: 10px;
        }
        .view-tab {
          font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px;
          padding: 8px 16px; border-radius: 10px 10px 0 0; border: 1px solid transparent;
          background: none; color: var(--muted); cursor: pointer;
        }
        .view-tab--active {
          color: var(--amber); border: 1px solid var(--border); border-bottom-color: var(--ink);
          background: var(--panel);
        }

        .feed-col--full { max-width: 720px; margin: 0 auto; }
        @media (min-width: 900px) {
          .feed-col--full { max-width: none; margin: 0; }
        }
        .graphs-view .overview-grid + .overview-grid { margin-top: 0; }

        .panel {
          background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
          padding: 14px 14px 16px;
        }
        .panel + .panel { margin-top: 14px; }
        .panel-title {
          font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px;
          margin: 0 0 3px; display: flex; align-items: center; justify-content: space-between;
        }
        .panel-hint { font-size: 11.5px; color: var(--muted); margin-bottom: 10px; }
        .clear-link {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--amber);
          background: none; border: none; cursor: pointer; padding: 0;
        }
        .expand-btn {
          font-size: 14px; line-height: 1; background: none; border: 1px solid var(--border);
          color: var(--muted); border-radius: 6px; padding: 3px 7px; cursor: pointer;
        }
        .expand-btn:hover { color: var(--amber); border-color: var(--amber); }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(4,7,14,0.82); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-panel {
          background: var(--panel); border: 1px solid var(--border); border-radius: 16px;
          width: 100%; max-width: 1100px; max-height: 90vh; overflow-y: auto;
          padding: 18px 20px 22px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 12px; }
        .modal-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; }
        .modal-close {
          font-size: 14px; background: var(--panel2); border: 1px solid var(--border); color: var(--text);
          border-radius: 8px; width: 30px; height: 30px; cursor: pointer; flex-shrink: 0;
        }
        .modal-close:hover { border-color: var(--amber); color: var(--amber); }
        .modal-body { width: 100%; }

        .timeline-detail-list {
          margin-top: 14px; border-top: 1px solid var(--border); padding-top: 10px;
          display: flex; flex-direction: column; gap: 7px; max-height: 340px; overflow-y: auto;
        }
        .timeline-detail-row {
          display: grid; grid-template-columns: 8px 90px 140px 1fr; align-items: center; gap: 10px;
          font-size: 12px;
        }
        .timeline-detail-date { font-family: 'IBM Plex Mono', monospace; color: var(--muted); font-size: 11px; }
        .timeline-detail-country { color: var(--muted); font-size: 11.5px; }
        .timeline-detail-title { color: var(--text); text-decoration: none; }
        .timeline-detail-cats { margin-right: 5px; }
        a.timeline-detail-title:hover { color: var(--amber); }
        @media (max-width: 640px) {
          .timeline-detail-row { grid-template-columns: 8px 1fr; grid-template-areas: "dot date" "dot country" "dot title"; row-gap: 2px; }
        }

        .empty-graph { color: var(--muted); font-size: 12.5px; padding: 30px 0; text-align: center; }
        .graph-wrap { width: 100%; }
        .graph-wrap circle, .map-wrap circle, .timeline-wrap circle {
          transition: cx 0.5s cubic-bezier(0.22,1,0.36,1), cy 0.5s cubic-bezier(0.22,1,0.36,1),
            r 0.35s ease, fill-opacity 0.3s ease, opacity 0.3s ease;
        }
        .graph-wrap line, .graph-wrap text, .map-wrap text {
          transition: opacity 0.3s ease, stroke-opacity 0.3s ease;
        }

        .trend-list { display: flex; flex-direction: column; gap: 8px; }
        .trend-row { display: grid; grid-template-columns: 1fr 2fr 20px; align-items: center; gap: 8px; }
        .trend-label { font-size: 11.5px; color: var(--text); }
        .trend-track { height: 6px; background: #1C2740; border-radius: 4px; overflow: hidden; }
        .trend-fill { height: 100%; background: linear-gradient(90deg, var(--amber), #C1553F); border-radius: 4px; }
        .trend-count { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); text-align: right; }

        .feed-count { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); margin-bottom: 10px; }
        .feed { display: flex; flex-direction: column; gap: 14px; }
        @media (min-width: 900px) {
          .feed { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; align-items: start; }
        }
        @media (min-width: 1300px) {
          .feed { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); }
        }

        .card {
          background: var(--panel); border: 1px solid var(--border); border-left: 3px solid;
          border-radius: 10px; padding: 13px 14px;
        }
        .card-meta {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          font-size: 11px; color: var(--muted); margin-bottom: 6px;
        }
        .badge-new {
          font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink);
          background: var(--amber); padding: 1px 6px; border-radius: 4px;
        }
        .chip-country { font-weight: 500; color: var(--text); }
        .card-cats { display: flex; gap: 5px; flex-wrap: wrap; margin: 2px 0 8px; }
        .card-cat-chip {
          font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px;
          border: 1px solid; background: transparent; cursor: pointer; white-space: nowrap;
        }
        .dot { opacity: 0.5; }
        .card-source { font-style: italic; }
        .card-date { margin-left: auto; font-family: 'IBM Plex Mono', monospace; }
        .card-title-link {
          font-family: 'Space Grotesk', sans-serif; font-size: 15.5px; font-weight: 700;
          margin: 0 0 6px; line-height: 1.3; color: var(--text); text-decoration: none;
          display: block;
        }
        a.card-title-link:hover { color: var(--amber); }
        a.card-title-link:hover .ext-icon { opacity: 1; }
        .card-title-static { cursor: default; }
        .ext-icon { font-size: 12px; opacity: 0.5; }
        .card-summary { font-size: 13px; line-height: 1.55; color: #C7D0DE; margin: 0 0 10px; }
        .card-footer { display: flex; gap: 6px; flex-wrap: wrap; }
        .chip-company {
          font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; padding: 3px 8px;
          border-radius: 6px; border: 1px solid var(--border); background: var(--panel2);
          color: var(--muted); cursor: pointer;
        }
        .chip-company--active { border-color: var(--amber); color: var(--amber); background: #2A2213; }

        .legend { display: flex; gap: 12px; font-size: 11px; color: var(--muted); margin-top: 10px; flex-wrap: wrap; }
        .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }

        .network-top-list { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px; }
        .network-top-caption { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
        .network-top-rows { display: flex; flex-direction: column; gap: 3px; max-height: 260px; overflow-y: auto; }
        .network-top-row {
          display: flex; align-items: center; gap: 8px; background: none; border: none;
          border-radius: 6px; padding: 4px 6px; cursor: pointer; text-align: left; width: 100%;
          font-size: 12px; color: var(--text);
        }
        .network-top-row:hover { background: var(--panel2); }
        .network-top-row--active { background: #2A2213; color: var(--amber); }
        .network-top-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
        .kpi-card {
          background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
          padding: 10px 12px;
        }
        .kpi-value {
          font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 19px;
          color: var(--amber); line-height: 1.2;
        }
        .kpi-label { font-size: 10.5px; color: var(--muted); margin-top: 2px; }
        @media (max-width: 560px) {
          .kpi-strip { grid-template-columns: repeat(2, 1fr); }
        }

        .overview-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 18px; }
        @media (min-width: 720px) {
          .overview-grid { grid-template-columns: 1.3fr 1fr; }
        }
        .map-wrap, .timeline-wrap { width: 100%; }
        .map-legend {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
          gap: 10px; margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--border);
        }
        .map-legend-group { display: flex; align-items: center; gap: 6px; }
        .map-legend-caption { font-size: 10.5px; color: var(--muted); white-space: nowrap; }
        .timeline-legend {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
          gap: 10px; margin-top: 4px;
        }
        .timeline-peak { font-size: 10.5px; color: var(--muted); font-family: 'IBM Plex Mono', monospace; }

        .footnote { margin-top: 22px; font-size: 11px; color: var(--muted); line-height: 1.6; border-top: 1px solid var(--border); padding-top: 12px; }
      `}</style>

      <div className="dash-inner">
      <header className="header">
        <div className="header-text">
          <div className="eyebrow">Veille mondiale · Tech · Défense · Industrie</div>
          <h1 className="h1">Radar Tech Mondial</h1>
          <p className="sub">
            Veille d'innovations civiles à potentiel dual-use — matériaux, logiciel, procédés, robotique, données,
            fabrication, énergie et au-delà — sans quota de pays ni de catégorie : la sélection suit la pertinence
            et la fiabilité de la source, pas un équilibre statistique. Touchez un pays, une catégorie ou un acteur
            pour filtrer ; touchez un titre pour lire l'article source.
          </p>
        </div>
        <div className="refresh-box">
          <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
            {loading ? <span className="spin" /> : "🔄"} {loading ? "Recherche en cours…" : "Actualiser"}
          </button>
          {lastUpdated && (
            <span className="last-updated">Actualisé à {lastUpdated.toLocaleTimeString("fr-FR")}</span>
          )}
          {error && <div className="error-banner">{error}</div>}
        </div>
      </header>

      <div className="cat-select">
        <button className={`cat-chip cat-chip--all ${selectedCategories.length === 0 ? "cat-chip--active" : ""}`}
          onClick={() => setSelectedCategories([])}>
          🌐 Toutes les catégories <span className="tab-count">{items.length}</span>
        </button>
        {CAT_KEYS.map((k) => {
          const active = selectedCategories.includes(k);
          return (
            <button key={k}
              className={`cat-chip ${active ? "cat-chip--active" : ""}`}
              style={active ? { borderColor: CATS[k].color, background: `${CATS[k].color}22`, color: CATS[k].color } : {}}
              onClick={() => toggleCategory(k)}>
              {CATS[k].icon} {CATS[k].label} <span className="tab-count">{categoryCounts[k] || 0}</span>
            </button>
          );
        })}
      </div>
      {selectedCategories.length > 1 && (
        <div className="cat-select-hint">Un article n'importe laquelle de ces {selectedCategories.length} catégories est affiché (OR, pas ET).</div>
      )}

      <div className="country-strip">
        <button className={`country-chip ${country === "all" ? "country-chip--active" : ""}`} onClick={() => setCountry("all")}>
          🌐 Tous ({items.length})
        </button>
        {countryCounts.map(([key, count]) => (
          <button key={key}
            className={`country-chip ${country === key ? "country-chip--active" : ""}`}
            onClick={() => setCountry(key)}>
            {key} ({count})
          </button>
        ))}
      </div>

      <div className="panel insight-panel">
        <div className="panel-title">Synthèse rapide</div>
        <p className="insight-text">{generateInsightText(filtered)}</p>
      </div>

      <div className="view-switch">
        <button className={`view-tab ${activeView === "articles" ? "view-tab--active" : ""}`} onClick={() => setActiveView("articles")}>
          📰 Articles <span className="tab-count">{filtered.length}</span>
        </button>
        <button className={`view-tab ${activeView === "graphiques" ? "view-tab--active" : ""}`} onClick={() => setActiveView("graphiques")}>
          📊 Graphiques
        </button>
        {(country !== "all" || selectedCategories.length > 0 || company) && (
          <button className="clear-link" style={{ marginLeft: "auto" }} onClick={resetAll}>réinitialiser les filtres</button>
        )}
      </div>

      {activeView === "articles" && (
        <div className="feed-col feed-col--full">
          <div className="feed-count">
            {filtered.length} article{filtered.length > 1 ? "s" : ""}
            {company ? <> · acteur : <strong style={{ color: "#E8A33D" }}> {company}</strong></> : null}
          </div>
          <div className="feed">
            {filtered.map((item) => (
              <NewsCard key={item.id} item={item} selectedCompany={company} onSelectCompany={setCompany} onToggleCategory={toggleCategory} />
            ))}
            {filtered.length === 0 && <div className="empty-graph">Aucun article ne correspond à ces filtres.</div>}
          </div>
        </div>
      )}

      {activeView === "graphiques" && (
        <div className="graphs-view">
          <div className="kpi-strip">
            <div className="kpi-card">
              <div className="kpi-value">{filtered.length}</div>
              <div className="kpi-label">Articles (sélection)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{new Set(filtered.map((n) => n.country)).size}</div>
              <div className="kpi-label">Pays couverts</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{new Set(filtered.flatMap((n) => n.companies)).size}</div>
              <div className="kpi-label">Acteurs cités</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ fontSize: 13.5 }}>{topTrendName || "—"}</div>
              <div className="kpi-label">Tendance dominante</div>
            </div>
          </div>

          <div className="overview-grid">
            <div className="panel">
              <div className="panel-title">
                Où ça se passe
                <button className="expand-btn" onClick={() => setExpandedChart("map")} title="Agrandir">⛶</button>
              </div>
              <div className="panel-hint">Taille = nombre d'articles, couleur = catégorie dominante. Touchez une bulle pour filtrer.</div>
              <WorldMap items={filtered} selectedCountryKey={country === "all" ? null : country} onSelectCountry={setCountry} />
            </div>
            <div className="panel">
              <div className="panel-title">
                Quand ça se passe
                <button className="expand-btn" onClick={() => setExpandedChart("timeline")} title="Agrandir">⛶</button>
              </div>
              <div className="panel-hint">Chaque point = un article ; les barres montrent le volume par semaine. Touchez un point pour l'ouvrir.</div>
              <Timeline items={filtered} />
            </div>
          </div>

          <div className="overview-grid">
            <div className="panel">
              <div className="panel-title">
                Réseau d'acteurs
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {company && <button className="clear-link" onClick={() => setCompany(null)}>effacer</button>}
                  <button className="expand-btn" onClick={() => setExpandedChart("network")} title="Agrandir">⛶</button>
                </span>
              </div>
              <div className="panel-hint">Liens = co-apparition dans une même actualité. Touchez un nœud pour filtrer.</div>
              <NetworkGraph items={filtered.length ? filtered : items} selectedCompany={company} onSelectCompany={setCompany} />
              <div className="legend">
                {CAT_KEYS.map((c) => (
                  <span key={c}><span className="legend-dot" style={{ background: CATS[c].color }} />{CATS[c].icon} {CATS[c].label}</span>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">
                Tendances du moment
                <button className="expand-btn" onClick={() => setExpandedChart("trends")} title="Agrandir">⛶</button>
              </div>
              <div className="panel-hint">Fréquence des thèmes dans la sélection filtrée.</div>
              <TrendBars items={filtered} />
            </div>
          </div>
        </div>
      )}

      {expandedChart === "map" && (
        <ChartModal title="Où ça se passe" hint="Taille = nombre d'articles, couleur = catégorie dominante. Touchez une bulle pour filtrer." onClose={() => setExpandedChart(null)}>
          <WorldMap items={filtered} selectedCountryKey={country === "all" ? null : country} onSelectCountry={setCountry} expanded />
        </ChartModal>
      )}
      {expandedChart === "timeline" && (
        <ChartModal title="Quand ça se passe" hint="Chaque point = un article ; la liste ci-dessous détaille tout ce qui est daté dans la sélection." onClose={() => setExpandedChart(null)}>
          <Timeline items={filtered} expanded />
        </ChartModal>
      )}
      {expandedChart === "network" && (
        <ChartModal title="Réseau d'acteurs" hint="Liens = co-apparition dans une même actualité. Touchez un nœud pour filtrer." onClose={() => setExpandedChart(null)}>
          <NetworkGraph items={filtered.length ? filtered : items} selectedCompany={company} onSelectCompany={setCompany} expanded />
          <div className="legend" style={{ marginTop: 12 }}>
            {CAT_KEYS.map((c) => (
                  <span key={c}><span className="legend-dot" style={{ background: CATS[c].color }} />{CATS[c].icon} {CATS[c].label}</span>
                ))}
          </div>
        </ChartModal>
      )}
      {expandedChart === "trends" && (
        <ChartModal title="Tendances du moment" hint="Toutes les tendances de la sélection filtrée, pas seulement le top 7." onClose={() => setExpandedChart(null)}>
          <TrendBars items={filtered} expanded />
        </ChartModal>
      )}

      <div className="footnote">
        Instantané de départ compilé le 4 juillet 2026 à partir de plusieurs médias spécialisés (chaque titre renvoie
        vers sa source réelle). Les pays présents ici sont un échantillon de démonstration, pas un classement — toute
        BITD ou écosystème d'innovation national peut être ajouté. Le bouton « Actualiser »
        interroge le web en direct pour ramener de nouveaux articles, de n'importe quel pays, et les visualisations
        (réseau d'acteurs, tendances, filtres pays) se recalculent automatiquement à partir du contenu du moment.
      </div>
      </div>
    </div>
  );
}
