# Utils

Sous-workflows utilitaires communs à tous les projets.

- **Error Handler** : workflow d'erreur commun (Error Trigger), publié et attaché au chatbot RAG et à Job Market Watch. Il enregistre chaque exécution en échec (workflow, nœud, message, lien) dans la table Supabase `workflow_errors`. n8n ne le déclenche que pour les exécutions de production, pas pour les tests manuels.
