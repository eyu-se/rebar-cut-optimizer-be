FROM node:20 as build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate

RUN mkdir -p /app/data && chown -R node:node /app/data
ENV NODE_ENV=production
ENV PORT=5000
# Store the SQLite database securely in a directory that will be mounted as a volume
ENV DATABASE_URL="file:/app/data/prod.db"

# Create a startup script to ensure database schema is pushed before starting
RUN echo '#!/bin/sh\n\n# Push db changes (safe for sqlite)\nnpx prisma db push --accept-data-loss\n\n# Start app\nnode dist/server.js' > /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 5000
CMD ["/app/start.sh"]
