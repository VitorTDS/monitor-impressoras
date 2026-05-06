FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend ./
COPY frontend /app/frontend

RUN mkdir -p /data && chown node:node /data

ENV DATABASE_PATH=/data/banco.db
ENV PORT=3000

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ > /dev/null || exit 1

CMD ["node", "server.js"]
