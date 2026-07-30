# Stage 1: Build React/Vite app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve compiled build via Nginx server
FROM nginx:1.25.0-alpine

# Set up custom Nginx config listening on port 8080 (High ports allow non-root binding)
RUN echo 'server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# Grant path ownership permissions to default nginx user
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
