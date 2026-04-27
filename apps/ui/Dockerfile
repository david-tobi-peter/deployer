# Build stage: compile Vite app to static files
FROM node:22-slim AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Output stage: copy dist to a shared volume
FROM alpine:3.20

COPY --from=build /app/dist /output

CMD ["cp", "-r", "/output/.", "/srv/ui"]
