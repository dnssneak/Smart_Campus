-- ============================================================================
-- FIX: Drop the problematic trigger that's causing registration failures
-- ============================================================================
-- This trigger is causing "Database error creating new user" because it's
-- trying to automatically create profiles but failing due to type casting issues
-- We'll handle profile creation manually in the backend instead
-- ============================================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function (optional, but recommended to clean up)
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- 5. The trigger will be removed and registration should work
-- ============================================================================
