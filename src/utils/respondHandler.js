const sendSuccessResponse = (res, message, data) => {
    res.status(200).json({
        success: true,
        message,
        data,

    });
};

const sendErrorResponse = (res, message) => {
    res.status(400).json({
        success: false,
        message,

    });
};

module.exports = { sendSuccessResponse, sendErrorResponse };
