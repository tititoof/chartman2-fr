#!/usr/bin/env bash
# Versions CalVer AAAA.M.N : année, mois sans zéro devant (sinon ce n'est plus
# du semver valide pour npm et Renovate), numéro dans le mois à partir de 1.
# Exemple : 2026.11.1, 2026.11.2, puis 2026.12.1.
#
# Les tags du dépôt Forgejo sont la seule source : rien à commiter pour changer
# de version. Script identique dans chartman2.fr, candlekeep-backend et
# candlekeep-frontend (voir lab-iac, PLAN-k3s-homelab.md).
#
#   calver.sh next              affiche la prochaine version
#   calver.sh release VERSION   crée le tag et la release VERSION sur $GIT_COMMIT
#
# Variables : FORGEJO_REPO (ex. toofytroll/candlekeep-backend), FORGEJO_TOKEN
# (jeton Forgejo, scope write:repository), GIT_COMMIT (posé par Jenkins).
# CALVER_DRY_RUN=1 : affiche la requête de release au lieu de l'envoyer.
set -euo pipefail

FORGEJO_URL=${FORGEJO_URL:-https://forgejo.chartman2-fr.ovh}
: "${FORGEJO_REPO:?FORGEJO_REPO manquant}" "${FORGEJO_TOKEN:?FORGEJO_TOKEN manquant}"
REPO_URL="$FORGEJO_URL/$FORGEJO_REPO.git"

# git s'authentifie par un credential helper qui lit la variable au moment de
# l'appel : le jeton n'apparaît ni dans la ligne de commande, ni dans .git/config.
export FORGEJO_TOKEN
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="credential.$FORGEJO_URL.helper"
# shellcheck disable=SC2016 # $FORGEJO_TOKEN est lu par le helper, pas ici
export GIT_CONFIG_VALUE_0='!f() { echo username=jenkins; echo "password=$FORGEJO_TOKEN"; }; f'

# Tags CalVer du dépôt distant, du plus ancien au plus récent
calver_tags() {
    git ls-remote --tags --refs "$REPO_URL" \
        | sed 's#.*refs/tags/##' \
        | { grep -E '^[0-9]{4}\.[0-9]{1,2}\.[0-9]+$' || true; } \
        | sort -t. -k1,1n -k2,2n -k3,3n
}

next_version() {
    local month last
    # 10# : « 03 » serait lu en octal ; sans tzdata, TZ retombe sur UTC
    month="$(TZ=Europe/Paris date +%Y).$((10#$(TZ=Europe/Paris date +%m)))"
    last=$(calver_tags | awk -F. -v m="$month" '$1"."$2 == m { n = $3 } END { print n }')
    echo "$month.$((${last:-0} + 1))"
}

json_escape() {
    local s=$1
    s=${s//\\/\\\\}
    s=${s//\"/\\\"}
    s=${s//$'\t'/\\t}
    s=${s//$'\r'/}
    s=${s//$'\n'/\\n}
    printf '%s' "$s"
}

release() {
    local version=$1 prev notes payload
    : "${GIT_COMMIT:?GIT_COMMIT manquant}"
    [[ $version =~ ^[0-9]{4}\.[0-9]{1,2}\.[0-9]+$ ]] || { echo "Version invalide : $version" >&2; exit 2; }

    prev=$(calver_tags | tail -n1)
    if [ -n "$prev" ]; then
        git fetch -q --no-tags "$REPO_URL" "+refs/tags/$prev:refs/tags/$prev"
        notes="Changements depuis $prev :"$'\n\n'"$(git log --no-merges --format='- %s (%h)' "$prev..$GIT_COMMIT")"
    else
        notes="Première version en CalVer."
    fi

    # Forgejo crée le tag sur target_commitish en même temps que la release
    payload=$(printf '{"tag_name":"%s","target_commitish":"%s","name":"%s","body":"%s"}' \
        "$version" "$GIT_COMMIT" "$version" "$(json_escape "$notes")")
    if [ "${CALVER_DRY_RUN:-}" = 1 ]; then
        echo "$payload"
        return
    fi
    curl -sS --fail-with-body -m 60 -o calver-response.json \
        -X POST "$FORGEJO_URL/api/v1/repos/$FORGEJO_REPO/releases" \
        -H "Authorization: token $FORGEJO_TOKEN" \
        -H 'Content-Type: application/json' \
        --data-binary "$payload" \
        || { echo "Release $version refusée par Forgejo :" >&2; cat calver-response.json >&2; echo >&2; exit 1; }
    echo "Release $version créée sur ${GIT_COMMIT:0:7}"
}

case "${1:-}" in
    next) next_version ;;
    release) release "${2:?usage : calver.sh release VERSION}" ;;
    *) echo "usage : calver.sh next | release VERSION" >&2; exit 2 ;;
esac
