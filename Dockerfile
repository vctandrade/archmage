FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install -y

COPY . ./
RUN npm run generate && npm run build

FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

ENV DATABASE_URL="postgresql://postgres:pass@localhost:5432/archmage"

CMD ["npm", "start"]
