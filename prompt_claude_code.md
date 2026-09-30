# Prompt de démarrage pour Claude Code (à coller après avoir créé le projet avec n8ncli)

Avant de coller : place dans le dossier du projet les trois fichiers `cahier_des_charges_veille_metiers.md`, `prompts_synthese_veille.md` et `classeur_veille_metiers_en_tension.xlsx`. Crée un fichier `.env` (jamais commité) pour tes clés.

---

```
Tu m'aides à construire un projet n8n pour un cours. Le projet a été initialisé avec
le CLI fourni par mon professeur (n8ncli).

ÉTAPE 0 : DÉCOUVERTE, AVANT TOUT CODE
1. Lis les fichiers du projet (README, config, scripts, dossiers) et exécute
   `n8ncli --help` puis l'aide de chaque sous-commande. Résume-moi en 10 lignes ce que
   fait le CLI, comment on crée, teste, importe et exporte un workflow.
2. N'invente aucune commande. Si quelque chose n'est pas documenté, dis-le-moi.
3. Lis ensuite dans le dossier : cahier_des_charges_veille_metiers.md (source de vérité),
   prompts_synthese_veille.md et le classeur xlsx (structure des onglets).
4. Reformule en 8 lignes ce que tu as compris du projet et liste les points ouverts
   du cahier des charges. Attends ma validation avant de construire.

CONTEXTE
Veille hebdomadaire du marché des métiers en tension : électricien du bâtiment,
plombier, mécanicien automobile, mécanicien poids lourd, en Île-de-France et à Lyon.
Sources : API Offres d'emploi, La Bonne Boîte et Open Formation (France Travail).
Sortie : rapport par email et Slack, historique dans Google Sheets.

CONTRAINTES
- Une étape à la fois. Après chaque étape : ce que tu as fait, comment le tester,
  et j'y réponds avant de passer à la suivante.
- Aucune clé API dans le code ni dans git. Utilise des variables d'environnement
  (.env, listé dans .gitignore) et dis-moi lesquelles il faut renseigner.
- L'IA ne calcule aucun chiffre : les indicateurs sont calculés par des règles fixes
  dans n8n, l'IA rédige à partir du JSON. Applique strictement les règles du fichier
  de prompts, y compris le contrôle des chiffres cités.
- Aucune donnée personnelle : ne copie aucun champ de contact des offres.
- Gestion des pannes prévue dès le départ : tentatives multiples, journal des sources,
  alerte au responsable, mode dégradé décrit dans les specs.
- Exporte les workflows en JSON dans le dépôt à chaque étape (mon essai n8n dure 14 jours).
- Si un point dépend d'une vérification que je dois faire (code ROME du poids lourd,
  codes de zone, quotas), ne devine pas : dis-le-moi et propose comment vérifier.

ORDRE DE CONSTRUCTION
1. Déclencheur (manuel avec métier + zone, et planifié hebdomadaire) et lecture de la
   config des métiers et zones dans le classeur.
2. Authentification à l'API France Travail et collecte des offres pour un seul couple
   métier x zone, pagination incluse.
3. Nettoyage : dédoublonnage, calcul de l'ancienneté, détection des republications,
   écriture dans l'onglet offres.
4. Indicateurs et historique hebdomadaire.
5. Entreprises à fort potentiel d'embauche et formations.
6. Synthèse IA avec contrôle des chiffres, puis rapport email et Slack.
7. Gestion des erreurs, mode dégradé et tests décrits dans le fichier de prompts.
Démarre par l'étape 0.
```
