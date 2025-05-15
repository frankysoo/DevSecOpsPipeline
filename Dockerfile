# Use specific version for security and reproducibility
FROM node:18.17.1-alpine3.18
# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001
# Create app directory
WORKDIR /app
# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
# Copy app source
COPY . .
# Create non-root user for security
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
# Switch to non-root user
USER appuser
# Expose the port the app runs on
EXPOSE ${PORT}
# Health check to verify app is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:${PORT}/health || exit 1
# Set NODE_OPTIONS to optimize for containerized environments
ENV NODE_OPTIONS="--max-old-space-size=512"
# Command to run the application
CMD ["node", "src/server.js"]
