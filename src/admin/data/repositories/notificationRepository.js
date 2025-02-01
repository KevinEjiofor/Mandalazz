const { getIO } = require('../../../utils/socketHandler');

getIO().emit('adminNotification', {
    type: 'newCheckout',
    message: `A new checkout has been created by user ${userId}`,
    data: newCheckout,

});
