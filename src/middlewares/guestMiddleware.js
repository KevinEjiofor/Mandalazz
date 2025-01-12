const { v4: uuidv4 } = require('uuid'); // Import v4 and rename it to uuidv4

const guestMiddleware = (req, res, next) => {
    if (!req.session.guestId) {
        req.session.guestId = uuidv4();

    }
    req.guestId = req.session.guestId;

    next();
};
module.exports = guestMiddleware;
