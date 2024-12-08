const isAdmin = (req, res, next) => {


    if (req.user?.role !== 'admin') {
        console.log('Access denied. Role:', req.user?.role);
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    next();
};

module.exports = isAdmin;
