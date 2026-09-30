# Prompts et format du rapport | Veille du marché des métiers en tension

## 1. Principe
Les chiffres sont calculés par des règles fixes (onglet `indicateurs_live`). L'IA ne calcule rien : elle rédige une lecture à partir d'un JSON de chiffres. Aucune donnée personnelle n'est envoyée.

## 2. Données envoyées à l'IA (entrée)
Un JSON construit par n8n, un objet par métier et par zone :

```json
{
  "date_run": "2026-10-05",
  "sources_manquantes": [],
  "lignes": [
    {
      "metier": "Plombier",
      "zone": "Île-de-France",
      "offres_actives": 118,
      "age_moyen_jours": 22.4,
      "offres_republiees": 9,
      "taux_salaire_renseigne": 0.41,
      "part_offres_plus_30_jours": 0.28,
      "nb_entreprises_potentiel": 25,
      "nb_organismes_formation": 14,
      "evolution_offres_vs_semaine_precedente": 6
    }
  ]
}
```

## 3. Prompt système (à copier dans le noeud IA)

```
Tu es analyste du marché de l'emploi. Tu rédiges une synthèse hebdomadaire en français
sur la tension de recrutement de quatre métiers (électricien du bâtiment, plombier,
mécanicien automobile, mécanicien poids lourd) dans deux zones (Île-de-France, Lyon).

RÈGLES STRICTES
1. Tu n'utilises QUE les chiffres présents dans le JSON fourni. Tu ne calcules pas de
   nouveau chiffre, tu n'arrondis pas de façon trompeuse, tu n'estimes rien.
2. Si une donnée manque ou est vide, tu écris "non disponible". Tu ne la remplaces pas
   par une hypothèse.
3. Ce sont des INDICATEURS de tension, pas des mesures directes de la pénurie.
   Tu utilises des formulations prudentes : "suggère", "est compatible avec",
   jamais "prouve" ni "confirme".
4. Tu compares les zones et les métiers uniquement quand les deux chiffres existent.
5. Un salaire non renseigné n'est pas un salaire nul. Si taux_salaire_renseigne est
   inférieur à 0,5, tu signales que la comparaison de salaires est peu fiable.
6. Les offres France Travail ne couvrent qu'une partie du marché. Tu le rappelles
   une fois, dans la section limites.
7. Si sources_manquantes n'est pas vide, tu ouvres le rapport par cette liste et tu
   précises quelles conclusions sont affectées.
8. Tu ne cites aucune personne et aucun chiffre externe au JSON.

FORMAT DE SORTIE : JSON strict, sans texte autour.
{
  "resume": "3 phrases maximum",
  "constats": [
    {"metier": "...", "zone": "...", "lecture": "1 à 2 phrases",
     "chiffres_cites": {"offres_actives": 0, "age_moyen_jours": 0},
     "niveau_tension": "faible | modere | eleve | non_evaluable",
     "confiance": "faible | moyenne | elevee"}
  ],
  "ecarts_entre_zones": ["..."],
  "points_a_surveiller": ["..."],
  "limites": ["..."]
}

GRILLE POUR niveau_tension (indicative, tu l'expliques en une phrase si tu l'utilises)
- eleve : part_offres_plus_30_jours >= 0,35 ET offres en hausse
- modere : entre les deux
- faible : part_offres_plus_30_jours < 0,15 ET offres stables ou en baisse
- non_evaluable : moins de 10 offres actives ou données manquantes
```

Contrôle côté n8n après la réponse : pour chaque entrée de `constats`, vérifier que les valeurs de `chiffres_cites` sont identiques à celles du JSON d'entrée. Si l'écart existe, marquer la ligne « non vérifié » dans le rapport.

## 4. Mode dégradé
| Situation | Comportement |
|---|---|
| Source de données indisponible | Le rapport est envoyé avec la liste des sources manquantes en tête |
| Aucune source ne répond | Pas de rapport, un message d'échec est envoyé et une alerte part vers toi |
| IA indisponible | Le rapport est envoyé avec les tableaux de chiffres seuls et la mention « analyse indisponible » |
| Réponse IA invalide ou chiffres incohérents | Une nouvelle tentative, puis tableaux seuls avec la mention « analyse non vérifiée » |
| Moins de 10 offres pour un métier et une zone | Ligne affichée, tension « non évaluable » |

## 5. Gabarit du rapport par email
Objet : `Veille métiers en tension | semaine du [date] | [nb] métiers, [nb] zones`

1. Bandeau d'avertissement si sources manquantes.
2. Résumé (3 phrases maximum).
3. Tableau : métier x zone avec offres actives, âge moyen, part d'offres de plus de 30 jours, taux de salaire renseigné, évolution sur 1 semaine.
4. Écarts entre Île-de-France et Lyon.
5. Entreprises à fort potentiel d'embauche (top 5 par métier et par zone).
6. Organismes de formation de la zone (nombre, exemples).
7. Points à surveiller.
8. Limites et sources : « Données France Travail (API Offres d'emploi, La Bonne Boîte, Open Formation). Les offres publiées ne couvrent qu'une partie du marché. Indicateurs, pas mesures directes. »

## 6. Gabarit Slack (court)
```
*Veille métiers en tension | semaine du [date]*
[Bandeau si sources manquantes]
• Plus tendu cette semaine : [métier, zone] ([offres actives], [part > 30 jours])
• Plus fort mouvement : [métier, zone] ([évolution] offres vs semaine précédente)
• À noter : [1 point à surveiller]
Rapport complet envoyé par email.
```

## 7. Tests à faire avant la démonstration
1. Lancer avec des données réelles sur les 4 métiers et 2 zones et comparer 3 chiffres à la main avec le site francetravail.fr.
2. Couper volontairement une source (mauvaise clé API) : le rapport doit partir avec la mention de source manquante.
3. Injecter un JSON où un chiffre est absent : l'IA doit écrire « non disponible ».
4. Falsifier un chiffre dans la réponse IA : le contrôle n8n doit marquer « non vérifié ».
5. Couper l'IA : les tableaux doivent partir seuls.
