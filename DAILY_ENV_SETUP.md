# Environment Variables - Daily.co Integration

This document describes the environment variables required for the Daily.co webhook integration.

## Daily.co Configuration

### DAILY_API_KEY (Required)

Your Daily.co API key for authenticating webhook requests.

**Current Value:** `85249ba8034035bda463aa50030ea6ff4706598dea86685593bcaf76b1e766d7`

**How to Get:**
1. Log in to your Daily.co dashboard
2. Navigate to **Developers** → **API Keys**
3. Copy your API key

**Usage:**
- Used by the webhook endpoint to verify requests
- Currently stored in `.env.local`
- Never commit this value to version control

### DAILY_WEBHOOK_SECRET (Optional)

A secret key for verifying webhook signatures from Daily.co.

**Current Value:** Not set

**How to Configure:**
1. Generate a secure random string (e.g., using `openssl rand -hex 32`)
2. Add to Daily.co webhook configuration
3. Add to your `.env.local` file

**Usage:**
- Enhances security by verifying webhook authenticity
- Prevents unauthorized webhook requests
- Implementation can be added to the webhook endpoint

## Existing Environment Variables

Your project already has these configured:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (secret, server-side only)
- `NEXT_PUBLIC_APP_URL` - Your application URL

## Security Best Practices

### ✅ Do's

- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use different API keys for development and production
- ✅ Regularly rotate API keys
- ✅ Use environment variables for all sensitive data
- ✅ Document all environment variables

### ❌ Don'ts

- ❌ Never commit `.env.local` to git
- ❌ Never expose API keys in client-side code
- ❌ Never share API keys in public channels
- ❌ Never hardcode sensitive values in code

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. **Add Environment Variables** to your hosting platform:
   - Go to your project settings
   - Add all variables from `.env.local`
   - Mark sensitive variables as "secret"

2. **Vercel Example:**
   ```bash
   vercel env add DAILY_API_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```

3. **Netlify Example:**
   - Dashboard → Site settings → Build & deploy → Environment
   - Add each variable with appropriate value

## Testing

To test with environment variables locally:

```bash
# Verify variables are loaded
node -e "console.log(process.env.DAILY_API_KEY)"

# Run development server
npm run dev
```

## Troubleshooting

### Variables Not Loading

1. **Check File Name**: Must be `.env.local` (not `.env`)
2. **Check Location**: Must be in project root directory
3. **Check Syntax**: Format should be `KEY=value` (no spaces around `=`)
4. **Restart Server**: Environment variables are loaded at startup

### Webhook Authentication Failing

1. **Verify API Key**: Check that `DAILY_API_KEY` matches your Daily.co dashboard
2. **Check Headers**: Ensure Daily.co is sending the API key in headers
3. **Check Logs**: Review server logs for authentication errors
