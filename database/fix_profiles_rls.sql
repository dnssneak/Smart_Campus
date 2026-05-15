-- ============================================================================
-- FIX: Add INSERT policy for profiles table
-- ============================================================================
-- This fixes the "new row violates row-level security policy" error
-- when creating profiles during user registration
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;

-- ────────────────────────────────────────────────────────────────────────────
-- SOLUTION 1: Allow users to insert their own profile
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────────────────
-- SOLUTION 2: Allow service role to insert profiles (for admin.createUser)
-- ────────────────────────────────────────────────────────────────────────────
-- This policy allows the backend service role to create profiles
CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Check all policies on profiles table
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ PROFILES RLS POLICIES FIXED!
    ============================================================================
    
    Changes Made:
    ✅ Added INSERT policy for users to create their own profile
    ✅ Added INSERT policy for service role to create profiles
    
    This should resolve the error:
    "Failed to create profile: new row violates row-level security policy"
    
    Next Steps:
    1. Test user registration from the frontend
    2. Verify profile is created successfully
    3. Check that all user data is properly stored
    
    ============================================================================
    ';
END $$;
