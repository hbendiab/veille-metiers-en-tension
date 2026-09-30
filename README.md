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
│       └── Job Market Watch.workflow.ts
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

Les workflows sont écrits en TypeScript (format `@n8n/workflow-sdk`) et synchronisés avec l'instance n8n Cloud par le CLI **n8ncli**. Le fichier `.workflow.ts` est la sauvegarde versionnée du workflow : il peut être renvoyé dans n8n à tout moment avec `n8ncli push`, même après la fin de l'essai gratuit.

### Avancement

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
- Workflows et nœuds en Title Case, variables et clés JSON en camelCase.
- Retry automatique (3 tentatives) sur chaque appel externe.
- Messages de commit préfixés : `init:`, `feat:`, `fix:`, `chore:`.
- Chaque workflow est vérifié avec `n8ncli validate --lint` avant d'être envoyé.

---

## Utilisation

```
n8ncli pull                                              # récupérer la version en ligne
n8ncli validate --lint                                   # vérifier les workflows
n8ncli push "n8n/workflows/Job Market Watch.workflow.ts" # envoyer vers n8n
```

**Pour tester dans n8n :** ouvrir *Job Market Watch*, relier les nœuds Google Sheets au classeur, puis lancer le formulaire manuel (1 métier, 1 zone) ou le déclencheur hebdomadaire (8 couples).

**Arrêt d'urgence :** désactiver le workflow dans n8n (bouton *Active*) ou `n8ncli unpublish "n8n/workflows/Job Market Watch.workflow.ts"`.

---

## Points ouverts

1. Code ROME du mécanicien poids lourd : I1604 avec mot-clé « poids lourd », ou I1613. À vérifier dans le référentiel de l'API.
2. Codes de zone (région 11, département 69) à confirmer dans le référentiel de l'API.
3. Accès La Bonne Boîte, demandé sur francetravail.io.
4. Quotas du modèle d'IA gratuit.

---

*Données : France Travail (francetravail.io). Les offres publiées ne couvrent qu'une partie du marché ; les résultats sont des indicateurs de tension, pas des mesures directes.*
