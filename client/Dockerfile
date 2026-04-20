FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Optional build-time envs for Vite
ARG VITE_API_BASE
ARG VITE_SITE_URL
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_SITE_URL=${VITE_SITE_URL}

RUN npm run build

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
