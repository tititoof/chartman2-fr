FROM node:lts-alpine

RUN npm install -g pnpm@8.15.4

WORKDIR /app

RUN apk --no-cache add git \
    && rm -rf /var/cache/apk/*

# COPY ./package*.json /app/

COPY . .

RUN chown -Rf node:node /app

USER node

RUN pnpm config set store-dir /home/node/.local/share/pnpm/store/v3 --global \
    && pnpm install

ENV PATH ./node_modules/.bin/:$PATH

# ENTRYPOINT ["/bin/sh"]
