# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy static assets (images, icons, styles) from builder stage
# (Vite copies public/ to dist/ but subdirectories can be missed in some builds)
COPY --from=builder /app/public /usr/share/nginx/html

EXPOSE 8080

# Run as non-root user (UID 1000)
RUN chown -R 1000:1000 /usr/share/nginx/html && \
    chown -R 1000:1000 /var/cache/nginx && \
    chown -R 1000:1000 /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R 1000:1000 /var/run/nginx.pid

USER 1000

CMD ["nginx", "-g", "daemon off;"]
