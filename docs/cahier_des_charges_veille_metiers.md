# Specs | Veille du marché des métiers en tension (n8n)

## 1. Contexte
Les recruteurs de métiers manuels en tension (électricien, plombier, mécanicien) manquent de visibilité sur la tension réelle de leur marché par zone. Le workflow collecte chaque semaine des données publiques d'emploi et de formation, calcule des indicateurs de tension et livre un rapport court. Projet réalisé pour un cours (essai n8n de 14 jours), à faire évoluer ensuite vers un usage réel.

## 2. Objectif et résultat attendu
**Déclencheurs.** Lancement manuel à la demande (métier + zone) et lancement hebdomadaire automatique sur tous les métiers et zones suivis.

**Périmètre du rendu.**
- Métiers : électricien du bâtiment (F1602), plombier (F1603), mécanicien automobile (I1604), mécanicien poids lourd (code à confirmer : I1604 avec mot-clé « poids lourd », ou I1613).
- Zones : Île-de-France, Lyon (Rhône).

**Livrable, par email et par Slack :**
- Tableau métier x zone : offres actives, ancienneté moyenne, part d'offres de plus de 30 jours, offres republiées, taux de salaire renseigné, évolution sur 1 semaine.
- Entreprises à fort potentiel d'embauche par métier et zone.
- Organismes de formation de la zone.
- Synthèse rédigée par IA à partir des seuls chiffres calculés.
- Mention des sources indisponibles et des limites (couverture partielle, indicateurs et non mesures directes).
- Historique daté conservé dans Google Sheets.

**Rendu du cours.** Démonstration en direct sur les 4 métiers et 2 zones avec de vraies données publiques, plus un document présentant le cahier des charges et le fonctionnement.

## 3. Outils et écosystème
- Automatisation : n8n (imposé), accès actuel : essai gratuit de 14 jours. Projet initialisé avec le CLI fourni par le professeur (n8ncli).
- Sources : API Offres d'emploi, La Bonne Boîte (accès sur demande), API Open Formation, toutes de France Travail (francetravail.io). Compte à créer.
- Stockage : Google Sheets, classeur fourni (classeur_veille_metiers_en_tension.xlsx).
- IA : offre gratuite (Gemini proposé, quotas à vérifier). L'IA rédige uniquement, elle ne calcule pas.
- Livraison : email et Slack.
- Aucune donnée personnelle de candidat n'est collectée.

## 4. Contraintes opérationnelles
| Sujet | Rendu du cours | Usage réel |
|---|---|---|
| Volume | 4 métiers x 2 zones, un run hebdomadaire et quelques runs manuels | À définir |
| Budget | Presque nul, uniquement du gratuit | À définir |
| Délai | Fonctionnel avant la fin des 14 jours d'essai | À définir |

**Limites techniques notées (à revérifier sur la doc officielle) :** 150 offres par page et index de départ maximum 3000 pour l'API Offres ; environ 10 appels par seconde pour l'API Offres, 2 par seconde pour La Bonne Boîte. Si un couple métier x zone dépasse le plafond, découper par département.

**Gestion des pannes :**
- Une source défaillante est réessayée plusieurs fois, puis le run continue sans elle.
- Le rapport indique les sources manquantes en tête.
- Une alerte séparée prévient le responsable du workflow.
- Si aucune source ne répond, pas de rapport, un message d'échec est envoyé.
- Si l'IA est indisponible ou renvoie des chiffres incohérents, le rapport part avec les tableaux seuls et la mention « analyse indisponible » ou « non vérifiée ».

**Données personnelles.** Ne copier aucun champ de contact des offres (nom, email, téléphone). Données d'entreprises uniquement. Mentionner la source France Travail et respecter la licence de réutilisation.

## 5. Affirmations et contraintes
**Affirmations à confirmer :**
- L'ancienneté des offres et la part d'offres longues sont des indicateurs utiles de tension.
- Les offres France Travail donnent une vue partielle mais exploitable du marché.
- Un historique hebdomadaire sur plusieurs semaines est plus parlant qu'un instantané.

**Contraintes fermes :**
- n8n est obligatoire.
- L'IA ne cite que des chiffres présents dans les données calculées.
- Un salaire non renseigné n'est jamais traité comme nul.
- Les offres publiées plusieurs fois ne comptent qu'une fois (dédoublonnage par identifiant).
- Aucune clé API dans le dépôt de code.

## 6. Alignement hostile
| Scénario défavorable | Comportement attendu |
|---|---|
| L'IA invente ou déforme un chiffre | Contrôle automatique des chiffres cités, sinon ligne marquée « non vérifié » |
| Une même offre gonfle les volumes | Dédoublonnage par identifiant et détection des republications |
| Le rapport donne une fausse impression d'exhaustivité | Rappel de la couverture partielle dans chaque rapport |
| Les salaires absents faussent les comparaisons | Taux de renseignement affiché, comparaison signalée peu fiable sous 50 % |
| Les codes métier mélangent poids lourd et automobile | Mot-clé de filtrage et mention dans le rapport tant que le code n'est pas confirmé |
| Petit échantillon (moins de 10 offres) | Tension « non évaluable », jamais d'interprétation forte |
| Une source tombe sans que personne le sache | Journal des sources, alerte au responsable, mention dans le rapport |
| Quota gratuit dépassé | Plafond de volume et arrêt propre avec alerte |
| Un chiffre de tension est pris pour une vérité | Formulations prudentes et mention « indicateurs, pas mesures directes » |

## 7. Points ouverts
1. Code ROME du mécanicien poids lourd (I1604 ou I1613), à trancher dans le référentiel de l'API.
2. Codes de zone à confirmer dans le référentiel (région 11, département 69).
3. Accès La Bonne Boîte, demande à faire sur francetravail.io.
4. Quotas actuels du modèle d'IA gratuit.
5. Date exacte du rendu dans les 14 jours.
6. Usage réel : budget, délai et recruteurs cibles, à définir plus tard.
7. Évolution future : mode candidats avec base d'un recruteur partenaire, conservation maximale de 2 ans après la dernière interaction, suppression sur demande, validation juridique.
