# Deployment Checklist for Vercel

## Environment Variables Required

Set these in your Vercel project settings:

### Database Configuration
- `DB_HOST` - Your PostgreSQL database host
- `DB_PORT` - Database port (usually 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

### Authentication
- `ADMIN_USER` - Super admin username
- `ADMIN_PASSWORD` - Super admin password

### Optional
- `AUTH_SECRET` - For session encryption (generate a secure random string)

## Database Setup

1. **Run migrations in order:**
   ```sql
   -- 1. Create journeys table (if not exists)
   migrations/create_journeys_table.sql
   
   -- 2. Create client_metrics table
   migrations/create_client_metrics_table.sql
   
   -- 3. Add calculated metrics support
   migrations/add_calculated_metrics.sql
   ```

2. **Verify database schema:**
   - `app.clients` table exists
   - `app.client_users` table exists
   - `app.message_logs` table exists
   - `app.journeys` table exists
   - `app.client_metrics` table exists with columns: `is_calculated`, `formula`, `prefix`, `unit`

## Pre-Deployment Checks

✅ **SSL Configuration**: Database SSL is now configured for production
✅ **Environment Variables**: All required env vars are documented
✅ **Error Handling**: API routes have proper try-catch blocks
✅ **Authentication**: Both admin and client user sessions are supported
✅ **Cookie Security**: Secure cookies enabled in production

## Post-Deployment

1. **Test Login:**
   - Super admin login at `/login`
   - Client user login at `/login` (unified login)

2. **Verify Features:**
   - Analytics dashboard loads
   - Journey builder works
   - Client settings accessible
   - Metrics configuration works

3. **Check Logs:**
   - Monitor Vercel function logs for any errors
   - Check database connection issues

## Known Issues

- Database SSL is set to `rejectUnauthorized: false` for production. If your database requires strict SSL, update `src/lib/db.ts`
- Image `/intellsys-logo.webp` should exist in `public/` directory

## Notes

- The application supports both super admin and client user authentication
- Client users are automatically redirected to their dashboard after login
- All API routes now support both admin and client user sessions


