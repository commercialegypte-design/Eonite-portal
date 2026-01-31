#!/bin/bash

echo "🚀 Setting up Daily.co Notifications"
echo "====================================="
echo ""

echo "Step 1: Applying database migration..."
echo "---------------------------------------"

# Check if the migration file exists
if [ ! -f "supabase/migrations/021_daily_notifications.sql" ]; then
    echo "❌ Error: Migration file not found!"
    echo "   Expected: supabase/migrations/021_daily_notifications.sql"
    exit 1
fi

echo "✅ Migration file found"
echo ""
echo "📋 Migration Instructions:"
echo ""
echo "Option 1: Using Supabase Dashboard (Recommended)"
echo "-------------------------------------------------"
echo "1. Go to: https://fbirnmmevnwzycngsqdm.supabase.co/project/fbirnmmevnwzycngsqdm/sql/new"
echo "2. Open file: supabase/migrations/021_daily_notifications.sql"
echo "3. Copy the entire contents"
echo "4. Paste into the SQL Editor"
echo "5. Click 'Run' button"
echo ""
echo "Option 2: Using Supabase CLI (if installed)"
echo "-------------------------------------------"
echo "Run: supabase db push"
echo ""
echo ""
echo "After applying the migration, you can test the webhook:"
echo "-------------------------------------------------------"
echo "./test-daily-webhook.sh"
echo ""
echo "Or manually visit your admin dashboard at:"
echo "http://localhost:3001/admin/dashboard"
echo ""
echo "====================================="
echo "Setup completed! ✨"
