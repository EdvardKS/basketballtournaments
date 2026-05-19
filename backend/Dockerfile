FROM node:20-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000
CMD ["pnpm", "dev"]
