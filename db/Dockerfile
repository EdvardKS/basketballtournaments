FROM postgres:16-alpine

ENV LANG=en_US.utf8
HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD pg_isready -U postgres -d basket || exit 1
