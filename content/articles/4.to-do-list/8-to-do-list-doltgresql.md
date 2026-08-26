---
title: 'Todo List — DoltgreSQL, Postgres versionné comme Git'
description: 'On teste DoltgreSQL 1.2.0 sur le backend : branches de données, et les vrais blocages rencontrés'
icon: 'i-mdi:source-branch'
color: 'warning'
article_id: '8-to-do-list-doltgresql'
draft: false
publishedAt: '2026-07-01'
---

#### 🌿 Un aparté : et si la base était versionnée comme du code ?

Le développement du backend est terminé (articles 0 à 7). Avant d'attaquer
autre chose, un aparté technique : [DoltgreSQL](https://github.com/dolthub/doltgresql)
promet une base compatible PostgreSQL qu'on peut brancher, committer,
differ et merger — exactement comme un dépôt Git. Doltgres vient tout
juste d'atteindre sa version 1.0 (6 août 2026) puis 1.2.0 (18 août 2026),
donc littéralement quelques jours avant cet article. L'occasion de tester
une techno toute fraîche sur une vraie petite application Rails, sans rien
casser du setup existant.

> ⚠️ Spoiler : cet article se termine par un **verdict négatif** pour
> l'usage sur `todo-backend` aujourd'hui. On documente quand même toute la
> démarche, parce que les blocages rencontrés sont précis, reproductibles,
> et intéressants en eux-mêmes.

> 💡 Rien de ce qui suit n'est mergé sur `develop`. Tout vit sur une
> branche dédiée `experiment/doltgresql`, avec un `docker-compose` séparé
> qui ne touche ni au réseau `projects_local_dev`, ni au Postgres de prod
> du projet.

---

#### 🧪 Isolation : un compose file à part

Le service Postgres du projet vient d'être stabilisé (voir l'article sur
la collision d'alias DNS) — pas question de le refragiliser pour un test.
DoltgreSQL tourne dans son propre réseau Docker, complètement séparé :

```yaml [docker-compose.doltgresql.yml]
services:
  backend-dolt:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: todo-backend-dolt
    volumes:
      - .:/app
      - /app/vendor/bundle
      - /app/tmp
    environment:
      - RAILS_ENV=development
      - DATABASE_URL=postgresql://postgres:${DOLTGRES_PASSWORD:-doltgres_password}@todo-db-dolt:5432/todo_backend_development
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
    depends_on:
      - todo-db-dolt
    networks:
      - dolt-experiment

  todo-db-dolt:
    image: dolthub/doltgresql:1.2.0
    container_name: todo-backend-doltgresql
    environment:
      - DOLTGRES_PASSWORD=${DOLTGRES_PASSWORD:-doltgres_password}
    ports:
      - "5433:5432"
    networks:
      - dolt-experiment

networks:
  dolt-experiment:
    driver: bridge
```

```bash
docker compose -p todo-backend-dolt -f docker-compose.doltgresql.yml up -d
```

> ⚠️ Le `-p todo-backend-dolt` n'est pas cosmétique. Sans nom de projet
> explicite, Compose réutilise le nom du dossier (`todo-backend`) — le
> même que le stack principal — et log un avertissement "orphan
> containers" au démarrage. Rien de destructeur sans `--remove-orphans`,
> mais autant nommer le projet explicitement pour une isolation propre.

L'image est épinglée à `1.2.0` plutôt que `latest` : sur un projet aussi
jeune (patchs quasi hebdomadaires), `latest` casserait la reproductibilité
de cet article dans six mois.

##### Gotcha n°0 : rien à voir avec Doltgres

Premier blocage, avant même de parler base de données :

```
ERROR: error from sender: open /app/.docker/postgresql: permission denied
```

Le contexte de build Docker embarquait `.docker/postgresql` (le volume de
données du Postgres principal, appartenant à l'utilisateur interne du
conteneur, illisible depuis l'hôte). Ce dossier n'était pas exclu du
`.dockerignore` — un vrai bug latent, sans rapport avec l'expérimentation,
corrigé au passage :

```diff [.dockerignore]
  # Ignore Docker-related files
  /.dockerignore
  /Dockerfile*
+
+ # Ignore Postgres data volume (root-owned, unreadable by the build context sender)
+ /.docker
```

---

#### 🚧 Gotcha n°1 : `db:migrate` charge `schema.rb`, pas les migrations

Sur une base vide, Rails 8 ne rejoue pas les migrations une par une : il
charge directement `db/schema.rb` (le chemin rapide introduit depuis
Rails 6.1). Et `schema.rb` génère `create_table ..., force: :cascade`, ce
qui se traduit par un `DROP TABLE ... CASCADE` avant chaque création —
même sur une base qui n'a jamais eu de table :

```
PG::InternalError: ERROR:  CASCADE is not yet supported
```

Doltgres 1.2.0 ne supporte pas encore `DROP ... CASCADE`. Contournement
réel, en rejouant les migrations une par une plutôt que de charger le
schéma :

```bash
bin/rails runner 'ActiveRecord::MigrationContext.new(Rails.application.config.paths["db/migrate"].to_a).migrate'
```

```
== 20260819074850 CreateTodoItems: migrating ==================================
-- create_table(:todo_items)
   -> 0.0401s
== 20260819074850 CreateTodoItems: migrated (0.0402s) =========================
```

Ça fonctionne, mais c'est un contournement à refaire pour chaque
environnement (dev *et* test) — `bin/rails db:migrate`, `db:schema:load`
et `db:test:prepare` prennent tous le même chemin rapide et cassent tous
de la même façon.

---

#### 🚧 Gotcha n°2 (bloquant) : l'unicité insensible à la casse

`Todo::Scope` valide `nickname` avec `uniqueness: { case_sensitive: false }`.
Toute tentative de création échoue :

```
PG::InternalError: ERROR:  EXPLICIT CAST: cast from `regtype[]` to `oidvector`
does not exist: [{Type:["pg_catalog","varchar"]}]
```

En traçant les requêtes SQL réellement envoyées, la coupable est une
requête interne de Rails — pas une requête applicative — qui sonde la
base pour savoir si une fonction `lower(character varying)` existe, afin
de construire une comparaison insensible à la casse :

```sql
SELECT exists(
  SELECT * FROM pg_proc
  WHERE proname = 'lower' AND proargtypes = ARRAY['character varying'::regtype]::oidvector
) OR exists(...)
```

Ce `CAST` `regtype[] → oidvector` n'est pas implémenté par Doltgres 1.2.0.
Résultat : **tout modèle utilisant `uniqueness: { case_sensitive: false }`
sur une colonne texte est bloqué à la création**, ce n'est pas spécifique
à `Todo::Scope`. Aucun contournement côté application trouvé — pour
continuer les tests, la validation a été temporairement assouplie sur la
branche d'expérimentation uniquement :

```ruby [app/models/todo/scope.rb — branche experiment/doltgresql uniquement]
# EXPERIMENT doltgresql: case_sensitive: false désactivé temporairement — déclenche un CAST
# regtype[] -> oidvector non supporté par Doltgres 1.2.0 (probe interne Rails pour LOWER()).
# NE PAS mergé dans develop, ce commit reste sur experiment/doltgresql.
validates :nickname, presence: true, uniqueness: true, length: { in: 2..15 }
```

---

#### 🚧 Gotcha n°3 (bloquant) : `UPDATE` casse, y compris dans les gems

Une fois la création débloquée, la suite RSpec tombe encore sur 7
échecs (sur 53). Six d'entre eux pointent vers la même erreur, sur un
simple `UPDATE` :

```
PG::UndefinedColumn: ERROR:  column "k" could not be found in any table in scope
```

Reproductible en une ligne, sans lien avec le code métier :

```ruby
s = Todo::Scope.create!(name: "Bench", nickname: "bench1") # OK
s.update(name: "Bench2") # PG::UndefinedColumn: column "k" ...
```

Plus révélateur : cette même erreur casse aussi le flow `POST
/users/tokens/revoke` de **devise-api**, dans le service tiers
`Devise::Api::TokensService::Revoke`. Ce n'est donc pas un bug de
`Todo::Scopes::UpdateService` — c'est un bug du moteur Doltgres sur le
chemin `UPDATE` paramétré d'ActiveRecord (protocole étendu Postgres),
qui casse n'importe quel `update`/`update!` du projet, y compris ceux
fournis par des gems tierces.

> 💡 Les notes de version 1.1.0 de Doltgres mentionnent justement des
> changements sur la gestion du protocole étendu ("statements now execute
> atomically", "commit together upon Sync message") — cohérent avec un
> chantier encore instable sur cette zone.

##### Faux positif trouvé au passage

20 échecs sont apparus au premier run complet, pas 7. La différence :
`docker-compose.doltgresql.yml` fixe `RAILS_ENV=development` (pour que
`bin/rails server` tourne en dev), et `bundle exec rspec` ne force
`RAILS_ENV=test` que si la variable n'est pas déjà positionnée
(`ENV["RAILS_ENV"] ||= "test"`). Toute la suite tournait donc en
environnement `development` — dont le `config.hosts` restrictif
bloquait le host `www.example.com` utilisé par les request specs
(`403 Blocked hosts`). Rien à voir avec Doltgres ; correction :
forcer `RAILS_ENV=test` explicitement à l'invocation de `rspec`.

```bash
docker compose -p todo-backend-dolt -f docker-compose.doltgresql.yml \
  exec -e RAILS_ENV=test backend-dolt bundle exec rspec
```

---

#### 🌿 Ce qui marche vraiment bien : les branches

Le SQL brut (`INSERT`, `SELECT`) fonctionne normalement. C'est là que la
vraie promesse de Doltgres se démontre — en SQL pur, comme documenté :

> ⚠️ Toutes les procédures de version control **doivent être appelées
> via `SELECT`, jamais `CALL`** :
> `SELECT DOLT_BRANCH('...')` — `CALL DOLT_BRANCH('...')` renvoie une
> erreur explicite en Doltgres (contrairement à Dolt/MySQL, où `CALL`
> fonctionne).

> ⚠️ Piège rencontré en premier : `DOLT_BRANCH()` crée une branche à
> partir du **dernier commit Dolt réel**, pas de l'état actuel des
> tables. Nos migrations et seeds n'avaient jamais été committées côté
> version control (seulement 2 commits système existaient :
> `Initialize data repository` et `CREATE DATABASE`) — la première
> branche créée était donc vide. Un commit SQL (`INSERT`) et un commit
> Dolt (`DOLT_COMMIT`) sont deux notions distinctes.

```sql
-- on committe l'état courant (schéma + seeds) avant de brancher
SELECT DOLT_ADD('-A');
SELECT DOLT_COMMIT('-m', 'Schema + seeds initiaux (migrations Rails)');

SELECT DOLT_BRANCH('demo-feature');
```

Pour changer de branche dans une session, deux méthodes documentées :
`SELECT DOLT_CHECKOUT('branche')` (change le HEAD de la session
courante uniquement — les autres connexions restent sur `main`), ou se
connecter directement sur `dbname/branche` :

```bash
psql -h localhost -U postgres -d todo_backend_development/demo-feature
```

```sql
INSERT INTO todo_scopes (name, nickname, created_at, updated_at)
VALUES ('Loisirs', 'hobby', now(), now());

SELECT DOLT_COMMIT('-A', '-m', 'Ajoute le scope Loisirs sur demo-feature');
```

Retour sur `main` : la ligne n'existe pas, exactement comme un
`git checkout` :

```sql
SELECT nickname FROM todo_scopes ORDER BY nickname;
--  family | other | personnal | work   (4 lignes, pas de "hobby")
```

Et le diff est exact, ligne par ligne :

```sql
SELECT * FROM DOLT_DIFF('main', 'demo-feature', 'todo_scopes');
```

```
 to_nickname | from_nickname | diff_type
-------------+---------------+-----------
 hobby       |               | added
```

```sql
SELECT DOLT_MERGE('demo-feature');
-- (hash, 1, 0, "merge successful")
```

`main` a désormais le scope `hobby`. Branch, commit, diff, merge — le
mental model Git fonctionne vraiment, à la commande près.

> 💡 Limite pratique pour un backend Rails : `DOLT_CHECKOUT` est
> **scopé à la session/connexion**, alors qu'ActiveRecord pioche dans un
> pool de connexions partagées entre requêtes. Basculer de branche "pour
> une requête HTTP" ne fonctionne pas nativement avec le connection
> pooling standard de Rails — il faudrait une connexion dédiée par
> branche (ou par tenant), pas juste `checkout` sur la connexion du pool.

---

#### ⏱️ Et la rapidité ?

Même script SQL, une connexion, exécuté sur chaque moteur — écritures et
lectures séparément pour voir si l'écart est uniforme :

```bash
time psql ... -f bench.sql -o /dev/null
```

**Écritures** (`INSERT` séquentiels sur une table jetable) :

| Moteur | 2 000 lignes | 5 000 lignes |
|---|---|---|
| PostgreSQL 17 | 5,01 s / 4,95 s | 12,32 s |
| Doltgres 1.2.0 | 12,29 s / 12,53 s | 26,31 s |

**Lectures** (1 000 `SELECT` ponctuels par clé primaire + 1 agrégat, sur
les 5 000 lignes déjà en place) :

| Moteur | Run 1 | Run 2 |
|---|---|---|
| PostgreSQL 17 | 0,147 s | 0,147 s |
| Doltgres 1.2.0 | 0,592 s | 0,421 s |

**Doltgres ~2,1–2,5× plus lent en écriture, ~3–4× plus lent en lecture**
sur ces tests. L'écart en lecture est le plus surprenant : sur du simple
`SELECT ... WHERE id = $1` par clé primaire, sans aucune notion de
version control impliquée, on aurait pu s'attendre à un coût quasi nul.
Rien de rigoureux — une seule connexion, aucune concurrence, un
poolage de mesures modeste — mais cohérent avec le chiffre publié par
DoltHub (~5× plus lent sur sysbench) et suffisant pour confirmer que le
versioning a un coût réel des deux côtés de la charge, pas juste en
écriture.

---

#### ✅ Verdict

| | |
|---|---|
| Compatible protocole PostgreSQL | ✅ (`pg` gem, `psql`, se connecte sans souci) |
| `db:create`, migrations rejouées une à une | ✅ |
| `INSERT` / `SELECT` (ActiveRecord et SQL brut) | ✅ |
| `db:schema:load` / `db:migrate` sur base vide | ❌ (`CASCADE` non supporté) |
| `uniqueness: { case_sensitive: false }` | ❌ (bloquant, aucun contournement applicatif) |
| `UPDATE` via ActiveRecord | ❌ (bloquant, touche aussi les gems tierces) |
| Branches / commits / diff / merge de données | ✅ — et c'est vraiment bien fait |
| Performance | ~2–2,5× plus lent en écriture, ~3–4× en lecture, vs Postgres 17 |

Doltgres 1.2.0 n'est **pas prêt** pour `todo-backend` aujourd'hui — et ce,
sur une application minimaliste, sans extension, sans JSONB, sans type
exotique. Deux blocages touchent des patterns Rails on ne peut plus
courants (`uniqueness: { case_sensitive: false }`, `update`). La partie
version-control, en revanche, tient vraiment ses promesses en SQL pur.
À surveiller pour un futur article, une fois ces gaps comblés — le
rythme de release (1.0 → 1.2.0 en 12 jours) laisse penser que ça ira
vite.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
