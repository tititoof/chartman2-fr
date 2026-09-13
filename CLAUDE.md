# Conventions pour Claude Code

## Recherche de code et gestion des tokens

- **Navigation dans le code (Vue/TS)** : privilégier le MCP **Serena** (déjà
  configuré) plutôt qu'une lecture de fichiers entiers ou un grep large.
  Serena navigue par symboles (fonctions, composants, appels) via LSP et
  ne remonte que ce qui est pertinent — nettement plus économe en tokens
  qu'un `Read` complet ou un `grep -r` sur tout le repo.
- **Recherche par contenu/sens** (« où fait-on X ? » sans connaître le nom
  exact du symbole) : Serena reste limité au niveau symbole. Si le besoin
  se fait sentir, **grepai** est une piste à évaluer — recherche sémantique
  locale via Ollama (déjà utilisé sur l'infra), sans cloud ni fuite de
  données. Pas encore installé sur ce projet, à tester avant adoption.
- **Exclusions** : dans ce repo, `.gitignore` couvre déjà `node_modules`,
  `coverage`, `.nuxt`, `.output`, etc. — les outils de recherche standards
  (Grep/Glob) les respectent nativement, pas de configuration
  supplémentaire nécessaire ici.
  En revanche, lors d'explorations **au-delà de ce repo** (ex. `~/Projects`
  avec plusieurs dépôts), il n'y a pas d'ignore unifié : penser à exclure
  manuellement les répertoires vendorés/bruyants (`.docker/*/bundle`,
  `coverage/lcov-report`, `node_modules` des autres projets) dans les
  commandes de recherche.
- `.claudeignore` existe côté Claude Code mais a des lacunes connues
  (n'empêche pas toujours une lecture explicite). Ne pas s'y fier comme
  seule barrière si des fichiers sensibles doivent rester hors contexte —
  préférer ne pas les committer, ou un hook `PreToolUse` dédié si un
  vrai blocage est nécessaire un jour.
