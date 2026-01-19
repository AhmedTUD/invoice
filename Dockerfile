# Multi-stage build for React frontend
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS frontend

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy PWA files to correct location
COPY public/manifest.json /usr/share/nginx/html/
COPY public/sw.js /usr/share/nginx/html/
COPY public/icons/ /usr/share/nginx/html/icons/
COPY public/browserconfig.xml /usr/share/nginx/html/

# Create uploads directory for file storage
RUN mkdir -p /usr/share/nginx/html/uploads

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]