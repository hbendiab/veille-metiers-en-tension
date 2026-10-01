# Veille métiers en tension

Workflow n8n qui mesure chaque semaine la tension de recrutement de 4 métiers manuels dans 2 zones, à partir des données publiques de France Travail, et envoie un rapport par email et Slack.

| | |
|---|---|
| **Métiers** | Électricien du bâtiment, plombier, mécanicien automobile, mécanicien poids lourd |
| **Zones** | Île-de-France, Rhône (département 69) |
| **Sources** | France Travail : API Offres d'emploi, La Bonne Boîte, Open Formation |
| **Stockage** | Google Sheets (historique daté) |
| **Livrable** | Rapport email + résumé Slack, synthèse rédigée par IA à partir de chiffres calculés par n8n |
| **Réalisé par** | Hanine Bendiab, projet dans le cadre du cours n8n Eugenia |

---

## Organisation du dépôt

```
veille-metiers-en-tension/
├── README.md                  ← ce fichier
├── docs/                      ← le QUOI : besoin, règles, prompts
│   ├── cahier_des_charges_veille_metiers.md   (source de vérité)
│   ├── prompts_synthese_veille.md             (prompt IA, contrôle des chiffres, mode dégradé)
│   └── prompt_claude_code.md                  (consigne de départ donnée à l'assistant IA)
├── data/                      ← le classeur Google Sheets (modèle .xlsx)
│   └── classeur_veille_metiers_en_tension.xlsx
├── n8n/                       ← le COMMENT : les workflows, gérés avec n8ncli
│   ├── config/                (configuration du CLI, standards de nommage, mise en page)
│   └── workflows/
│       ├── Job Market Watch.workflow.ts   (veille métiers en tension)
│       └── Book Chatbot RAG V2.workflow.ts   (chatbot RAG sur un livre)
├── supabase/setup.sql         ← table vectorielle du chatbot RAG
├── scripts/                   ← création des credentials sans les écrire dans le code
├── skills/                    ← les skills IA utilisés pendant le projet
│   ├── interview/
│   ├── doubt-driven-development/
│   └── hostile-review/
└── .agents/skills/n8n/        ← skill fourni par n8ncli (commandes du CLI)
```

**Logique :** `docs/` dit ce qu'il faut construire, `n8n/` contient ce qui est construit, `data/` contient la structure de stockage, `skills/` contient les méthodes de travail avec l'IA.

---

## Workflows

| Workflow | Rôle | Déclencheurs | Statut |
|---|---|---|---|
| **Job Market Watch** | Collecte, calcul des indicateurs, rapport | Chaque lundi à 7h + formulaire manuel (1 métier, 1 zone) | 🟡 Étape 1 sur 7 |
| **Book Chatbot RAG V2** | Chatbot qui répond aux questions sur un livre de non-fiction (PDF) | Formulaire (ajout du livre) + chat n8n (questions) | ✅ Construit, à tester avec un livre |

Les workflows sont écrits en TypeScript (format `@n8n/workflow-sdk`) et synchronisés avec l'instance n8n Cloud par le CLI **n8ncli**. Le fichier `.workflow.ts` est la sauvegarde versionnée du workflow : il peut être renvoyé dans n8n à tout moment avec `n8ncli push`, même après la fin de l'essai gratuit.

### Book Chatbot RAG V2

Un workflow, deux parties, chacune encadrée sur la toile n8n et documentée par une sticky note bleue (specs) :

| Partie | Déclencheur | Étapes |
|---|---|---|
| **1. Ingestion** | *On Form Submission* (dépôt du PDF, titre, auteur) | **Extraction** du texte → **Chunking** (passages de 800 caractères, chevauchement 150) → **Cleaning** (césures, numéros de page, sommaire et index retirés) → **Augmentation** (en-tête livre, auteur, chapitre, position, mots-clés) → **Vectorisation** (embeddings Google Gemini, stockage Supabase pgvector ; les anciens passages du même livre sont supprimés avant) |
| **2. Answering** | *When Chat Message Received* | **Input** (nettoyage de la question) → **Selection** (Gemini reformule la question en requête de recherche) → **Recherche** (12 passages les plus proches) → **Reranking** (score sémantique + mots communs, doublons retirés, 4 passages gardés) → **Génération** (Gemini répond uniquement à partir des passages, avec citations [1], [2]) |

Choix principaux :
- **Modèles** : Google Gemini Chat Model (réponse) et un modèle léger (reformulation), `gemini-flash-latest` ; Embeddings Google Gemini `gemini-embedding-2` (3072 dimensions), le même pour l'indexation et la recherche.
- **Stockage** : Supabase (pgvector), table `documents` et fonction `match_documents`, créées par [supabase/setup.sql](supabase/setup.sql).
- **Réglages** regroupés dans deux nœuds *Configuration* en tête de chaque partie (taille des passages, nombre de résultats, mode test avec `maxChunks`).
- **Quota Gemini gratuit** : les passages sont vectorisés par paquets (`passagesPerBatch`, 20 par défaut) avec une pause (`pauseSeconds`, 30 s) entre chaque paquet ; un lot de 100 dépassait le quota (erreur 429) et produisait des vecteurs vides.
- **Garde-fous** : réponse limitée aux passages du livre, « je ne trouve pas cette information » si rien ne correspond, instructions contenues dans le livre ou la question ignorées, retry sur chaque appel à Gemini.
- **Limite connue** : pas d'index vectoriel (pgvector limite HNSW à 2000 dimensions) ; suffisant pour quelques livres. Les améliorations prévues sont listées dans la sticky note verte.

