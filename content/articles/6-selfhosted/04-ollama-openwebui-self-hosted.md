---
title: 'Ollama & Open WebUI — Self-hosted'
description: 'Faites tourner des modèles de langage en local, chez vous, avec Ollama, Open WebUI et Docker'
icon: 'i-mdi:robot-outline'
article_id: 'ollama-openwebui-self-hosted'
color: 'purple'
draft: false
publishedAt: '2026-07-04'
---

#### 🤖 Ollama & Open WebUI — Votre propre ChatGPT, chez vous

ChatGPT, Claude, Gemini... les assistants IA en ligne sont impressionnants,
mais chaque message que vous leur envoyez transite par les serveurs d'un
tiers. Pour un usage personnel ça passe. Pour manipuler des données
sensibles, du code propriétaire, ou simplement par conviction, ça pose
question.

Ollama permet de faire tourner des modèles de langage open-source
(Llama, Mistral, Gemma, Qwen...) directement sur votre machine, avec une
API compatible OpenAI. Open WebUI vient se poser dessus pour offrir une
interface web soignée, proche de ce que propose ChatGPT.

Concrètement, cette stack vous permet de :

- 💬 Discuter avec un LLM local, sans connexion internet requise après le téléchargement du modèle
- 🔌 Exposer une API compatible OpenAI utilisable par vos propres outils (dont n8n)
- 🖼️ Générer des images (si un backend de génération est configuré)
- 📄 Interroger vos propres documents (RAG intégré à Open WebUI)
- 👥 Gérer plusieurs utilisateurs et plusieurs modèles depuis une seule interface

