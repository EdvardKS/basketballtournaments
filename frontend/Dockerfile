FROM node:20-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY astro.config.mjs tsconfig.json ./
COPY src ./src
COPY public ./public
COPY photos ./photos

EXPOSE 4321
CMD ["pnpm", "dev"]
