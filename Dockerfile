FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data DEMO_MODE=false
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir /app/data && chown node:node /app/data
COPY --from=build /app/dist ./dist
COPY server.mjs ./
COPY src/model.mjs ./src/model.mjs
COPY deploy/account-admin.mjs ./deploy/account-admin.mjs
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
