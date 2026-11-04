#!/usr/bin/env bash
# Builds the page, puts it in a Docker image and exports that to deploy/kalimba.tar.gz, to copy to the docker machine over ssh:
# no registry. Then prints the commands to copy it over and start it; with --deploy (`just deploy`) runs them.
# How to deploy it the first time: deploy/README.md
# Its settings come from deploy/.env (gitignored; deploy/.env.example), and what's set in the environment wins:
#   HOST      the docker machine, for the printed commands (default <host>)
#   DIR       its folder for the kalimba (default ~: the app's own user's home)
#   PLATFORM  the docker machine's platform (default linux/amd64; linux/arm64 needs QEMU here)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy/.env"
# KEY=value lines only, no shell run: the file is data; a variable already set is kept
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key value; do
    [[ $key =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
    [[ -n "${!key:-}" ]] || export "$key=$value"
  done < "$ENV_FILE"
fi
HOST="${HOST:-<host>}"
DIR="${DIR:-~}"
PLATFORM="${PLATFORM:-linux/amd64}"
IMAGE=kalimba
TAG="$(git -C "$ROOT" rev-parse --short HEAD)"
OUT="$ROOT/deploy/$IMAGE.tar.gz"

DEPLOY=false
[[ "${1:-}" == "--deploy" ]] && DEPLOY=true
# deploying needs its settings and a machine to go to: checked before the build, not after
if $DEPLOY; then
  [[ -f "$ENV_FILE" ]] || { echo "just deploy: no deploy/.env: copy deploy/.env.example and fill it in" >&2; exit 1; }
  [[ "$HOST" != "<host>" ]] || { echo "just deploy: set HOST in deploy/.env" >&2; exit 1; }
fi

cd "$ROOT"
docker info >/dev/null 2>&1 || { echo "npm run image: Docker isn't running" >&2; exit 1; }
npm run build
# tagged with its commit too, so an older one can be gone back to (README.md, Roll back)
docker build --platform "$PLATFORM" --provenance=false -f deploy/Dockerfile -t "$IMAGE:$TAG" -t "$IMAGE:latest" dist
docker save "$IMAGE:$TAG" "$IMAGE:latest" | gzip -9 > "$OUT"

echo "deploy/$IMAGE.tar.gz: $(du -h "$OUT" | cut -f1), $IMAGE:$TAG"
# the settings and the compose file go along each time: changed here, they're changed there
FILES=("deploy/$IMAGE.tar.gz")
[[ -f "$ENV_FILE" ]] && FILES+=(deploy/.env)
FILES+=(deploy/docker-compose.yml)
# ~ in DIR stays as it is here: the remote side expands it to the app user's home
START="cd $DIR && docker load -i $IMAGE.tar.gz && docker compose up -d"

if ! $DEPLOY; then
  [[ -f "$ENV_FILE" ]] || echo "  (no deploy/.env yet: copy deploy/.env.example and fill it in)"
  echo "To deploy it (the first time, see deploy/README.md), or \`just deploy\`:"
  echo "  scp ${FILES[*]} $HOST:$DIR/"
  echo "  ssh $HOST '$START'"
  exit 0
fi

echo "to $HOST:$DIR"
scp "${FILES[@]}" "$HOST:$DIR/"
ssh "$HOST" "$START"
echo "deployed $IMAGE:$TAG to $HOST"
