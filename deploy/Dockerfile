# The built page in the smallest image we can make: a static busybox with nothing but httpd, and the files.
# Taken from stim-garden's demo image. Built and exported by `npm run image`; the build context is dist/, so only the page is sent.

# a busybox with only the httpd applet, linked statically: no shell, no libc in the final image
FROM alpine:3.24 AS httpd
ARG BUSYBOX=1.36.1
ARG BUSYBOX_SHA256=b8cc24c9574d809e7279c3be349795c5d5ceb6fdf19ca709f80cde50e47de314
RUN apk add --no-cache build-base linux-headers perl
WORKDIR /src
RUN wget -q https://busybox.net/downloads/busybox-$BUSYBOX.tar.bz2 \
 && echo "$BUSYBOX_SHA256  busybox-$BUSYBOX.tar.bz2" | sha256sum -c - \
 && tar xjf busybox-$BUSYBOX.tar.bz2 --strip-components=1
# allnoconfig still picks ash as sh: set it to none, which halves the binary. And httpd's gzip: a browser that accepts it
# gets a file's pre-compressed copy, file.gz, when there is one
RUN make allnoconfig >/dev/null \
 && sed -i -e 's/^# CONFIG_STATIC is not set/CONFIG_STATIC=y/' -e 's/^# CONFIG_HTTPD is not set/CONFIG_HTTPD=y/' \
      -e 's/^# CONFIG_FEATURE_HTTPD_GZIP is not set/CONFIG_FEATURE_HTTPD_GZIP=y/' \
      -e 's/^CONFIG_SH_IS_ASH=y/# CONFIG_SH_IS_ASH is not set/' -e 's/^# CONFIG_SH_IS_NONE is not set/CONFIG_SH_IS_NONE=y/' \
      -e 's/^CONFIG_SHELL_ASH=y/# CONFIG_SHELL_ASH is not set/' .config \
 && yes '' | make oldconfig >/dev/null \
 && make -j"$(nproc)" >/dev/null \
 && strip busybox

# the page and its assets, each text file with a copy compressed once, at gzip's best
FROM alpine:3.24 AS page
COPY . /www
RUN find /www -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' \) \
      -exec sh -c 'gzip -9 -c "$1" > "$1.gz"' _ {} \;

FROM scratch
# busybox runs the applet it's called by, so /httpd is httpd
COPY --from=httpd /src/busybox /httpd
COPY --from=page /www /www
USER 65534
EXPOSE 8080
ENTRYPOINT ["/httpd", "-f", "-v", "-p", "8080", "-h", "/www"]
