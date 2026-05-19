FROM node:20-alpine

# Python + requests so the E2E test (test/full_flow.py) can run with
# `docker exec basket_backend python3 /app/test/full_flow.py`.
RUN apk add --no-cache python3 py3-requests \
  && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000
CMD ["pnpm", "dev"]
