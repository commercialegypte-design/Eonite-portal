# Daily.co Notifications - Quick Start Guide

## 🎯 What You Get

✅ Real-time notifications when participants join Daily.co rooms  
✅ Notifications when calls end  
✅ Sound alerts for each event type  
✅ Notification center in admin dashboard  
✅ Persistent notification history  

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Apply Database Migration

You need to create the `daily_notifications` table in your Supabase database.

**Option A: Supabase Dashboard (Easiest)**

1. Open your Supabase SQL Editor:
   ```
   https://fbirnmmevnwzycngsqdm.supabase.co/project/fbirnmmevnwzycngsqdm/sql/new
   ```

2. Open the migration file:
   ```
   supabase/migrations/021_daily_notifications.sql
   ```

3. Copy all the contents and paste into SQL Editor

4. Click the **"RUN"** button

5. You should see: ✅ Success (no errors)

**Option B: Supabase CLI (If you have it installed)**

```bash
supabase db push
```

---

### Step 2: Configure Daily.co Webhook

1. Go to your Daily.co Dashboard → **Developers** → **Webhooks**

2. Click **"Create webhook"**

3. Fill in the form:
   - **URL**: 
     - For testing: Use ngrok URL (see below)
     - For production: `https://your-domain.com/api/webhooks/daily`
   
   - **Event Types** (Select both):
     - ✅ `participant.joined`
     - ✅ `meeting.ended`

4. Click **Save**

---

### Step 3: Test It!

**For Local Testing:**

1. Expose your localhost using ngrok:
   ```bash
   ngrok http 3001
   ```

2. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

3. Update your Daily.co webhook URL to:
   ```
   https://abc123.ngrok.io/api/webhooks/daily
   ```

4. Create a Daily.co room and join it

5. Check your admin dashboard at:
   ```
   http://localhost:3001/admin/dashboard
   ```

**Quick Local Test (Without ngrok):**

Run the test script to simulate webhook events:

```bash
./test-daily-webhook.sh
```

Then check the admin dashboard for notifications!

---

## 📍 Where to Find Notifications

1. **Admin Dashboard**: 
   - Visit: `http://localhost:3001/admin/dashboard`
   - Look for the bell icon (🔔) in the top-right header
   - Badge shows unread count
   - Click to open notification center

2. **Toast Notifications**:
   - Pop-ups appear automatically when events occur
   - Auto-dismiss after 5 seconds
   - Different colors for join/leave events

3. **Sound Alerts**:
   - Join sound plays when participant joins
   - End sound plays when call ends
   - Volume set to 60% (non-intrusive)

---

## 🧪 Testing Checklist

After setup, verify these work:

- [ ] Migration applied successfully (no SQL errors)
- [ ] Webhook endpoint responds: `curl http://localhost:3001/api/webhooks/daily`
- [ ] Test script runs: `./test-daily-webhook.sh`
- [ ] Notifications appear in admin dashboard
- [ ] Bell icon shows badge count
- [ ] Toast notifications slide in
- [ ] Sound plays (check browser volume)
- [ ] Can mark notifications as read
- [ ] "Mark all read" button works

---

## 🎨 Customization

### Change Notification Sounds

Replace these files with your own audio:
```
public/sounds/notification-join.mp3
public/sounds/notification-end.mp3
```

Supported formats: MP3, WAV, OGG

### Adjust Toast Duration

Edit `components/DailyNotifications.tsx` line 145:
```typescript
setTimeout(() => {
  // Change 5000 to your preferred milliseconds
}, 5000)
```

---

## 🐛 Troubleshooting

### "Table not found" Error

**Problem**: Database migration not applied  
**Solution**: Follow Step 1 above to apply migration

### Notifications Not Appearing

**Checklist**:
1. ✅ Is dev server running? (`npm run dev`)
2. ✅ Is migration applied? (Check Supabase table editor)
3. ✅ Is webhook configured? (Check Daily.co dashboard)
4. ✅ Is webhook URL correct? (Should be accessible)

### Sound Not Playing

**Possible causes**:
- Browser blocked autoplay (check console)
- Volume muted
- Sound files missing

**Fix**: Check browser console for errors

### Real-time Not Working

**Checklist**:
1. ✅ Supabase Realtime enabled? (Should be by default)
2. ✅ RLS policies correct? (Applied via migration)
3. ✅ Browser console errors? (Check for subscription issues)

---

## 📚 Additional Resources

- **Full Walkthrough**: See `walkthrough.md` in artifacts
- **Implementation Plan**: See `implementation_plan.md` in artifacts  
- **Environment Setup**: See `DAILY_ENV_SETUP.md`
- **Daily.co Docs**: https://docs.daily.co/reference/rest-api/webhooks

---

## 🚢 Production Deployment

Before deploying:

1. ✅ Apply migration to production database
2. ✅ Add `DAILY_API_KEY` to production environment variables
3. ✅ Update Daily.co webhook URL to production domain
4. ✅ Test with a real Daily.co room
5. ✅ Verify HTTPS is enabled (required by Daily.co)

---

## 💡 Pro Tips

- **Test First**: Always test in development before production
- **Ngrok Sessions**: Free ngrok URLs change on restart
- **Webhook Logs**: Check Daily.co dashboard for delivery logs
- **Database**: Keep notifications table clean (auto-cleanup policy possible)
- **Monitoring**: Set up error monitoring for webhook endpoint

---

## ✅ You're All Set!

Your Daily.co notification system is ready! 🎉

Next steps:
1. Apply the database migration
2. Configure the Daily.co webhook  
3. Test with a real room
4. Enjoy real-time notifications!

For questions or issues, check the troubleshooting section above or review the full walkthrough documentation.
