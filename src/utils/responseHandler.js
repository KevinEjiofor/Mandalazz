const sendSuccessResponse = (res, data) => {
    res.status(200).json({
        success: true,
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
