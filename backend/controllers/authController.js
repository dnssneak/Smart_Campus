const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, department, phone } = req.body;
        
        // Validate university email
        if (!email.endsWith('@university.edu')) {
            return res.status(400).json({ message: 'Please use a valid university email (@university.edu)' });
        }

        // Validate required fields
        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'First name and last name are required' });
        }

        // Validate role
        const validRoles = ['student', 'faculty', 'admin', 'staff'];
        const userRole = role || 'student';
        if (!validRoles.includes(userRole)) {
            return res.status(400).json({ message: 'Invalid role. Must be one of: student, faculty, admin, staff' });
        }

        // Step 1: Create user with admin API (bypasses email confirmation and trigger issues)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) {
            console.error('Auth error:', authError);
            return res.status(400).json({ message: authError.message || 'Failed to create user account' });
        }

        if (!authData || !authData.user) {
            return res.status(400).json({ message: 'Failed to create user account' });
        }

        // Step 2: Manually create profile (bypassing trigger)
        // First, check if profile already exists (in case trigger ran)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authData.user.id)
            .single();

        let profile;
        if (existingProfile) {
            // Update existing profile
            const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    role: userRole,
                    department: department || null,
                    phone: phone || null
                })
                .eq('id', authData.user.id)
                .select()
                .single();

            if (updateError) {
                console.error('Profile update error:', updateError);
                await supabase.auth.admin.deleteUser(authData.user.id);
                return res.status(400).json({ message: `Failed to update profile: ${updateError.message}` });
            }
            profile = updatedProfile;
        } else {
            // Create new profile
            const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    first_name: firstName,
                    last_name: lastName,
                    role: userRole,
                    department: department || null,
                    phone: phone || null
                })
                .select()
                .single();

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Rollback: delete auth user
                await supabase.auth.admin.deleteUser(authData.user.id);
                return res.status(400).json({ message: `Failed to create profile: ${profileError.message}` });
            }
            profile = newProfile;
        }

        // Generate JWT
        const token = jwt.sign(
            { id: authData.user.id, email: authData.user.email, role: profile.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                firstName: profile.first_name,
                lastName: profile.last_name,
                role: profile.role,
                department: profile.department
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError || !authData.user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Get profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            return res.status(400).json({ message: 'Profile not found' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: authData.user.id, email: authData.user.email, role: profile.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                firstName: profile.first_name,
                lastName: profile.last_name,
                role: profile.role,
                department: profile.department
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        res.json({
            id: req.user.id,
            email: req.user.email,
            ...profile
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};