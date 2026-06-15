---
title: 'Grist — Self-hosted'
description: 'Hébergez votre propre alternative open-source à Airtable et Google Sheets avec Grist, Docker et Traefik'
icon: 'i-mdi:table-large'
article_id: 'grist-self-hosted'
color: 'green'
draft: false
publishedAt: '2026-06-17'
---

#### 📊 Grist — Tableur et base de données, ensemble

Les tableurs classiques comme Excel ou Google Sheets sont excellents pour
analyser des données. Les bases de données relationnelles sont parfaites
pour structurer et interroger des données complexes.

Grist se positionne entre les deux : la flexibilité d'un tableur avec la
puissance d'une base de données.

Concrètement, Grist permet de créer des documents collaboratifs combinant
tables liées, formules Python, formulaires, graphiques, calendriers et vues
personnalisées — le tout dans une interface familière pour quiconque a déjà
utilisé un tableur.

> 💡 Grist fait partie de
> [La Suite Numérique](https://lasuite.numerique.gouv.fr/produits/grist){:target="_blank"}
> — la stack open-source recommandée par le gouvernement français pour les
> administrations et collectivités.

> 💡 Le dépôt officiel :
> [github.com/gristlabs/grist-core](https://github.com/gristlabs/grist-core){:target="_blank"}

#### 🆚 Grist vs les alternatives

::tool-table
| | Excel / Sheets | Airtable | Grist |
|---|---|---|---|
| **Structure relationnelle** | ❌ | ✅ | ✅ |
| **Formules avancées** | ✅ (propriétaire) | ⚠️ limité | ✅ Python |
| **Collaboration temps réel** | ✅ | ✅ | ✅ |
| **Self-hosted** | ❌ | ❌ | ✅ |
| **Open-source** | ❌ | ❌ | ✅ |
| **API REST** | ❌ | ✅ | ✅ |
| **Prix** | Abonnement | ~20€/user/mois | Gratuit |
::

#### 🏗️ Cas d'usage typiques

Grist excelle là où un tableur classique atteint ses limites :

* 📋 **CRM léger** : contacts, entreprises, opportunités avec vues liées
* 🧾 **Facturation** : clients → devis → factures avec calculs automatiques
* ⏱️ **Suivi de temps** : projets → tâches → heures avec tableaux de bord
* 📦 **Gestion de stock** : produits, mouvements, alertes de réapprovisionnement
* 🗓️ **Planning d'équipe** : ressources, disponibilités, affectations

#### 💡 Pourquoi Grist dans mon homelab ?

Deux cas concrets m'ont amené à chercher mieux qu'Excel.

Le premier : les **imports de données dans mes applications**. 
CSV et Excel servent souvent de format d'échange — préparer des données 
de test, migrer un référentiel, alimenter une application depuis une 
source externe. Chaque manipulation génère des fichiers épars, 
des versions multiples, et une perte de traçabilité.

Le second : la **gestion des élèves de judo**. Suivi des ceintures, 
informations des licenciés, présences aux cours, passages de grades — 
des données simples sur le papier, mais qui deviennent vite fastidieuses 
dans un tableur classique dès qu'on veut croiser les informations ou 
préparer un export.

Grist répond aux deux cas : une interface tableur pour les utilisateurs 
non techniques, des relations entre tables pour structurer les données, 
et une API pour les intégrations avec le reste de la stack.

#### 🗺️ Schéma d'architecture

<mermaid>
graph LR
  User["🌍 Navigateur\n(Utilisateur)"] -->|HTTPS| Traefik["🚦 Traefik\nReverse Proxy + TLS"]
  Traefik -->|HTTP:8484| Grist["📊 Grist\nSelf-Hosted"]
  Grist -->|Écrit/Lit| Volume["💾 Volume Docker\n./.docker/grist/persist"]
  Volume -->|SQLite| DB["🗃️ Base SQLite\n(Intégrée)"]
  classDef user fill:#f5f5f5,stroke:#333,color:#333;
  classDef proxy fill:#f59e0b,stroke:#d97706,color:#333;
  classDef app fill:#4CAF50,stroke:#2E7D32,color:#fff;
  classDef storage fill:#9C27B0,stroke:#673AB7,color:#fff;
  class User user;
  class Traefik proxy;
  class Grist app;
  class Volume,DB storage;
</mermaid>

> 💡 Contrairement à la plupart des applications de cette série, Grist
> n'a pas besoin de PostgreSQL — il utilise SQLite pour stocker les
> documents dans le volume persistant.

#### ⚙️ Prérequis

Cette installation s'appuie sur l'infrastructure mise en place dans la
[série DevOps](/blog/article/0-pourquoi-heberger-soi-meme-souverainete-numerique-self-hosted) :

::tool-table
| Service | Rôle | Article |
|---------|------|---------|
| Traefik | Reverse proxy + TLS | [Article 3](/blog/article/3-docker-traefik-introduction) |
| Réseau `projects_local_dev` | Réseau Docker partagé | [Article 2](/blog/article/2-docker-compose-description) |
::

#### 🔌 Intégration avec votre stack DevOps

Grist expose une API REST complète permettant de lire et modifier les
données depuis n'importe quelle application.

Quelques exemples :

- synchroniser un CRM avec n8n
- alimenter un tableau de bord Grafana
- importer automatiquement des données depuis une API externe
- générer des documents ou des rapports
- servir de référentiel métier pour une application interne

Pour de nombreux projets, Grist peut devenir une véritable base de
données métier accessible aussi bien aux développeurs qu'aux utilisateurs.

#### 🔗 Exemple : gestion de clients et factures

Dans un tableur classique :

- une feuille Clients
- une feuille Factures
- des copier-coller partout

Dans Grist :

```
Clients
├── Jean Dupont
├── Marie Martin
└── Société ABC

Factures
├── F2026-001 → Jean Dupont
├── F2026-002 → Société ABC
└── F2026-003 → Marie Martin
```

![Clients](/img/content/grist-clients.png){ width=100% }
![Factures](/img/content/grist-factures.png){ width=100% }

Chaque facture référence directement son client.

Si le nom du client change, toutes les vues et tous les calculs sont
mis à jour automatiquement.

#### 🚀 Mise en place

##### 1. Créer `.env-grist`

Créez ce fichier à la racine de votre projet Docker. Il ne doit **jamais**
être commité — ajoutez-le à votre `.gitignore` :

```bash [.env-grist]
# Administrateur par défaut
GRIST_DEFAULT_EMAIL=votre@email.com

# Clé de boot — générez avec : openssl rand -hex 16
GRIST_BOOT_KEY=changez_moi_openssl_rand_hex_16

# URL publique de l'application
APP_HOME_URL=https://grist.domain.tld
```

Générez la clé de boot :

```bash
openssl rand -hex 16
```

Ajoutez le domaine dans votre `.env` principal (lu par Docker Compose
pour l'interpolation des labels Traefik) :

```bash [.env]
# Grist
GRIST_URL=grist.domain.tld
```

##### 2. Ajouter le service dans `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  grist:
    image: gristlabs/grist-oss
    restart: unless-stopped
    env_file:
      - .env-grist
    volumes:
      - ./.docker/grist/persist:/persist
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS redirection
      - "traefik.http.routers.grist.rule=Host(`${GRIST_URL}`)"
      - "traefik.http.routers.grist.entrypoints=http"
      - "traefik.http.middlewares.grist-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.grist.middlewares=grist-redirect"

      # HTTPS
      - "traefik.http.routers.grist-secure.service=grist-secure"
      - "traefik.http.routers.grist-secure.rule=Host(`${GRIST_URL}`)"
      - "traefik.http.routers.grist-secure.entrypoints=https"
      - "traefik.http.routers.grist-secure.tls=true"

      # Port interne
      - "traefik.http.services.grist-secure.loadbalancer.server.port=8484"
    networks:
      - homelab

networks:
  homelab:
    name: projects_local_dev
    driver: bridge
    external: true
```

##### 3. Démarrer le service

```bash
echo ".env-grist" >> .gitignore

docker compose up -d grist

# Suivre le démarrage
docker compose logs -f grist
```

Une fois démarré, Grist est accessible sur `https://grist.domain.tld`.

![Grist](/img/content/grist-accueil.png){ width=100% }

##### 4. Premier accès

À la première ouverture, connectez-vous avec l'email configuré dans
`GRIST_DEFAULT_EMAIL`. Cet utilisateur devient automatiquement
administrateur de l'instance.

La page d'accueil vous propose de créer votre premier **espace de
travail** (workspace), qui contiendra vos documents.

##### 5. Fonctionnalités clés

**Tables liées — la vraie puissance de Grist**

Contrairement à un tableur classique, les tables peuvent se référencer
mutuellement via des colonnes de type `Référence`. Une table `Clients`
liée à `Commandes` : Grist gère la relation, les calculs agrégés et les
vues filtrées automatiquement.

**Formules Python**

Les formules s'écrivent en Python plutôt qu'en syntaxe Excel :

```python
# Montant TTC depuis une table Produits liée
$quantite * $produit.prix_unitaire * (1 + $produit.tva)
```

Accès aux données d'autres tables, calculs complexes, manipulation de
dates — la puissance de Python dans chaque cellule.

**Widgets multiples sur une même page**

Tableau, fiche, graphique, calendrier, formulaire de saisie — plusieurs
vues sur les mêmes données sur une seule page, toutes synchronisées en
temps réel.

**Formulaires de saisie publics**

Chaque table peut exposer un formulaire public pour collecter des données
sans donner accès au document complet. Pratique pour les demandes clients
ou les inscriptions.

**API REST**

Grist expose une API complète pour lire et écrire des données
programmatiquement — idéal pour intégrer avec n8n ou tout autre
service de votre stack.

#### 💾 Sauvegardes

Les documents sont stockés dans le volume `.docker/grist/persist`.

Ce volume contient :

* les documents Grist
* les espaces de travail
* les paramètres de l'instance

Une sauvegarde régulière de ce répertoire suffit à restaurer complètement
votre instance. La stratégie de sauvegarde centralisée sera abordée dans
un prochain article de la [série](https://chartman2-fr.ovh/blog/category/docker).

#### 🔖 Commit

```bash
git add docker-compose.yml .gitignore
git commit -m "feat: ajout Grist self-hosted"
git push origin main
```
#### ✅ Résumé

::tool-table
| Élément | Détail |
|---------|--------|
| Image | `gristlabs/grist-oss` |
| Port interne | `8484` |
| Base de données | SQLite (volume local) |
| Stockage | Volume `./.docker/grist/persist` |
| URL | `https://grist.domain.tld` |
| Formules | Python |
| API | REST intégrée |
::

#### ✅ Conclusion

Grist est l'un de ces outils qui semblent simples au premier abord,
mais dont la puissance apparaît dès que les données commencent à se
complexifier.

Il offre une alternative crédible à Airtable tout en conservant la
souplesse d'un tableur traditionnel.

Pour un développeur, un freelance, une association ou une petite équipe,
c'est probablement l'un des meilleurs compromis entre :

- simplicité d'utilisation
- puissance relationnelle
- automatisation
- contrôle des données

Et comme toujours dans cette série : vos données restent chez vous.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::