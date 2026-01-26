# EONITE Client Portal - Complete Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Local Development](#local-development)
4. [VPS Deployment](#vps-deployment)
5. [Post-Deployment Configuration](#post-deployment)
6. [Testing](#testing)

---

## 🔧 Prerequisites

### Required Accounts
- ✅ Supabase account (free tier is sufficient to start)
- ✅ VPS with Ubuntu 22.04+ (minimum 1GB RAM)
- ✅ Domain name (optional but recommended)

### Required Software on VPS
```bash
- Node.js 18+ 
- npm or yarn
- Nginx
- PM2 (for process management)
- Git
```

---

## 🗄️ Supabase Setup

### Step 1: Create a new Supabase project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `eonite-portal`
   - Database Password: (save this securely)
   - Region: Choose closest to France (eu-west-2 or eu-central-1)
4. Wait 2-3 minutes for project creation

### Step 2: Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and paste content from `/supabase/migrations/001_initial_schema.sql`
4. Click **Run**
5. Repeat for files:
   - `002_rls_policies.sql`
   - `003_seed_data.sql`
   - `004_storage_setup.sql`

### Step 3: Create Storage Buckets

In Supabase Dashboard:
1. Go to **Storage** → **Create a new bucket**
2. Create these buckets:
   - `bat-files` (private)
   - `invoices` (private)
   - `delivery-notes` (private)
   - `client-logos` (private)
   - `product-images` (public)
   - `message-attachments` (private)

### Step 4: Get API Keys

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGc...
   service_role key: eyJhbGc... (keep this secret!)
   ```

### Step 5: Create First Admin User

1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Fill in:
   - Email: your-admin-email@eonite.fr
   - Password: (create a strong password)
   - Auto Confirm User: ✅ YES
4. Note the UUID of the created user
5. Go back to **SQL Editor** and run:
   ```sql
   UPDATE profiles 
   SET role = 'admin', 
       company_name = 'EONITE SARL',
       contact_name = 'Walid'
   WHERE id = 'YOUR_USER_UUID_HERE';
   ```

---

## 💻 Local Development

### Step 1: Clone and Setup

```bash
# If you don't have the code yet, create the project folder
mkdir eonite-portal
cd eonite-portal

# Copy all the files I created to this directory

# Install dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy the environment template
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
nano .env.local
```

Update these values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the login page!

### Step 4: Test Login

1. Use the admin credentials you created in Supabase
2. You should be redirected to the dashboard
3. If it works, you're ready for production deployment!

---

## 🚀 VPS Deployment

### Step 1: Prepare VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install Git
apt install git -y
```

### Step 2: Clone and Setup Application

```bash
# Create application directory
mkdir -p /var/www/eonite-portal
cd /var/www/eonite-portal

# Upload your code (you can use git, scp, or rsync)
# Example with scp from your local machine:
# scp -r /path/to/eonite-portal/* root@your-vps-ip:/var/www/eonite-portal/

# Install dependencies
npm install

# Create .env.local file
nano .env.local
```

Add your production environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 3: Build Application

```bash
# Build for production
npm run build

# Test the build
npm run start
# Press Ctrl+C after verifying it works
```

### Step 4: Setup PM2 Process Manager

```bash
# Start with PM2
pm2 start npm --name "eonite-portal" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the instructions PM2 gives you

# Verify it's running
pm2 status
```

### Step 5: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/eonite-portal
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/eonite-portal /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 6: Setup SSL with Let's Encrypt (HTTPS)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)

# Test auto-renewal
certbot renew --dry-run
```

### Step 7: Configure Firewall

```bash
# Allow SSH (if not already allowed)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

---

## 🔧 Post-Deployment Configuration

### Monitor Application

```bash
# View logs
pm2 logs eonite-portal

# Monitor resources
pm2 monit

# Restart application
pm2 restart eonite-portal

# Stop application
pm2 stop eonite-portal
```

### Update Application

```bash
cd /var/www/eonite-portal

# Pull latest changes (if using git)
git pull

# Or re-upload files via scp

# Rebuild
npm install
npm run build

# Restart
pm2 restart eonite-portal
```

### Backup Database

Supabase automatically backs up your database, but you can also:

1. Go to Supabase Dashboard → **Database** → **Backups**
2. Create manual backup before major changes
3. Download backups to your local machine regularly

---

## 🧪 Testing

### Test the following features:

#### Authentication
- [ ] Register new client account
- [ ] Login with client account
- [ ] Login with admin account
- [ ] Logout

#### Client Portal
- [ ] View dashboard
- [ ] View products
- [ ] View catalog
- [ ] Create quote
- [ ] View messages
- [ ] View documents
- [ ] Update settings

#### Admin Panel
- [ ] View all clients
- [ ] Manage orders
- [ ] Update inventory
- [ ] Reply to messages
- [ ] Add products

---

## 📊 Performance Optimization

### Enable Caching in Nginx

Edit `/etc/nginx/sites-available/eonite-portal`:

```nginx
# Add inside the server block
location /_next/static/ {
    alias /var/www/eonite-portal/.next/static/;
    expires 365d;
    access_log off;
}

location /images/ {
    expires 30d;
    access_log off;
}
```

### Database Indexes

Already included in the migration files, but verify in Supabase:
- Go to **Database** → **Indexes**
- Ensure all indexes are created

---

## 🐛 Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs eonite-portal

# Check if port 3000 is in use
netstat -tulpn | grep 3000

# Restart
pm2 restart eonite-portal
```

### Nginx errors
```bash
# Check Nginx logs
tail -f /var/log/nginx/error.log

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Database connection issues
- Verify Supabase credentials in `.env.local`
- Check Supabase project status in dashboard
- Ensure RLS policies are correctly set

### Can't login
- Verify user exists in Supabase Authentication
- Check profile has correct role in profiles table
- Clear browser cache and cookies

---

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs eonite-portal`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Verify Supabase connection in dashboard
4. Check browser console for errors (F12)

---

## 🎉 Congratulations!

Your EONITE Client Portal is now live! 

Next steps:
1. Create test client accounts
2. Add real products
3. Configure email notifications (optional)
4. Setup automated backups
5. Add monitoring (optional: UptimeRobot, etc.)

