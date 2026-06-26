FROM node:25-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api-server/package.json apps/api-server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY . .

FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev", "-w", "@loopad/api-server"]

FROM base AS build
RUN npm run build -w @loopad/shared && npm run build -w @loopad/api-server

FROM node:25-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api-server/package.json apps/api-server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev
COPY --from=build /app/apps/api-server/dist apps/api-server/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
EXPOSE 80
CMD ["npm", "run", "start", "-w", "@loopad/api-server"]