> 💡 Les dépôts officiels :
> [github.com/ollama/ollama](https://github.com/ollama/ollama){:target="_blank"}
> et
> [github.com/open-webui/open-webui](https://github.com/open-webui/open-webui){:target="_blank"}

##### Pourquoi Ollama plutôt que LM Studio, llama.cpp, vLLM ou LocalAI ?

Ce ne sont pas des concurrents équivalents — chacun vise un usage différent
(vLLM pour du serving haute performance en production, llama.cpp pour du
contrôle bas niveau, LM Studio pour du desktop sans Docker). 

Pour un homelab, Ollama coche simplement les cases qui comptent :

- ✅ Une image Docker officielle, prête à l'emploi
- ✅ Une API compatible OpenAI dès l'installation, sans configuration
- ✅ Une gestion de modèles très simple (`ollama pull`, `ollama list`)
- ✅ Une communauté énorme, donc peu de mauvaises surprises en cas de bug


#### 🏠 Pourquoi l'héberger soi-même ?

- Vos prompts et vos documents ne quittent jamais votre infrastructure.
- Aucun quota, aucun abonnement, aucune limite de messages.
- Vous choisissez le modèle adapté à votre cas d'usage plutôt que d'être
  limité à celui imposé par un fournisseur.
- L'API Ollama, compatible OpenAI, s'intègre directement au reste de votre
  stack — c'est d'ailleurs tout l'objet de cet article.

C'était justement l'objectif annoncé dans l'article sur
[n8n self-hosted](/blog/article/n8n-self-hosted) : une fois Ollama en place,
n8n peut y déclencher des appels HTTP pour construire des workflows pilotés
par un modèle de langage local, sans dépendre d'une API externe. On y revient
en fin d'article.

> ⚠️ **Prérequis matériel.** Un LLM tourne beaucoup plus confortablement sur
> GPU que sur CPU. La configuration ci-dessous utilise `runtime: nvidia` et
> suppose que le [NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-container-toolkit)
> est déjà installé sur l'hôte. 

> ⚠️ Sans GPU disponible, retirez simplement les
> lignes liées à `nvidia`/`NVIDIA_VISIBLE_DEVICES` — Ollama fonctionne aussi
> sur CPU, juste plus lentement selon la taille du modèle.


#### 🗺️ Schéma d'architecture

<mermaid>
graph LR
  User["🌍 Navigateur"]
  Traefik["🚦 Traefik\nReverse proxy + TLS"]
  WebUI["🖥️ Open WebUI\n:8080"]
  Ollama["🤖 Ollama\n:11434 · GPU"]
  Models["💾 Volume\n.docker/ollama-models"]
  N8n["🔗 n8n\n(article séparé)"]
  Grist["📊 Grist\n(article séparé)"]
  Radicale["📅 Radicale\nCalDAV"]
  User -->|HTTPS| Traefik
  Traefik -->|HTTP interne| WebUI
  WebUI -->|API compatible OpenAI| Ollama
  Ollama --> Models
  N8n -.->|Appel HTTP direct| Ollama
  WebUI -.->|Tool : tâches| Grist
  WebUI -.->|Tool : agenda| Radicale
  classDef proxy fill:#f59e0b,stroke:#d97706,color:#333;
  classDef app fill:#cecbf6,stroke:#534ab7,color:#26215c;
  classDef gpu fill:#f0997b,stroke:#993c1d,color:#4a1b0c;
  classDef storage fill:#9fe1cb,stroke:#0f6e56,color:#04342c;
  class Traefik proxy;
  class WebUI app;
  class Ollama gpu;
  class Models,N8n,Grist,Radicale storage;
</mermaid>

> 💡 Open WebUI n'est qu'un client parmi d'autres pour Ollama. n8n (ou tout
> autre service du réseau Docker) peut appeler directement l'API Ollama sans
> jamais passer par l'interface web. 

> Les connexions vers Grist et Radicale,
> elles, passent par le Tool "Assistant Perso" détaillé plus bas.


#### ⚙️ Prérequis

Cette installation s'appuie sur l'infrastructure mise en place dans la
[série DevOps](/blog/article/0-pourquoi-heberger-soi-meme-souverainete-numerique-self-hosted) :

::tool-table
| Service | Rôle | Article |
|---------|------|---------|
| Traefik | Reverse proxy + TLS | [Article 3](/blog/article/3-docker-traefik-introduction) |
| Réseau `projects_local_dev` | Réseau Docker partagé | [Article 2](/blog/article/2-docker-compose-description) |
| NVIDIA Container Toolkit | Accès GPU depuis Docker | Documentation officielle NVIDIA |
::

> 💡 Contrairement à la plupart des services de cette série, cette stack ne
> nécessite pas PostgreSQL. Ollama stocke ses modèles sur disque, Open WebUI
> utilise SQLite par défaut pour ses propres données (utilisateurs, chats).


#### 🚀 Mise en place

##### 1. Créer `.env-ollama`

```bash [.env-ollama]
# Domaine public d'Open WebUI
OPEN_WEBUI_URL=open-webui.domain.tld

# Clé secrète de session — générez avec : openssl rand -hex 32
WEBUI_SECRET_KEY=changez_moi_openssl_rand_hex_32
```

```bash
openssl rand -hex 32
echo ".env-ollama" >> .gitignore
```

##### 2. Vérifier que Docker voit bien le GPU

Avant de démarrer quoi que ce soit, un test rapide évite un troubleshooting
frustrant plus tard :

```bash
docker run --rm --runtime=nvidia --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

Si votre carte GPU s'affiche dans le tableau, le NVIDIA Container Toolkit
est correctement configuré. Si la commande échoue, revoyez l'installation du
toolkit avant de continuer — Ollama démarrera quand même, mais basculera
silencieusement sur le CPU.

##### 3. Ajouter les services dans `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  ollama:
    image: ollama/ollama:latest
    container_name: project-ollama
    restart: unless-stopped
    runtime: nvidia
    ports:
      - 11434:11434
    volumes:
      - ./.docker/ollama:/root/.ollama
      - ./.docker/ollama-models:/root/ollama-models
    environment:
      OLLAMA_NUM_PARALLEL: 2
      OLLAMA_MAX_LOADED_MODELS: 1
      OLLAMA_MAX_QUEUE: 64
      NVIDIA_VISIBLE_DEVICES: all
      OLLAMA_KEEP_ALIVE: "300"
      OLLAMA_ORIGINS: "*"
      OLLAMA_NUM_GPU: 99
    networks:
      - projects_local_dev

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: project-open-webui
    restart: unless-stopped
    depends_on:
      - ollama
    env_file:
      - .env-ollama
    volumes:
      - ./.docker/open-webui:/app/backend/data
    ports:
      - 9210:8080
    environment:
      OLLAMA_BASE_URL: http://project-ollama:11434
      ENABLE_IMAGE_GENERATION: "True"
    labels:
      - "traefik.enable=true"

      # HTTP
      - "traefik.http.routers.open-webui.rule=Host(`${OPEN_WEBUI_URL}`)"
      - "traefik.http.routers.open-webui.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.open-webui-secure.service=open-webui-secure"
      - "traefik.http.routers.open-webui-secure.rule=Host(`${OPEN_WEBUI_URL}`)"
      - "traefik.http.routers.open-webui-secure.entrypoints=https"
      - "traefik.http.routers.open-webui-secure.tls=true"

      # Port interne
      - "traefik.http.services.open-webui-secure.loadbalancer.server.port=8080"
    networks:
      - projects_local_dev

networks:
  projects_local_dev:
    external: true
```

> 💡 `OLLAMA_MAX_LOADED_MODELS: 1` limite à un seul modèle chargé en mémoire
> GPU à la fois — pertinent sur une carte avec peu de VRAM. Augmentez cette
> valeur si vous avez de la marge et voulez basculer entre plusieurs modèles
> sans temps de rechargement.

> ⚠️ **Ne copiez pas `OLLAMA_ORIGINS: "*"` sans y penser.** Ce réglage
> autorise n'importe quel site web à appeler votre API Ollama en
> cross-origin. Sans risque tant qu'Ollama reste interne au réseau Docker,
> mais à restreindre à vos domaines réels dès que le port `11434` est
> exposé au-delà de ce réseau.

> ⚠️ **`ENABLE_IMAGE_GENERATION: "True"` ne suffit pas à lui seul.** Cette
> variable active l'option côté interface, mais Open WebUI ne génère aucune
> image sans un backend de génération configuré séparément (ComfyUI,
> Automatic1111, ou DALL-E via une clé API OpenAI). Sans backend, le bouton
> apparaît mais toute tentative de génération échoue.

##### 4. Démarrer les services

```bash
docker compose up -d ollama open-webui

docker compose ps
docker compose logs -f ollama open-webui
```

##### 5. Télécharger un premier modèle

Depuis le conteneur Ollama :

```bash
docker exec -it project-ollama ollama pull llama3.2
```

**VRAM approximative nécessaire selon le modèle** (quantification par
défaut, à titre indicatif — variable selon le contexte utilisé) :

::tool-table
| Modèle | VRAM |
|--------|------|
| Llama 3.2 3B | ~2 Go |
| Gemma 3 4B | ~4 Go |
| Mistral 7B | 6 à 8 Go |
| Qwen 2.5 Coder | ~8 Go |
| DeepSeek R1 Distill | 8 à 12 Go |
::

**Quel modèle pour quel usage :**

- **Débutant / petite carte GPU** → `llama3.2:3b`
- **Développement / aide au code** → `qwen2.5-coder`
- **Assistant personnel généraliste** → `gemma3`
- **GPU confortable, qualité maximale** → `mistral-small`

```bash
docker exec -it project-ollama ollama pull mistral
docker exec -it project-ollama ollama pull qwen2.5-coder
```

Vérifiez la liste des modèles installés :

```bash
docker exec -it project-ollama ollama list
```

**Mesurer la vitesse réelle sur votre matériel** — les performances varient
énormément selon la carte GPU, la quantification et le modèle, donc plutôt
que d'afficher des chiffres génériques peu fiables, mesurez directement chez
vous :

```bash
docker exec -it project-ollama ollama run llama3.2 --verbose "Explique-moi Docker en une phrase"
```

Le flag `--verbose` affiche le débit en tokens/seconde à la fin de la
réponse — un bon indicateur pour comparer plusieurs modèles sur votre propre
configuration.

##### 6. Premier accès à Open WebUI

Ouvrez `https://open-webui.domain.tld`. Le premier compte créé devient
automatiquement administrateur.

Une fois connecté, le modèle téléchargé à l'étape précédente apparaît
directement dans le sélecteur de modèle — prêt à discuter.

![Chat Open WebUI](/img/content/openwebui-1.png){ width=100% }


#### 🔌 Connecter Ollama à n8n

C'est le lien annoncé dans l'article sur
[n8n self-hosted](/blog/article/n8n-self-hosted) : Ollama expose une API
compatible OpenAI, directement joignable depuis n8n sur le réseau Docker
partagé (`projects_local_dev`), sans passer par Open WebUI.

Un appel minimal depuis un node **HTTP Request** de n8n :

- **Méthode** : `POST`
- **URL** : `http://project-ollama:11434/api/generate`
- **Body (JSON)** :
```json
{
  "model": "llama3.2",
  "prompt": "{{ $json.texte_a_traiter }}",
  "stream": false
}
```

Ça suffit pour brancher un workflow n8n complet — webhook en entrée, appel à
Ollama pour transformer ou résumer un texte, puis écriture du résultat dans
Grist ou ailleurs. Le détail de ce workflow fera l'objet d'un prochain
article dédié.


#### 🧩 Aller plus loin : Prompts, Connaissances, Skills, Tools

Open WebUI propose quatre briques dans son Workspace, souvent confondues
alors qu'elles servent des besoins très différents :

::tool-table
| Section | Nature | Rôle |
|---------|--------|------|
| **Prompts** | Texte, déclenché par `/` | Raccourcis de saisie réutilisables |
| **Connaissances** | Documents indexés (RAG) | Lecture passive de docs statiques |
| **Skills** | Instructions Markdown | Enseigne *comment* aborder une tâche, sans exécuter de code |
| **Tools** | Code Python exécuté serveur | Donne la capacité d'*agir* (API, bases, fichiers...) |
::

Les Tools sont la brique la plus puissante : du code Python qui tourne
côté serveur et permet au modèle d'appeler de vraies API, pas seulement de
lire des documents.

![Workspace Open WebUI](/img/content/openwebui-workspace.png){ width=100% }

**Exemple concret** : un Tool "Assistant Perso" qui donne au modèle deux
capacités — gérer des tâches dans Grist (voir
[l'article dédié](/blog/article/grist-self-hosted)) et gérer un agenda via
Radicale, un serveur CalDAV/CardAV léger et self-hosted.

##### Ajouter Radicale dans `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  radicale:
    image: tomsquest/docker-radicale:latest
    container_name: project-radicale
    restart: unless-stopped
    volumes:
      - $PWD/.docker/radicale/data:/data
      - $PWD/.docker/radicale/config:/config
    labels:
      - "traefik.enable=true"

      # HTTP
      - "traefik.http.routers.radicale.rule=Host(`${RADICALE_URL}`)"
      - "traefik.http.routers.radicale.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.radicale-secure.service=radicale-secure"
      - "traefik.http.routers.radicale-secure.rule=Host(`${RADICALE_URL}`)"
      - "traefik.http.routers.radicale-secure.entrypoints=https"
      - "traefik.http.routers.radicale-secure.tls=true"

      # Port interne
      - "traefik.http.services.radicale-secure.loadbalancer.server.port=5232"
    networks:
      projects_local_dev:
        aliases:
          - ${RADICALE_URL}

networks:
  projects_local_dev:
    external: true
```

> 💡 Pas de port exposé sur l'hôte ici : Radicale n'a besoin d'être joignable
> que via Traefik et depuis Open WebUI sur le réseau Docker interne.

##### Le Tool côté Open WebUI

Dans **Workspace → Tools**, on colle un script Python dont chaque méthode
devient un appel possible pour le modèle. L'essentiel repose sur deux
éléments : les `Valves` (la configuration, saisie une fois dans l'interface)
et les **docstrings**, qui indiquent au modèle *quand* utiliser chaque
fonction :

![Import d'un Tool dans Open WebUI](/img/content/openwebui-tools.png){ width=100% }

```python
class Tools:
    class Valves(BaseModel):
        GRIST_API_KEY: str = Field(default="")
        RADICALE_PASSWORD: str = Field(default="")
        # ... autres paramètres de connexion

    def ajouter_tache(self, titre: str, priorite: str = "Normale", ...) -> str:
        """
        Ajoute une TÂCHE (todo, ticket, action à accomplir).
        NE PAS utiliser pour un rendez-vous : voir ajouter_evenement_calendrier.
        """
        ...

    def ajouter_evenement_calendrier(self, titre: str, date: str, ...) -> str:
        """
        Ajoute un ÉVÉNEMENT (rendez-vous, réunion, date/heure précise).
        NE PAS utiliser pour une tâche sans heure fixe : voir ajouter_tache.
        """
        ...
```

Les autres méthodes (`lister_taches`, `lister_evenements_calendrier`,
`lister_projets`) suivent exactement la même logique — chacune avec sa
docstring explicite sur quand l'utiliser.

> 💡 Le code complet du Tool (avec toutes les méthodes Grist et Radicale) est
> disponible sur cette
> [Gist GitHub](https://gist.github.com/tititoof/e3e36aee960e03a362c22bc5608ba6b1#file-assistant-perso-tool-py){:target="_blank"} —
> à copier tel quel dans **Workspace → Tools**, puis à configurer via les
> `Valves` de l'interface (vos propres identifiants Grist et Radicale).

Cette double consigne dans les docstrings ("utiliser X pour ça / ne pas
utiliser pour ça") est ce qui permet au modèle de choisir la bonne fonction
sans ambiguïté : demander *"note-moi un rendez-vous chez le dentiste
vendredi 14h"* déclenche `ajouter_evenement_calendrier`, alors que *"pense à
relancer le client"* déclenche `ajouter_tache` — sans que l'utilisateur ait
à préciser quoi que ce soit.

Le résultat : un assistant qui répond aussi bien à *"qu'est-ce que j'ai
prévu cette semaine ?"* (lecture du calendrier) qu'à *"ajoute une tâche
urgente pour corriger le bug de prod"* (écriture dans Grist), directement
depuis Open WebUI.

> ⚠️ Comme pour `executeCommand` dans n8n, un Tool exécute du code Python
> arbitraire côté serveur — la documentation officielle d'Open WebUI est
> explicite sur ce point : donner à quelqu'un la capacité de créer ou
> d'importer un Tool équivaut à lui donner un accès shell au serveur.
> N'installez que des Tools de confiance, relisez le code avant import, et
> réservez l'accès au Workspace aux administrateurs.


#### 🔒 Sécurité — bonnes pratiques

- `OLLAMA_ORIGINS` et `ENABLE_IMAGE_GENERATION` — voir les encarts dédiés
  plus haut, juste après le `docker-compose.yml`.
- Ne jamais laisser `WEBUI_SECRET_KEY` vide en production — une clé vide
  invalide la persistance des sessions et peut déconnecter tous les
  utilisateurs à chaque redémarrage.
- N'exposez pas le port `11434` d'Ollama directement sur internet ; il n'a
  pas de couche d'authentification native. Passez par Open WebUI (qui, lui,
  gère des comptes) ou gardez l'accès limité au réseau Docker interne.
- Créez le compte administrateur d'Open WebUI dès le premier accès — ne
  laissez jamais l'instance ouverte sans compte, même temporairement.
- Limitez la création/import de Tools aux administrateurs de confiance —
  voir l'encart dédié ci-dessus.


#### 💾 Sauvegardes

Deux répertoires à couvrir :

- `.docker/ollama-models` (et `.docker/ollama`) : les modèles téléchargés.
  Volumineux, mais facilement re-téléchargeables — leur perte n'est pas
  critique.
- `.docker/open-webui` : comptes utilisateurs, historique de conversations,
  configuration. C'est la donnée qui compte vraiment ici — à intégrer à
  votre stratégie de sauvegarde existante (Postgresus/RustFS ou autre).


#### ✅ Résumé

::tool-table
| Élément | Détail |
|---------|--------|
| Image Ollama | `ollama/ollama:latest` |
| Image Open WebUI | `ghcr.io/open-webui/open-webui:main` |
| Port interne Ollama | `11434` |
| Port interne Open WebUI | `8080` |
| GPU | NVIDIA via `runtime: nvidia` (optionnel, CPU possible) |
| Stockage | Volumes locaux (modèles + données Open WebUI) |
| URL | `https://open-webui.domain.tld` |
| API | Compatible OpenAI, réutilisable par n8n |
| Extensibilité | Prompts, Connaissances, Skills, Tools |
::


#### ✅ Conclusion

Ollama et Open WebUI donnent accès à un assistant IA complet, sans quota, ni
dépendance à un service tiers, ni fuite de données vers l'extérieur.

Mais l'intérêt ne s'arrête pas à l'interface de chat : l'API compatible
OpenAI qu'expose Ollama en fait une brique réutilisable par le reste de la
stack — à commencer par n8n, qui viendra s'y connecter dans un prochain
article pour construire des workflows pilotés par un modèle local.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::