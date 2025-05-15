#!/bin/bash
# Script to send notifications about pipeline events
# Supports FR-MVP-07: Basic Pipeline Notifications

set -e  # Exit immediately if a command exits with a non-zero status

# Check if a message was provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <message>"
    exit 1
fi

MESSAGE=$1

echo "Sending notification: $MESSAGE"

# For demo purposes, we'll simulate sending a notification
echo "============================================================="
echo "📬 NOTIFICATION"
echo "============================================================="
echo "📝 Message: $MESSAGE"
echo "🕒 Timestamp: $(date)"
echo "🔄 Repository: ${GITHUB_REPOSITORY:-demo-repo}"
echo "🔖 Commit: ${GITHUB_SHA:-demo-commit}"
echo "🔗 Run URL: ${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-demo-repo}/actions/runs/${GITHUB_RUN_ID:-123456}"
echo "============================================================="

echo "Notification simulation completed successfully."
exit 0