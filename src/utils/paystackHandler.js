require('dotenv').config();
const axios = require('axios');

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const initializePayment = async (email, amount, options = {}) => {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new Error('Invalid email format.');
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new Error('Amount must be a positive number.');
    }

    try {
        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/transaction/initialize`,
            {
                email,
                amount: Math.round(amount * 100), // Convert amount to kobo
                reference: options.reference, // Explicitly use the reference passed
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error initializing payment:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Payment initialization failed.');
    }
};


const verifyPayment = async (reference) => {
    if (!reference) {
        throw new Error('Payment reference is required');
    }

    try {
        const response = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                },
            }
        );


        return response.data;
    } catch (error) {

        throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
};

module.exports = {
    initializePayment,
    verifyPayment,
};
