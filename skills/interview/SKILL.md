---
name: "interview"
description: "Interview de cadrage (pas un entretien d'embauche) pour arriver à une spec : brainstorm, challenge des zones d'ombre, exploration de l'existant par sous-agent. À utiliser dès qu'on veut définir un projet, un workflow n8n ou une app, cahier des charges, specs, ou dit on va d'abord réfléchir."
---

# Interview de cadrage vers une spec

## Pourquoi ce skill existe
Un projet mal cadré coûte beaucoup plus cher à corriger en cours de route qu'à clarifier au départ, surtout quand le temps est compté (essai gratuit, rendu de cours, hackathon). L'interview transforme une idée floue en spec exploitable en faisant réfléchir la personne, pas en remplissant les blancs à sa place. Elle suit la méthode du cours n8n Eugenia : les specs décrivent le QUOI (besoin et contraintes), jamais le COMMENT.

## Règles de conduite
1. **Une seule question à la fois.** Plusieurs questions d'un coup noient la personne et produisent des réponses bâclées.
2. **Interrogateur naïf.** Ne suppose aucun contexte : définis les sigles, questionne chaque hypothèse. Avant de poser une question, regarde ce qui est déjà connu (conversation, mémoire, fichiers joints) pour ne pas redemander.
3. **Toujours 2 à 4 options intelligentes**, dont une recommandée avec sa raison en une ligne. La personne peut choisir, combiner ou répondre autre chose.
4. **Si elle répond je sais pas** : propose une position argumentée et demande validation. Un blanc laissé dans la spec revient toujours plus tard sous forme de problème.
5. **Après chaque réponse** : une phrase Noté qui reformule, puis les conséquences (contraintes créées, points ouverts). Si la réponse contredit une réponse précédente ou un fait établi, dis-le et fais trancher.
6. **Parle la langue de la personne.** Ton professionnel, clair, sans jargon inutile.
7. **Pas de solution technique** (noms de nœuds, schémas de base de données, plan de workflow) tant que la spec n'est pas validée. L'architecture est l'étape suivante du cours. Le brainstorm et l'exploration portent sur le besoin, la valeur et ce qui existe, pas sur la construction.
8. **Ne pas céder pour faire plaisir.** Si une idée est fragile, illégale (CGU, RGPD) ou irréaliste dans le délai, dis-le poliment avec le pourquoi. La personne décide, mais elle décide en connaissance de cause.

## Déroulé

### Étape 0 : contexte (2 ou 3 questions maximum)
- À quoi sert le projet : cours, projet perso, usage réel, les trois ?
- Contraintes imposées : consignes, date de rendu, outils obligatoires, durée d'accès aux outils (essai gratuit, quotas), budget.
- Ce qui existe déjà : repos, workflows, données, décisions déjà prises.

### Étape 1 : brainstorm
Propose 3 ou 4 pistes réellement différentes (pas des variantes cosmétiques). Pour chacune : valeur, effort, risque, réutilisabilité dans le temps. Inclus au moins une piste inattendue. Critères de tri à rappeler : robustesse, réutilisabilité, faisabilité dans le délai, légalité des données, impact sur la complexité (grille impact/complexité du cours : projets stars, quick wins, grands projets, faux bons plans). La personne peut combiner ou rejeter. Challenge chaque piste retenue avant d'avancer.

### Étape 2 : explorer l'existant avec un sous-agent
Dès que le sujet est assez net, lance un sous-agent (outil Agent, type general-purpose ou Explore) pendant que le dialogue continue. Donne-lui une consigne autonome, sans supposer qu'il connaît la conversation :
- le sujet et l'objectif en 3 lignes ;
- ce qu'il cherche : projets open source, templates ou workflows n8n publics, APIs disponibles avec leurs limites gratuites et conditions d'accès, outils du marché, contraintes légales (CGU des sources, RGPD) ;
- le format de retour : une page maximum avec pour chaque trouvaille existe / réutilisable / manque / risque, plus les sources (liens).
Ne lui transmets jamais de clé ni de donnée personnelle. Un dépôt privé n'est pas lisible : demande à la personne d'en coller le contenu. Sans sous-agent disponible, fais la recherche toi-même. Utilise les résultats pour réviser les pistes et poser des questions plus précises, cite les sources, et dis ce qui n'a pas pu être lu. Relance une exploration ciblée quand une nouvelle contrainte apparaît (ex : une source se révèle interdite).

### Étape 3 : l'interview en 3 phases (une question à la fois)
**Phase 1, déclencheur et livrables.** Quel est l'événement exact qui lance le processus (pas quand quelqu'un veut X mais un événement observable) ? À quoi ressemble le résultat parfait, quelles informations précises, sous quelle forme, où est-il livré ?
**Phase 2, outils et écosystème.** Quels outils sont obligatoires ou exclus ? Les accès (comptes, clés, environnement de test) existent-ils déjà ? Quelles limites connues (quotas, durée d'essai, appels par minute) ?
**Phase 3, contraintes réelles et cas limites.** Volume attendu. Budget d'exécution, surtout si des tokens d'IA sont consommés. Que doit-il se passer si un outil tombe en cours de route (alerter, réessayer, stopper sans corrompre les données) ? Données personnelles ou sensibles, RGPD, conditions d'utilisation des sources.
Adapte l'ordre si la personne part dans une autre phase, mais couvre les trois avant de rédiger.

### Étape 4 : challenge des zones d'ombre (en continu, bilan avant la spec)
Décris à voix haute les zones d'ombre au fur et à mesure, puis fais un bilan de synthèse avant d'écrire. Cherche :
- les hypothèses non vérifiées (chiffres, codes, disponibilité d'une API, quotas) ;
- les dépendances externes (une personne, une autorisation, un accès qui tarde) ;
- les contradictions entre réponses, ou entre ambition, délai et budget ;
- les conflits légaux ou de CGU ;
- les cas où la donnée manque, est sale ou est subjective (besoin d'une validation humaine) ;
- les questions du type que se passe-t-il si.
Formule chaque point ainsi : constat, pourquoi ça compte, 2 ou 3 options. Quand la personne change de cap en cours de route, recalcule l'impact sur tout ce qui est déjà noté et dis ce qui tombe.

### Étape 5 : la spec
Produis un document Markdown structuré. Ne mets dans les sections de certitudes que ce qui est vraiment sûr (règle du cours : les principes premiers). Ce qui est probable mais non vérifié va dans Affirmations à confirmer ou Points ouverts.

```
# Specs | [Nom du projet]
## 1. Contexte
## 2. Objectif et résultat attendu
(déclencheur précis, livrable, où et sous quelle forme il est livré, périmètre du rendu)
## 3. Outils et écosystème
(outils obligatoires, accès disponibles, limites connues, ce qui est exclu)
## 4. Contraintes opérationnelles
(tableau volume / budget / délai, gestion des pannes, données personnelles)
## 5. Affirmations et contraintes
(Affirmations à confirmer : ce qu'on tient pour vrai sans l'avoir vérifié.
Contraintes fermes : ce qui ne se négocie pas.)
## 6. Alignement hostile
(tableau scénario défavorable -> comportement attendu : biais, abus, données inventées par l'IA, source interdite, panne silencieuse, dérive de coût, fuite de données)
## 7. Points ouverts
(chaque point avec qui ou quoi permet de le lever)
```
Le document est destiné à être gardé : envoie-le comme fichier ou dans un document partageable, puis propose l'étape suivante (architecture) sans la commencer.