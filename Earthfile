VERSION 0.8

FROM earthly/dind:alpine-3.19-docker-25.0.5-r0
WORKDIR /app

integration-test:
    COPY package.json pnpm-lock.yaml .
    RUN apk add --no-cache nodejs npm && npm install -g pnpm && pnpm install
    COPY .env.dev .env
    COPY . .
    WITH DOCKER --compose compose.yaml
        RUN (until pnpm push; do sleep 5; done) && pnpm generate && pnpm test
    END