### Avancement de Job Market Watch

| # | Étape | Statut |
|---|---|---|
| 1 | Déclencheurs (hebdomadaire et manuel) et lecture de la config métiers et zones | ✅ Fait |
| 2 | Authentification France Travail et collecte des offres, pagination incluse | ⏳ À faire |
| 3 | Nettoyage : dédoublonnage, ancienneté, republications, écriture des offres | ⏳ |
| 4 | Indicateurs et historique hebdomadaire | ⏳ |
| 5 | Entreprises à fort potentiel d'embauche et formations | ⏳ |
| 6 | Synthèse IA avec contrôle des chiffres, rapport email et Slack | ⏳ |
| 7 | Gestion des erreurs, mode dégradé, tests | ⏳ |

---

## Skills

Un skill est une méthode écrite que l'assistant IA (Claude) applique quand la situation le demande. Chaque dossier contient un `SKILL.md` (la méthode) et un `.claude-plugin/plugin.json` (la fiche d'installation).

| Skill | Ce qu'il fait | Où il sert dans ce projet |
|---|---|---|
| [interview](skills/interview/SKILL.md) | Cadre un projet par questions successives jusqu'à une spec validée | Rédaction du cahier des charges |
| [doubt-driven-development](skills/doubt-driven-development/SKILL.md) | Traite chaque réponse de l'IA comme une hypothèse à vérifier sur une source primaire | Codes ROME, codes de zone, quotas : vérifiés dans les référentiels de l'API, jamais devinés |
| [hostile-review](skills/hostile-review/SKILL.md) | Relecture adverse sécurité et performance d'un workflow | Avant chaque push sur GitHub et avant l'activation du lancement hebdomadaire |
| [n8n (CLI)](.agents/skills/n8n/SKILL.md) | Commandes et conventions de n8ncli | Construction, validation et envoi des workflows |

**Installation :** copier un dossier de `skills/` dans `~/.claude/skills/` (Claude Code), ou importer le dossier zippé dans les paramètres de claude.ai.

---

## Règles appliquées

**Sécurité**
- Aucune clé API dans le dépôt : les accès (Google, France Travail, Slack, IA) sont stockés dans les **Credentials** de n8n. Le fichier `.env` est exclu par `.gitignore`.
- Aucune donnée personnelle : aucun nom, email ou téléphone de contact n'est copié depuis les offres.

**Fiabilité des chiffres**
- Les indicateurs sont calculés par des règles fixes dans n8n. L'IA ne fait que rédiger.
- Chaque chiffre cité par l'IA est comparé aux données calculées ; en cas d'écart, la ligne est marquée « non vérifié ».

**Conventions (cours n8n Eugenia)**
- Workflows et nœuds en Title Case, au format « Outil - Action » (ex. `Gemini - Generate Answer`), variables et clés JSON en camelCase.
- Nœud *Configuration* en tête de flux et sticky notes selon le code couleur du cours (bleu specs, gris blocs, vert améliorations). Appliqué à *Book Chatbot RAG* ; mise en conformité de *Job Market Watch* prévue à l'étape 2.
- Retry automatique (3 tentatives) sur chaque appel externe.
- Messages de commit préfixés : `init:`, `feat:`, `fix:`, `chore:`.
- Chaque workflow est vérifié avec `n8ncli validate --lint` avant d'être envoyé.

---

## Utilisation

```
n8ncli pull                                              # récupérer la version en ligne
n8ncli validate --lint                                   # vérifier les workflows
n8ncli push "n8n/workflows/Job Market Watch.workflow.ts" # envoyer un workflow vers n8n
```

**Tester Job Market Watch :** relier les nœuds Google Sheets au classeur, puis lancer le formulaire manuel (1 métier, 1 zone) ou le déclencheur hebdomadaire (8 couples).

**Tester Book Chatbot RAG :** exécuter [supabase/setup.sql](supabase/setup.sql) dans Supabase, créer les credentials Gemini et Supabase dans n8n, déposer un PDF via le formulaire, puis poser des questions dans le chat n8n.

**Secrets :** copier [.env.example](.env.example) en `.env` (ignoré par git). [scripts/create_gemini_credential.sh](scripts/create_gemini_credential.sh) crée le credential Gemini via l'API n8n quand elle est disponible (offres payantes).

**Limite de n8ncli sans clé API :** sans clé API n8n (absente de l'essai gratuit) ni accès à la base n8n, `n8ncli push` **crée** bien un nouveau workflow mais **ne modifie pas** un workflow existant (il ne met à jour que son nom tout en affichant « UPDATED »). Une modification se publie donc sous un nouveau nom, puis on vérifie avec `n8ncli pull` que le contenu en ligne est le bon.

**Arrêt d'urgence :** désactiver le workflow dans n8n (bouton *Active*) ou `n8ncli unpublish "n8n/workflows/Job Market Watch.workflow.ts"`.

---

## Points ouverts

1. Code ROME du mécanicien poids lourd : I1604 avec mot-clé « poids lourd », ou I1613. À vérifier dans le référentiel de l'API.
2. Codes de zone (région 11, département 69) à confirmer dans le référentiel de l'API.
3. Accès La Bonne Boîte, demandé sur francetravail.io.
4. Quotas du modèle d'IA gratuit.

---

*Données : France Travail (francetravail.io). Les offres publiées ne couvrent qu'une partie du marché ; les résultats sont des indicateurs de tension, pas des mesures directes.*
