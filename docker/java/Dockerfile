# CodeAssess - Java 17 sandbox image
# Build: docker build -t codeassess-java docker/java
# Runs as a long-lived, network-less worker container; code is executed via `docker exec`.
FROM eclipse-temurin:17-jdk-jammy

RUN apt-get update && apt-get install -y --no-install-recommends procps coreutils \
    && rm -rf /var/lib/apt/lists/* /tmp/*

# Unprivileged user that runs all untrusted code
RUN groupadd -g 10001 sandbox \
    && useradd -u 10001 -g sandbox -M -s /usr/sbin/nologin sandbox \
    && mkdir -p /sandbox && chown sandbox:sandbox /sandbox

WORKDIR /sandbox
USER sandbox

# Keep the container alive; submissions are run with `docker exec`
CMD ["sleep", "infinity"]
