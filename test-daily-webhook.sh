#!/bin/bash

# Test script for Daily.co webhook endpoint
# This simulates webhook events from Daily.co

echo "Testing Daily.co Webhook Endpoint..."
echo "======================================"
echo ""

# Test 1: Participant Joined Event
echo "Test 1: Participant Joined Event"
echo "---------------------------------"
curl -X POST http://localhost:3001/api/webhooks/daily \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0.0",
    "type": "participant.joined",
    "event_ts": '$(date +%s)',
    "payload": {
      "joined_at": '$(date +%s)',
      "session_id": "test-session-123",
      "room": "test-room",
      "user_id": "user-456",
      "user_name": "John Doe",
      "owner": false,
      "networkQualityState": "good"
    }
  }'

echo -e "\n\n"

# Test 2: Meeting Ended Event
echo "Test 2: Meeting Ended Event"
echo "----------------------------"
curl -X POST http://localhost:3001/api/webhooks/daily \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0.0",
    "type": "meeting.ended",
    "event_ts": '$(date +%s)',
    "payload": {
      "room": "test-room",
      "ended_at": '$(date +%s)',
      "duration": 1800
    }
  }'

echo -e "\n\n"

# Test 3: GET Request (Verification)
echo "Test 3: Webhook Endpoint Verification (GET)"
echo "-------------------------------------------"
curl -X GET http://localhost:3001/api/webhooks/daily

echo -e "\n\n======================================"
echo "Tests completed!"
echo "Check the admin dashboard for notifications"
