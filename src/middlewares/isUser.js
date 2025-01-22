// function isAdminOrUser(req, res, next) {
//
//
//     if (req.user?.role === 'admin' || req.user?.role === 'user') {
//         return next();
//     }
//     return res.status(403).json({ message: 'Access denied.' });
// }
//
// module.exports = isAdminOrUser;

const isUser = (req, res, next) => {
    if (req.user?.role === 'user') {
        return next();
    }
    return res.status(403).json({ message: 'Access denied.' });
};

module.exports = isUser;
