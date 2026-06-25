FROM node:25-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web-client/package.json apps/web-client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY . .

FROM base AS development
EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "@loopad/web-client"]

FROM base AS build
RUN npm run build -w @loopad/shared && npm run build -w @loopad/web-client

FROM nginx:1.29-alpine AS production
COPY --from=build /app/apps/web-client/dist /usr/share/nginx/html
EXPOSE 80
