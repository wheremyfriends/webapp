FROM node:22-alpine3.20 as pnpm

WORKDIR /app
RUN npm install -g pnpm \
    && npm cache clean --force

FROM pnpm as deps

COPY package.json pnpm-lock.yaml .
RUN pnpm install

COPY tsconfig.json .
COPY prisma ./prisma
COPY src ./src
RUN pnpx prisma generate && pnpm run build

FROM pnpm

WORKDIR /app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY package.json pnpm-lock.yaml .
RUN chmod a+x /usr/local/bin/docker-entrypoint.sh \
    && pnpm install --prod --frozen-lockfile

COPY prisma ./prisma
RUN pnpx prisma generate

COPY --from=deps /app/dist .

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "index.js"]
