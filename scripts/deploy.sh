#!/bin/bash
# Script to deploy the application to the staging environment
set -e  # Exit immediately if a command exits with a non-zero status
# Check if required parameters are provided
if [ $# -lt 5 ]; then
    echo "Usage: $0 <artifact-full-name> <environment> <host> <user> <port>"
    echo "Example: $0 ghcr.io/user/app:v1 staging staging.example.com deploy-user 5000"
    exit 1
fi
ARTIFACT_FULL=$1
ENVIRONMENT=$2
ENVIRONMENT_HOST=$3
ENVIRONMENT_USER=$4
PORT_NUMBER=$5
# Log deployment information
echo "======================================================"
echo "🚀 Starting deployment of $ARTIFACT_FULL to $ENVIRONMENT environment"
echo "======================================================"
echo "📋 Deployment details:"
echo "   - Environment: $ENVIRONMENT"
echo "   - Host: $ENVIRONMENT_HOST"
echo "   - User: $ENVIRONMENT_USER"
echo "   - Port: $PORT_NUMBER"
echo "   - Artifact: $ARTIFACT_FULL"
echo "======================================================"
# Extract container name from artifact
CONTAINER_NAME=$(echo "$ARTIFACT_FULL" | cut -d '/' -f 3 | cut -d ':' -f 1)
# Deploy to the environment
echo "🔄 Connecting to $ENVIRONMENT_HOST..."
# Check if SSH connection is successful
if ! ssh -q "$ENVIRONMENT_USER@$ENVIRONMENT_HOST" exit; then
    echo "❌ Failed to connect to $ENVIRONMENT_HOST. Check your SSH configuration."
    exit 1
fi
# Execute deployment commands
echo "⏳ Deploying application..."
ssh "$ENVIRONMENT_USER@$ENVIRONMENT_HOST" << EOF
    set -e
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed on the server."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo "❌ Docker daemon is not running or current user doesn't have permission."
        exit 1
    fi
    
    # Pull the Docker image
    echo "📥 Pulling image: $ARTIFACT_FULL"
    docker pull $ARTIFACT_FULL
    
    # Stop and remove existing container if it exists
    echo "🧹 Cleaning up existing container if present..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # Run the new container
    echo "🏃 Starting new container..."
    docker run -d --restart unless-stopped --name $CONTAINER_NAME \
        -p $PORT_NUMBER:$PORT_NUMBER \
        -e NODE_ENV=$ENVIRONMENT \
        $ARTIFACT_FULL
    
    # Verify container is running
    if [ \$(docker ps -q -f name=$CONTAINER_NAME | wc -l) -eq 0 ]; then
        echo "❌ Container failed to start. Check logs with: docker logs $CONTAINER_NAME"
        exit 1
    fi
    
    echo "✅ Container started successfully!"
EOF
# Check if the application is running properly after deployment
echo "🔍 Performing post-deployment health check..."
MAX_RETRIES=5
RETRY_INTERVAL=10
HEALTH_CHECK_URL="http://${ENVIRONMENT_HOST}:${PORT_NUMBER}/health"
for i in $(seq 1 $MAX_RETRIES); do
  echo "  Health check attempt $i of $MAX_RETRIES..."
  if curl -s -f -o /dev/null "${HEALTH_CHECK_URL}"; then
    echo "✅ Application deployed successfully and health check passed!"
    
    echo "======================================================"
    echo "📦 DEPLOYMENT SUMMARY"
    echo "======================================================"
    echo "📋 Application: $CONTAINER_NAME"
    echo "🏷️ Version: $(echo "$ARTIFACT_FULL" | cut -d ':' -f 2)"
    echo "🌍 Environment: $ENVIRONMENT"
    echo "🕒 Timestamp: $(date)"
    echo "📡 Application URL: http://${ENVIRONMENT_HOST}:${PORT_NUMBER}"
    echo "🔍 Health check endpoint: ${HEALTH_CHECK_URL}"
    echo "======================================================"
    echo "✅ Deployment completed successfully."
    
    exit 0
  else
    echo "  Health check failed, retrying in ${RETRY_INTERVAL} seconds..."
    sleep ${RETRY_INTERVAL}
  fi
done
echo "⚠️ WARNING: Deployment completed but health check failed after ${MAX_RETRIES} attempts."
echo "Please check the application logs for issues:"
echo "  ssh ${ENVIRONMENT_USER}@${ENVIRONMENT_HOST} \"docker logs ${CONTAINER_NAME}\""
exit 1
