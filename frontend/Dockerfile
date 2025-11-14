FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY tsconfig.json vite.config.ts ./
COPY index.html ./
COPY src ./src

RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
RUN npm install serve
EXPOSE 5173
CMD ["npx", "serve", "dist", "-l", "5173"]
