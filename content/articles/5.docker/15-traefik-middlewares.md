---
title: "Docker – Traefik : restreindre l'accès avec les middlewares"
description: "Limiter un service Docker à votre réseau local avec le middleware ipAllowList de Traefik, comprendre pourquoi Docker masque parfois l'IP du client, et combiner redirection HTTPS et authentification."
icon: "i-mdi:shield-lock-outline"
article_id: "15-docker-traefik-middlewares"
color: "blue"
draft: true
publishedAt: '2026-10-06'
---
#### 📌 Pourquoi des middlewares ? ![Traefik](/img/traefik.webp){ width=30px }

Dans l'[article d'introduction à Traefik](/blog/article/3-docker-traefik-introduction), chaque service devient accessible dès qu'on lui ajoute quelques labels. C'est pratique… et parfois un peu trop : un outil interne comme [SearXNG](/blog/article/docker-searxng-init), un dashboard ou une interface d'administration n'a aucune raison d'être joignable depuis tout Internet.

Les **middlewares** de Traefik s'intercalent entre le routeur et le service pour transformer ou filtrer la requête avant qu'elle n'atteigne le conteneur :

* **Filtrer** : n'autoriser que certaines IP (`ipAllowList`)
* **Authentifier** : demander un identifiant et un mot de passe (`basicAuth`)
* **Rediriger** : forcer le passage en HTTPS (`redirectScheme`)
* **Modifier** : ajouter des en-têtes de sécurité, réécrire un chemin, limiter le débit…

<mermaid>
graph LR
  Client["🌍 Client"] -->|requête| Router["🚦 Routeur<br/>Host(searxng…)"]
  Router --> MW["🛡️ Middleware<br/>ipAllowList"]
  MW -->|IP autorisée| Service["🔍 Service<br/>SearXNG :8080"]
  MW -.->|IP refusée| Refus["⛔ 403 Forbidden"]
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Router,MW,Service containerStyle;
</mermaid>

Comme le reste de la configuration Traefik, un middleware se déclare **avec des labels Docker** : on le définit, puis on l'attache à un ou plusieurs routeurs.

#### 🛡️ Limiter un service au réseau local avec ipAllowList

Exemple concret avec SearXNG, qui ne doit être accessible que depuis le réseau de la maison :

```yml [docker-compose.yml]
services:
  searxng:
    image: searxng/searxng:latest
    labels:
      - "traefik.enable=true"
      # HTTP (la redirection vers HTTPS est ajoutée plus bas)
      - "traefik.http.routers.searxng.rule=Host(`searxng.chartman2-fr.ovh`)"
      - "traefik.http.routers.searxng.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.searxng-secure.service=searxng-secure"
      - "traefik.http.routers.searxng-secure.rule=Host(`searxng.chartman2-fr.ovh`)"
      - "traefik.http.routers.searxng-secure.entrypoints=https"
      - "traefik.http.routers.searxng-secure.tls=true"

      # Accès restreint au réseau local
      - "traefik.http.middlewares.searxng-lan.ipallowlist.sourcerange=192.168.1.0/24,172.26.0.1/32"
      - "traefik.http.routers.searxng.middlewares=searxng-lan"
      - "traefik.http.routers.searxng-secure.middlewares=searxng-lan"

      # Port interne
      - "traefik.http.services.searxng-secure.loadbalancer.server.port=8080"
    networks:
      - local_dev
```

##### Explications

::tool-table
| Label | Rôle |
|-------|------|
| `middlewares.searxng-lan.ipallowlist.sourcerange` | Déclare un middleware nommé `searxng-lan` et la liste des plages IP autorisées (notation CIDR, séparées par des virgules) |
| `routers.searxng.middlewares` | Attache le middleware au routeur HTTP |
| `routers.searxng-secure.middlewares` | L'attache aussi au routeur HTTPS — **les deux** doivent être protégés, sinon on contourne le filtre par l'autre porte |
| `192.168.1.0/24` | Tout le réseau local de la box |
| `172.26.0.1/32` | La passerelle du réseau Docker — voir le piège ci-dessous 👇 |
::

Toute requête dont l'IP source n'est pas dans la liste reçoit un **403 Forbidden**, avant même d'atteindre le conteneur.

> ⚠️ `ipAllowList` est le nom utilisé depuis Traefik v3. En v2, le même middleware s'appelait `ipWhiteList` (labels `…ipwhitelist.sourcerange`). Cette série utilise Traefik v3.

> 💡 Le nom du middleware est global à Traefik : une fois `searxng-lan` déclaré sur un conteneur, n'importe quel autre routeur peut l'utiliser avec `…middlewares=searxng-lan@docker`. Pour un usage partagé, préférez un nom générique comme `lan-only`.

#### ⚠️ Le piège : Docker masque l'IP du client

Première version du label, en toute logique :

```yml
- "traefik.http.middlewares.searxng-lan.ipallowlist.sourcerange=192.168.1.0/24,127.0.0.1/32"
```

Résultat depuis le PC qui héberge Docker : **403**, alors que son IP (`192.168.1.x`) est bien dans la plage autorisée. 🤔

L'explication se trouve du côté de Docker. Lorsqu'un conteneur publie un port (`ports: - "443:443"`), Docker lance un petit relais, `docker-proxy` :

