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
│       └── Book Chatbot RAG V13.workflow.ts   (chatbot RAG sur un livre)
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
| **Book Chatbot RAG V13** | Chatbot qui répond aux questions sur un ou plusieurs documents de non-fiction (PDF, TXT, Markdown, HTML) | Formulaire (ajout du livre) + chat n8n (questions) | ✅ Construit, à tester avec un livre |

**Modifier un workflow existant.** `n8ncli push` ne peut que créer des workflows sur cette instance, faute de clé API n8n. Pour modifier un workflow sur place, [scripts/n8n_mcp.mjs](scripts/n8n_mcp.mjs) appelle l'outil `update_workflow` du serveur MCP de n8n, avec le jeton de n8ncli. Il sert ensuite à vérifier le résultat avec `n8ncli pull`.

Les workflows sont écrits en TypeScript (format `@n8n/workflow-sdk`) et synchronisés avec l'instance n8n Cloud par le CLI **n8ncli**. Le fichier `.workflow.ts` est la sauvegarde versionnée du workflow : il peut être renvoyé dans n8n à tout moment avec `n8ncli push`, même après la fin de l'essai gratuit.

### Book Chatbot RAG V13

Un workflow, deux parties. Chaque étape est encadrée par une sticky note grise sur la toile n8n, et une sticky note bleue décrit les specs.

| Partie | Déclencheur | Étapes |
|---|---|---|
| **1. Ingestion** | *On Form Submission* (fichier PDF, TXT, Markdown ou HTML, titre, auteur) | **Extraction** : *If - PDF File* envoie le fichier vers l'extraction PDF ou texte ; texte nettoyé (balises HTML, nettoyage (en-têtes et pieds de page du Journal officiel, notes de bas de page, numéros de page, césures), puis conversion en **Markdown** : titres Markdown et HTML conservés ; chapitres, parties, annexes, sections, articles, titres numérotés (1.2) et lignes courtes en forme de titre détectés → **Chunking récursif** avec overlap : coupe d'abord sur les titres, puis paragraphes, lignes, phrases et mots ; passages de 5000 à 10000 caractères, 800 caractères de recouvrement → **Augmentation** par Gemini Flash Lite : contexte, questions hypothétiques, mots-clés, entités et relations → **Vectorisation** : `gemini-embedding-2`, stockage Supabase. → **Graphe** : les relations extraites par Gemini (par exemple `autorité notifiante → contrôle → organisme notifié`) sont rangées dans `graph_relations` par *Postgres - Save Graph*. La colonne `keywords` est calculée par Postgres. |
| **2. Answering** | *When Chat Message Received* | **Input** : nettoyage de la question → **Context** : messages de la session lus dans `chat_messages` et liste des documents indexés (*Postgres - List Documents*) ; *If - Empty Conversation* : sinon, Gemini réécrit la question pour qu'elle se comprenne sans l'historique → **Routing** : Gemini Flash Lite **choisit le document** visé par la question (ou tous) et produit la requête de recherche, les mots-clés et les filtres d'articles → **Search** (filtrée sur le document choisi) : recherche vectorielle, recherche par mots-clés et articles, et **recherche dans le graphe** (*Postgres - Search Graph* : relations autour des entités de la question, puis un saut vers leurs voisines, et les passages les plus liés), sans doublons → **Reranking** : Gemini Flash Lite note chaque passage de 0 à 1 ; les 3 meilleurs au-dessus de 0,3 sont gardés → **Generation** : Gemini Flash Lite répond à partir des passages et des faits du graphe (balise `<faits>`), avec citations [1], [2], puis l'échange est enregistré |

Choix principaux :
- **Questions sur le document lui-même** (nombre de pages, plan, nombre de chapitres) :
  - à l'ingestion, le format, le nombre de pages (PDF) et le plan (titres `#` et `##`) sont enregistrés avec les passages ;
  - *Postgres - List Documents* les relit, et la génération les reçoit dans une balise `<documents>`.
  - Le message « aucun document indexé » ne s'affiche plus que s'il n'y a vraiment aucun document. Avant, il apparaissait dès que le reranking écartait tous les passages.
