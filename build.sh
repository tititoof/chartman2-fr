#!/usr/bin/env bash
set -e

echo "🔧 Lecture des variables depuis .env.production..."

# Filtrer les lignes valides
BUILD_ARGS=$(grep -vE '^\s*#|^\s*$' .env.production | sed 's/^/--build-arg /')

echo "🚀 Construction de l'image..."
docker build \
  $BUILD_ARGS \
  -t registry.chartman2-fr.ovh/frontend-chartman2fr:0.3 \
  -f Dockerfile.prod \
  .

docker push registry.chartman2-fr.ovh/frontend-chartman2fr:0.3

docker build \
  $BUILD_ARGS \
  -t ghcr.io/tititoof/frontend-chartman2fr:0.3 \
  -f Dockerfile.prod \
  .

source .env.ghcr

echo $CR_PAT | docker login ghcr.io -u tititoof --password-stdin

docker push ghcr.io/tititoof/frontend-chartman2fr:0.3 