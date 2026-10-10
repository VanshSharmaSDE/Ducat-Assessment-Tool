# CodeAssess - JavaScript (Node.js 20) sandbox image
# Build: docker build -t codeassess-js docker/javascript
# Runs as a long-lived, network-less worker container; code is executed via `docker exec`.
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/* /tmp/*

# The base image ships a "node" user with uid 1000; add the shared sandbox uid
RUN groupadd -g 10001 sandbox \
    && useradd -u 10001 -g sandbox -M -s /usr/sbin/nologin sandbox \
    && mkdir -p /sandbox && chown sandbox:sandbox /sandbox

WORKDIR /sandbox
USER sandbox

CMD ["sleep", "infinity"]