- **N'importe quel document** :
  - chaque titre du formulaire est un document. Un nouveau titre s'ajoute aux autres, le même titre remplace l'ancienne version ;
  - le Routing choisit le document à partir de la liste des documents indexés (testé : « article 5 du RGPD » → RGPD, « Neil Armstrong » → Apollo 11, « article 5 » sans précision → tous les documents) ;
  - les sources affichent le titre du document.
  - **PDF de poèmes ou de fables** (lignes courtes) :
    - les vers gardent leurs retours à la ligne ;
    - un titre doit suivre un saut de page, pour qu'un vers comme « Le fabricateur souverain » ne soit pas pris pour un titre ;
    - les en-têtes et pieds de page répétés (« Page 7 / 25 », nom du site, nom de l'auteur) sont retirés ;
    - le découpage coupe de préférence entre deux titres, pour qu'une fable reste entière avec sa morale.
    - Testé sur le Livre I des Fables de La Fontaine : 18 fables reconnues, 4 passages.
  - Détection des titres testée sur l'AI Act en PDF (inchangé : 99 passages), Apollo 11 en HTML Wikipédia (titres exacts) et le cours n8n en Markdown.
- **GraphRAG « local »**, stocké dans Supabase (pas de Neo4j : ce serait un service de plus, sans nœud natif dans n8n) :
  - les entités et relations sont extraites dans le même appel Gemini que l'augmentation, donc aucun appel de plus ;
  - à la question, une seule requête SQL parcourt le graphe ; `pg_trgm` permet de retrouver « commission » dans « commission européenne » ;
  - testé sur 8 passages de l'AI Act : 24 relations, entités nommées de la même façon d'un passage à l'autre.
  - Le GraphRAG « global » de Microsoft (communautés et résumés) a été écarté : trop d'appels pour le quota gratuit.
- **Chunking récursif** plutôt que par IA : l'ancienne version (fenêtre glissante où Gemini choisissait les coupes) prenait plus d'une heure sur l'AI Act. Le découpage récursif est instantané. Testé sur l'AI Act : 99 passages, 96 entre 5000 et 10000 caractères ; les 3 autres font au moins 4665 caractères.
- **Modèles** : nœuds natifs **Google Gemini → Message a Model**, sans sous-bulle de modèle, tous sur `gemini-3.5-flash-lite`.
  - Mesure : environ 1 s par appel, contre 18 s pour `gemini-3.5-flash` qui « réfléchit » longtemps. `gemini-flash-latest` renvoyait des erreurs 503 (surcharge).
  - La version est figée : un alias `-latest` a déjà changé de modèle sous nos pieds.
  - Les seules sous-bulles restantes sont les embeddings `gemini-embedding-2` (3072 dimensions, jusqu'à 8192 tokens), accrochés au Supabase Vector Store. n8n n'a pas de nœud natif d'embeddings, et un HTTP Request n'est utilisé que s'il n'existe aucune autre solution.
- **Vitesse** :
  - l'augmentation se fait en **un appel Gemini par lot de 8 passages** (environ 7 s, testé : 8 sur 8 enrichis), au lieu d'un appel par passage ;
  - l'ingestion de l'AI Act prend environ 3 minutes ;
  - une réponse dans le chat prend environ 5 secondes.
- **Stockage** : Supabase (pgvector), créé **une seule fois** en exécutant [supabase/setup.sql](supabase/setup.sql) dans le SQL Editor de Supabase. Le workflow ne fait que supprimer l'ancienne version d'un livre avant de le réindexer, avec le nœud *Postgres - Delete Previous Passages*. Contenu :
  - table `documents` : `content` est le chunk, avec `embedding`, `keywords` et `metadata` (section, articles, contexte, entités, relations…) ;
  - table `chat_messages` : historique, purgé après 30 jours ;
  - fonction `match_documents`.
  - Les noms `content`, `metadata` et `embedding` sont imposés par le nœud Supabase Vector Store de n8n.
- **Réglages** : regroupés dans deux nœuds *Configuration*, un en tête de chaque partie (taille des chunks, overlap, nombre de résultats, seuil de reranking, mode test avec `maxChunks`).
- **Quota Gemini gratuit** :
  - 1000 embeddings par jour et par modèle (vérifié : `EmbedContentRequestsPerDayPerProjectPerModel-FreeTier = 1000`) ;
  - augmentation et vectorisation par paquets de 8 passages, avec **15 s de pause**. La version gratuite limite aussi les tokens par minute : avec 5 s de pause, le Code pénal (408 pages, 143 passages) échouait au 7e paquet. Si l'API renvoie encore 429, il faut augmenter `pauseSeconds`.
  - Si le quota est dépassé, l'API renvoie 429 et LangChain produit des vecteurs vides (« vector must have at least 1 dimension »).
- **Garde-fous** :
  - réponse limitée aux passages du livre ;
  - « je ne trouve pas cette information » si rien ne correspond ;
  - instructions contenues dans le livre, l'historique ou la question ignorées ;
  - retry sur chaque appel à Gemini ;
  - message de secours si Gemini ne répond pas ;
  - repli sur l'ordre de recherche si le reranking échoue.
- **Limites connues** :
  - extraction sans OCR : un PDF doit contenir du texte sélectionnable ;
  - sur un PDF en deux colonnes (export PDF de Wikipédia), titres et légendes se mélangent : préférer la version HTML ;
  - pas d'index vectoriel (pgvector limite HNSW à 2000 dimensions), ce qui suffit pour quelques livres.
  - Les améliorations prévues sont listées dans la sticky note verte.

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
