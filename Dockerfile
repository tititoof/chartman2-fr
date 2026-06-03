FROM node:lts-slim

ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="/home/node/.local/share/pnpm:$PATH"

RUN npm install -g pnpm@latest

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN chown -Rf node:node /app

USER node

RUN pnpm config set store-dir /home/node/.local/share/pnpm/store/v3 --global \
    && pnpm install

ENV PATH="./node_modules/.bin/:$PATH"