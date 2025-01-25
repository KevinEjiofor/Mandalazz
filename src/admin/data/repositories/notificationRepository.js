const Notification = require('../models/notificationModel');

await Notification.create({
    type: 'checkoutSuccess',
    message: 'A payment was successfully completed.',
    data: { checkoutId: checkout._id },
});
