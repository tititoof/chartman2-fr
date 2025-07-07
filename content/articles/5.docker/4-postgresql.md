---
title: 'Docker - PostgreSQL'
description: 'Initialisation de PostgreSQL avec Docker'
icon: 'i-mdi:docker'
article_id: '4-docker-postgresql-init'
---


**Le SGBD idéal pour vos projets : PostgreSQL**

Vous êtes développeur, responsable informatique ou entrepreneur ? Vous cherchez une base de données robuste et scalable pour vos applications métier ? Alors vous avez peut-être déjà entendu parler de PostgreSQL, mais est-ce que vous savez vraiment ce qu'il offre ?

**Pourquoi choisir PostgreSQL ?**

* **Sécurité :** PostgreSQL offre un niveau de sécurité élevé avec des fonctionnalités de cryptage et d'autorisation.
* **Flexibilité :** il supporte une grande variété de langages de programmation, y compris Java, Python et Ruby.
* **Scalabilité :** PostgreSQL peut gérer des volumes de données importants et des charges de travail élevées.

**Les avantages**

PostgreSQL est gratuit, open-source et bénéficie d'une communauté active et solide. Ses fonctionnalités avancées, comme la prise en charge de la géodérisation et de l'analyse spatiale, font de lui une excellente option pour les applications métier.

**Quels projets peuvent utiliser PostgreSQL ?**

* **Applications métier**
* **Bases de données grand public**
* **Systèmes de gestion de la chaîne d'approvisionnement**

Si vous cherchez une base de données robuste et scalable, PostgreSQL est l'excellente option. Découvrez pourquoi les développeurs et les entreprises le choisissent pour leurs projets !

**docker-compose.yml**

Voilà le contenu d'une déclaration d'un service PostgreSQL.

```yml [~/Projects/docker-compose.yml]
services:
  postgresql:
    image: postgres:15
    volumes:
      - ./.docker/postgresql:/var/lib/postgresql/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - 5432:5432
    environment:
      POSTGRES_USER: username
      POSTGRES_PASSWORD: password
    networks:
      local_dev:
        aliases:
          - postgresql.traefik.me
    labels:
      - com.centurylinklabs.watchtower.enable=false
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 5s
      timeout: 5s
      retries: 10

```