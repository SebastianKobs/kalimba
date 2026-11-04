# Everyday commands, run from anywhere in the repository: `just` lists them. The npm scripts they wrap are in CLAUDE.md.

set shell := ["bash", "-c"]

# list the recipes
default:
    @just --list --unsorted

# the dev server, reloading as files change (Vite prints its address)
dev:
    npm run dev

# build the image and deploy it to the docker machine in deploy/.env: copied over ssh, loaded and started there (deploy/README.md)
deploy:
    tools/build-image.sh --deploy
