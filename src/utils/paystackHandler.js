const axios = require('axios');

const initializePayment = async (email, amount) => {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        { email, amount: amount * 100 }, // Convert amount to kobo
        {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        }
    );

    return response.data;
};
const verifyPayment = async (reference) => {
    try {
        const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
};

module.exports = {
    initializePayment,
    verifyPayment,
};
