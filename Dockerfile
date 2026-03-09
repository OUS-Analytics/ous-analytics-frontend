FROM node:20-alpine AS deps

WORKDIR /app/app
COPY app/package.json app/package-lock.json ./
COPY app/scripts ./scripts
RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/app/node_modules ./app/node_modules
COPY app ./app

WORKDIR /app/app
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app/app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/app/package.json ./
COPY --from=builder /app/app/package-lock.json ./
COPY --from=builder /app/app/node_modules ./node_modules
COPY --from=builder /app/app/.next ./.next
COPY --from=builder /app/app/public ./public
COPY --from=builder /app/app/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-p", "3000"]
