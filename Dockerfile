# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist

# Expose port (default for Angular SSR is 4000)
EXPOSE 4000

# Start server
CMD ["node", "dist/bluejournal/server/server.mjs"]
