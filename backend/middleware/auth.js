const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { data: user, error } = await supabase.auth.admin.getUserById(decoded.id);
        
        if (error || !user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', decoded.id)
            .single();

        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: profile?.role || 'student',
            ...profile
        };
        
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = auth;