```bash
pgrep -a docker-proxy
# /usr/bin/docker-proxy -proto tcp -host-ip 0.0.0.0 -host-port 443 -container-ip 172.26.0.11 -container-port 443
```

* Depuis **un autre appareil** du réseau (téléphone, portable…), la requête est redirigée par les règles iptables de Docker : Traefik voit la vraie IP du client, `192.168.1.x`.
* Depuis **la machine hôte elle-même**, la connexion passe par `docker-proxy`, qui ouvre une nouvelle connexion vers le conteneur. Traefik voit alors l'IP de la **passerelle du réseau Docker**, pas celle du PC.

Pour retrouver cette passerelle :

```bash
docker network inspect projects_local_dev --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
# 172.26.0.1
```

On l'ajoute donc à la liste, **en /32 uniquement** : autoriser tout le sous-réseau `172.26.0.0/16` ouvrirait l'accès à tous les conteneurs du réseau.

> ⚠️ `127.0.0.1` ne sert à rien ici : Traefik tourne dans un conteneur, il ne voit jamais le loopback de l'hôte.

> ⚠️ Même logique si Traefik est lui-même derrière un autre proxy ou un CDN : c'est l'IP du proxy qui apparaît. Il faut alors indiquer à Traefik de lire l'en-tête `X-Forwarded-For` avec l'option `ipallowlist.ipstrategy.depth` — et ne le faire que si ce proxy est de confiance, puisqu'un client peut forger cet en-tête.

#### 🧪 Vérifier que le filtre fonctionne

Tester l'accès autorisé, depuis le réseau local :

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://searxng.chartman2-fr.ovh/
# 200
```

Tester un refus, en passant par un autre conteneur (IP `172.26.0.x`, hors liste) :

```bash
docker exec projects-n8n-1 wget -S -qO- --header "Host: searxng.chartman2-fr.ovh" http://projects-traefik-1/
# HTTP/1.1 403 Forbidden
```

> 💡 `projects-n8n-1` et `projects-traefik-1` sont les noms des conteneurs sur mon installation : adaptez-les à vos propres conteneurs (`docker ps`).

> 💡 Le filtre ne s'applique qu'aux requêtes qui **passent par Traefik**. Un conteneur qui appelle directement `http://searxng:8080` sur le réseau Docker (n8n, Open WebUI…) n'est pas concerné : c'est justement ce qui permet de fermer l'accès public sans casser les intégrations internes.

#### 🔐 Aller plus loin : combiner plusieurs middlewares

Un routeur accepte plusieurs middlewares, exécutés **dans l'ordre** de la liste.

##### Rediriger HTTP vers HTTPS

```yml
- "traefik.http.middlewares.searxng-redirect.redirectscheme.scheme=https"
- "traefik.http.middlewares.searxng-redirect.redirectscheme.permanent=true"
- "traefik.http.routers.searxng.middlewares=searxng-lan,searxng-redirect"
```

Le filtre IP passe en premier : une IP refusée reçoit directement un 403, sans même être redirigée.

##### Ajouter une authentification

Pour un service à ouvrir hors du réseau local, `basicAuth` demande un identifiant et un mot de passe. On génère l'utilisateur avec `htpasswd` (paquet `apache2-utils` ou `httpd-tools`) :

```bash
htpasswd -nbB admin 'MotDePasseSolide' | sed -e 's/\$/\$\$/g'
# admin:$$2y$$05$$...
```

```yml
- "traefik.http.middlewares.searxng-auth.basicauth.users=admin:$$2y$$05$$..."
- "traefik.http.routers.searxng-secure.middlewares=searxng-auth"
```

> ⚠️ Dans un `docker-compose.yml`, chaque `$` du hash doit être doublé en `$$`, sinon Docker Compose tente de l'interpréter comme une variable — d'où le `sed` ci-dessus.

::tool-table
| Besoin | Middleware |
|--------|-----------|
| Service strictement interne | `ipAllowList` seul |
| Service interne, parfois consulté en déplacement | VPN (WireGuard) + `ipAllowList` sur la plage du VPN |
| Service ouvert, mais réservé à quelques personnes | `basicAuth` (ou un SSO type Authelia / Authentik) |
::

#### 🔎 Contrôler dans le dashboard

Le dashboard Traefik (port `8080` dans notre configuration) liste les middlewares actifs dans *HTTP → Middlewares*, et affiche pour chaque routeur ceux qui lui sont attachés. C'est le premier endroit à regarder si un filtre ne semble pas s'appliquer : une faute de frappe dans le nom du middleware apparaît immédiatement en erreur.

<!-- TODO capture : dashboard Traefik, routeur searxng-secure avec le middleware searxng-lan → /img/content/traefik-middlewares.png -->

#### ✅ Conclusion

Tous les services n'ont pas vocation à être publics. Avec trois labels, `ipAllowList` referme la porte au niveau de Traefik, sans toucher au conteneur ni à sa configuration.

Le seul vrai piège est celui de l'IP source : **Traefik filtre sur l'IP qu'il voit, pas forcément celle du client**. Un `403` inattendu depuis la machine hôte vient presque toujours de `docker-proxy` et de la passerelle du réseau Docker.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
