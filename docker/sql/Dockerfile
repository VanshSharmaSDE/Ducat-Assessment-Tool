# CodeAssess - SQL (SQLite3) sandbox image
# Build: docker build -t codeassess-sql docker/sql
# Runs as a long-lived, network-less worker container; code is executed via `docker exec`.
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 procps \
    && rm -rf /var/lib/apt/lists/* /tmp/*

RUN groupadd -g 10001 sandbox \
    && useradd -u 10001 -g sandbox -M -s /usr/sbin/nologin sandbox \
    && mkdir -p /sandbox && chown sandbox:sandbox /sandbox

WORKDIR /sandbox
USER sandbox

CMD ["sleep", "infinity"]
