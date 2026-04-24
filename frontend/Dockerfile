FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY astro.config.mjs tsconfig.json ./
COPY src ./src
COPY public ./public

EXPOSE 4321
CMD ["npm", "run", "dev"]
