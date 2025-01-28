const { io } = require('../../../utils/socketHandler');

io().emit('adminNotification', {
    type: 'newCheckout',
    message: `A new checkout has been created by user ${userId}`,
    data: newCheckout,
});
