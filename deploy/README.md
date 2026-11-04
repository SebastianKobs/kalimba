# Deployment

This folder puts the kalimba on a server as a Docker image. The server is a Docker machine behind Traefik v2.
The deployment uses no image registry. Instead, the image goes into a file. You copy the file over ssh, and the server loads it.
The deployment of the stim-garden demo is the model for this deployment.

| File | What it's for |
|---|---|
| `Dockerfile` | Describes the image. The image contains a static busybox with only `httpd`, the page from `dist/`, and a gzip copy of each text file. `httpd` sends the gzip copy to a browser that accepts gzip. |
| `docker-compose.yml` | Starts the image behind Traefik. The container is read-only, has no capabilities, and is on the network of Traefik. |
| `.env.example` | Shows all settings. Copy it to `.env` (gitignored), and fill in the values on your computer. |
| `.env` | Contains your settings. `npm run image` reads it. The deployment copies it to the Docker machine with the image. Gitignored. |
| `kalimba.tar.gz` | Contains the exported image. `npm run image` makes it. Gitignored. |

## Deploy

```
just deploy
```

This command does these steps:

1. It builds the image.
2. It copies the image, `.env` and the compose file to the machine in `deploy/.env`.
3. It loads the image on the machine.
4. It starts the image.

The command stops before the build if `deploy/.env` is missing. It also stops if `HOST` is missing.

## Build the image only

```
npm run image
```

- The command builds the page.
- It gives the image two tags: `kalimba:<commit>` and `kalimba:latest`.
- It exports both tags to `deploy/kalimba.tar.gz`.
- It shows the commands that copy the image to the machine and start it. The values come from `deploy/.env`.
- **To change a setting one time,** set it on the command line, for example `HOST=other.lan npm run image`. The command line overrides `.env`.
- **For an ARM Docker machine,** set `PLATFORM=linux/arm64` in `.env`. This needs QEMU emulation (binfmt) on the computer that builds the image.
- The first build compiles busybox. This takes approximately one minute. The next builds use the cache.

## Settings

Fill in `deploy/.env` on your computer. `deploy/.env.example` shows all settings.

| Setting | Default | What it is |
|---|---|---|
| `HOST` | `<host>` | The Docker machine, as ssh knows it, with the user of the kalimba: `kalimba@server`, or an alias from `~/.ssh/config` |
| `DIR` | `~` | The folder on the machine: the home folder of that user |
| `PLATFORM` | `linux/amd64` | The platform of the machine |
| `KALIMBA_HOST` | none: compose does not start without it | The host name of the kalimba |
| `TRAEFIK_NETWORK` | `traefik` | The external Docker network of Traefik. This network must exist. |
| `TRAEFIK_ENTRYPOINT` | `websecure` | The HTTPS entrypoint of Traefik |
| `TRAEFIK_CERTRESOLVER` | `letsencrypt` | The certificate resolver of Traefik |

## First deployment

1. Fill in `deploy/.env`.
2. Run `just deploy`.

As an alternative to step 2, run `npm run image`. Then run the 2 commands that it shows:

```
scp deploy/kalimba.tar.gz deploy/.env deploy/docker-compose.yml kalimba@server:~/
ssh kalimba@server 'cd ~ && docker load -i kalimba.tar.gz && docker compose up -d'
```

## Update

Run `just deploy` again.
Each deployment copies the settings and the compose file again. Thus, a change on your computer goes to the machine.
Compose sees that `latest` is a new image. Then compose makes the container again.

## Roll back

Each image also has the tag of its commit. `docker load` keeps the older tags.

1. Set `image:` in `docker-compose.yml` to the image that you want, for example `kalimba:fd657e2`.
2. Run `docker compose up -d`.

`docker images kalimba` shows all images.
The next update copies the compose file again. Then the container uses `latest` again.

## Notes

- **The page is public.** Each person who can reach the host can open the page. Traefik can put an authentication in front of it.
- **One user for each app:** The kalimba has its own user on the machine. The home folder of this user contains the image, `.env` and the compose file. This user needs Docker. Use the `docker` group, or rootless Docker. Note: the `docker` group gives the same power as root.
- **Next to stim-garden:** The kalimba has its own names for the project, the router and the service (`kalimba`). Thus, the two can run behind the same Traefik.
- **Audio:** Some browsers play audio only over HTTPS or on localhost. Serve the page through the TLS entrypoint of Traefik.
- **Check without Traefik:** Run `docker run --rm -p 8096:8080 kalimba:latest`. Then open `http://localhost:8096`.
  The command `curl -sI -H 'Accept-Encoding: gzip' http://localhost:8096/` shows `Content-Encoding: gzip`.
