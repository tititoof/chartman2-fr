---
type: ProjectContext
project: mon-projet
# Ce fichier est injecté dans chaque prompt Blackstaff.
# Il donne au modèle le vocabulaire métier du projet pour
# que les noms générés soient cohérents avec l'existant.
# Garder concis : 300-500 mots max.
---

# Contexte métier — mon-projet

## Domaine

Application de gestion de commandes B2B permettant aux clients professionnels
de passer des commandes, suivre leur livraison et gérer leur facturation.

## Entités principales

| Entité | Backend (Rails) | Frontend (Nuxt) | Description |
|---|---|---|---|
| Commande | `Order` | `Order` | Commande client avec lignes et paiement |
| Ligne de commande | `OrderItem` | `OrderItem` | Produit + quantité + prix unitaire |
| Client | `Customer` | `Customer` | Entreprise cliente avec contrat |
| Produit | `Product` | `Product` | Référence catalogue avec stock |
| Facture | `Invoice` | `Invoice` | Générée à la confirmation de commande |
| Utilisateur | `User` | `User` | Compte avec rôle (admin, commercial, client) |

## Statuts de commande

```
draft → confirmed → processing → shipped → delivered
                 ↘ cancelled
```

## Conventions de nommage

- Services backend : `app/services/{domain}/` (ex: `app/services/orders/`)
- Jobs : `app/jobs/{action}_{entity}_job.rb` (ex: `process_payment_job.rb`)
- Composables frontend : `use{Entity}` (ex: `useOrders`, `useCart`)
- Stores Pinia : `use{Entity}Store` (ex: `useOrderStore`)
- API routes : `/api/v1/{entities}` (pluriel snake_case)

## Relations clés

- `Customer` has_many `Orders`
- `Order` has_many `OrderItems`
- `OrderItem` belongs_to `Product`
- `Order` has_one `Invoice` (créée à la confirmation)
- `User` belongs_to `Customer` (sauf rôle admin)

## Règles métier importantes

- Un `Order` en statut `shipped` ou `delivered` ne peut pas être annulé
- Le stock `Product` est réservé à la confirmation, libéré à l'annulation
- Les prix sont en euros (centimes en base, euros dans l'API et le frontend)
- Les `Invoice` sont numérotées `FACT-YYYY-NNNN` (année + séquence)
- Tout changement de statut d'`Order` déclenche une notification multi-canal

## Stack technique détaillée

```
Backend  : Rails 8.1 + PostgreSQL + Sidekiq + Redis
Frontend : Nuxt 4.4 + Pinia + Vuetify 3 + TypeScript
Auth     : Devise + JWT (backend) / cookie httpOnly (frontend)
API      : JSON REST, snake_case, pagination Kaminari
```