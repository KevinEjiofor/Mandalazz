const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {

        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.originalname.replace(/ /g, '_')}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG and PNG files are allowed'), false);
    }
};


const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 30 * 1024 * 1024 },
}).array('images', 10);

module.exports = upload;
