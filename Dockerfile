# ============================================
# Stage 1: Build
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts

COPY . .

# Values read by the browser are fixed when the image is built. The defaults
# suit a reverse proxy serving the application and the API on the same
# address, so the image does not depend on a domain name.
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_GRAPHQL_URL=/graphql
ARG NEXT_PUBLIC_BACKEND_URL=/
ARG NEXT_PUBLIC_DEMO_MODE=false
# Base map of the flight preparation; empty = OpenFreeMap (no key).
ARG NEXT_PUBLIC_MAP_STYLE_URL=
ARG NEXT_PUBLIC_MAP_STYLE_DARK_URL=
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID=

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE \
    NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL \
    NEXT_PUBLIC_MAP_STYLE_DARK_URL=$NEXT_PUBLIC_MAP_STYLE_DARK_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_PAYPAL_CLIENT_ID=$NEXT_PUBLIC_PAYPAL_CLIENT_ID

RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/system/notconnected || exit 1

CMD ["node", "server.js"]
