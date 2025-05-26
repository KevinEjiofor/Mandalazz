const authMiddleware = require("../middlewares/authMiddleware");
const guestMiddleware = require("../middlewares/guestMiddleware");


const optionalAuthMiddleware = (req, res, next) => {
    if (req.headers.authorization) {
        return authMiddleware(req, res, next);
    }
    guestMiddleware(req, res, next);
};

module.exports = optionalAuthMiddleware