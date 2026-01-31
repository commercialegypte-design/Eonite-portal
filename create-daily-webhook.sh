#!/bin/bash

# Script to create a Daily.co webhook via API
# Useful when the Webhook UI is missing or for automation

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
else
  echo "❌ Error: .env.local file not found"
  exit 1
fi

if [ -z "$DAILY_API_KEY" ]; then
  echo "❌ Error: DAILY_API_KEY not set in .env.local"
  exit 1
fi

echo "🚀 Creating Daily.co Webhook via API"
echo "====================================="
echo ""

# Ask for the Webhook URL
echo "Please enter your Webhook URL (e.g., https://your-ngrok-url.ngrok-free.app/api/webhooks/daily):"
read -r WEBHOOK_URL

if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Error: Webhook URL is required"
  exit 1
fi

echo ""
echo "Creating webhook..."
echo "URL: $WEBHOOK_URL"
echo "Events: participant.joined, meeting.ended"
echo ""

# Create the webhook
RESPONSE=$(curl -s -X POST "https://api.daily.co/v1/webhooks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DAILY_API_KEY" \
  -d '{
    "url": "'"$WEBHOOK_URL"'",
    "eventTypes": ["participant.joined", "meeting.ended"]
  }')

# Check for success
if echo "$RESPONSE" | grep -q '"id"'; then
  echo "✅ Webhook created successfully!"
  echo "Response:"
  echo "$RESPONSE"
else
  echo "❌ Error creating webhook:"
  echo "$RESPONSE"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check if your API key is correct"
  echo "2. Ensure you have added a credit card to your Daily.co account (required for webhooks)"
fi
