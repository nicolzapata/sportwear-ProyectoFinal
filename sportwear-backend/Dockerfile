# sportwear-backend — API REST (Node.js + Express + PostgreSQL)

FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY . .
USER app

EXPOSE 4000
ENV PORT=4000

CMD ["node", "src/index.js"]
