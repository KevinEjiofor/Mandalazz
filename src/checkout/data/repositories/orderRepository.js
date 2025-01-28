// const Checkout = require('../models/checkoutModel');
//
// async function findOne(reference) {
//     try {
//         const checkout = await Checkout.findOne(
//             { paymentReference: reference },
//             null,
//             { sort: { createdAt: -1 } }
//         );
//         if (!checkout) {
//             console.log('Checkout not found');
//             return null;
//         }
//         console.log('Checkout found with options:', checkout);
//         return checkout;
//     } catch (error) {
//         console.error('Error finding checkout:', error.message);
//         throw error;
//     }
// }

//
// async function cleanUpCheckouts() {
//     await Checkout.deleteMany({ serialCode: null });
//     console.log('Removed all documents with null serialCode');
// }
//
// cleanUpCheckouts();

