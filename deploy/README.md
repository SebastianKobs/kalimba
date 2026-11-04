# Deployment

The kalimba as a Docker image on a docker machine behind Traefik v2. No registry: the image is exported as a file, copied over ssh and loaded there. Taken from stim-garden's demo deployment.

| File | What it's for |
|---|---|
| `Dockerfile` | The image: a static busybox with nothing but `httpd`, the built page from `dist/`, and a gzip copy of each text file, sent to browsers that accept it |
| `docker-compose.yml` | Runs it behind Traefik: read-only, no capabilities, on Traefik's network |
| `.env.example` | The settings, copied to `.env` (gitignored) and filled in here: where it goes, its host name, Traefik's names |
| `.env` | Your settings: read by `npm run image`, and copied to the docker machine with the image. Gitignored |
| `kalimba.tar.gz` | The exported image, made by `npm run image`. Gitignored |

## Deploy

```
just deploy
```

It builds the image, copies it with `.env` and the compose file to the machine in `deploy/.env`, loads it and starts it there. It stops before building when `deploy/.env` or its `HOST` is missing.

## Build the image only

```
npm run image
```

- It builds the page, tags the image `kalimba:<commit>` and `kalimba:latest`, and exports both to `deploy/kalimba.tar.gz`.
- Then it prints the commands to copy it over and start it, filled in from `deploy/.env`.
- **A setting just this once:** set it on the command line, e.g. `HOST=other.lan npm run image`. It wins over `.env`.
- **ARM docker machine:** `PLATFORM=linux/arm64` in `.env`. That needs QEMU emulation (binfmt) where you build.
- The first build compiles busybox, which takes a minute. After that it's cached.

## Settings

Fill in `deploy/.env` here; `deploy/.env.example` shows every setting.

| Setting | Default | What it is |
|---|---|---|
| `HOST` | `<host>` | The docker machine as ssh knows it, as the kalimba's own user: `kalimba@server` or an `~/.ssh/config` alias |
| `DIR` | `~` | Its folder there: that user's home |
| `PLATFORM` | `linux/amd64` | Its platform |
| `KALIMBA_HOST` | none: compose refuses to start without it | The host name the kalimba is served at |
| `TRAEFIK_NETWORK` | `traefik` | Traefik's external Docker network. It must already exist |
| `TRAEFIK_ENTRYPOINT` | `websecure` | Traefik's HTTPS entrypoint |
| `TRAEFIK_CERTRESOLVER` | `letsencrypt` | Traefik's certificate resolver |

## First deploy

1. Fill in `deploy/.env`.
2. `just deploy`, or build with `npm run image` and run the two commands it prints:
   ```
   scp deploy/kalimba.tar.gz deploy/.env deploy/docker-compose.yml kalimba@server:~/
   ssh kalimba@server 'cd ~ && docker load -i kalimba.tar.gz && docker compose up -d'
   ```

## Update

`just deploy` again. The settings and the compose file go along each time, so a change made here reaches the machine. Compose sees that `latest` points to a new image and recreates the container.

## Roll back

Every image is also tagged with its commit, and `docker load` keeps older tags. Point `image:` in `docker-compose.yml` at the one you want, e.g. `kalimba:fd657e2`, and run `docker compose up -d`. `docker images kalimba` lists them. The next update copies the compose file over again, back to `latest`.

## Notes

- **The page is public** to anyone who can reach the host, unless Traefik puts authentication in front of it.
- **A user per app:** the kalimba gets its own user on the machine, its home holding the image, `.env` and the compose file; that user needs Docker (the `docker` group, which is as good as root, or rootless Docker).
- **Next to stim-garden:** its own project, router and service names (`kalimba`), so both run behind the same Traefik.
- **Audio** needs HTTPS (or localhost) in some browsers: serve it through Traefik's TLS entrypoint.
- **Checking it without Traefik:** `docker run --rm -p 8096:8080 kalimba:latest`, then open `http://localhost:8096`. `curl -sI -H 'Accept-Encoding: gzip' http://localhost:8096/` shows `Content-Encoding: gzip`.
