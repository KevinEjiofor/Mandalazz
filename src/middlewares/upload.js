const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const nameWithoutExt = path.basename(file.originalname, path.extname(file.originalname)).replace(/ /g, '_');
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${nameWithoutExt}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        'image/heic',         // High Efficiency Image Format (Apple)
        'image/heif',
        'image/x-icon',       // .ico files
        'image/vnd.microsoft.icon',
        'image/avif',         // AV1 Image File Format
        'image/x-png',        // sometimes used for .png
        'image/x-ms-bmp',     // alternate MIME type for .bmp
        'image/x-canon-cr2',  // Canon RAW
        'image/x-nikon-nef',  // Nikon RAW
        'image/x-adobe-dng',  // Digital Negative
        'image/x-sony-arw',   // Sony RAW
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported image type. Allowed formats: jpeg, jpg, png, webp, gif, bmp, tiff, svg, heic, avif, raw, ico'), false);
    }
};

const compressImage = async (filePath, maxSizeKB = 8000) => {
    try {
        const stats = fs.statSync(filePath);
        const fileSizeKB = stats.size / 1024;

        if (fileSizeKB <= maxSizeKB) {
            return filePath;
        }

        const compressedPath = filePath.replace(/(\.[^.]+)$/, '_compressed$1');

        let quality = 80;
        if (fileSizeKB > 15000) quality = 60;
        if (fileSizeKB > 25000) quality = 40;

        await sharp(filePath)
            .resize(2000, 2000, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: quality,
                progressive: true,
                mozjpeg: true
            })
            .toFile(compressedPath);

        const compressedStats = fs.statSync(compressedPath);
        const compressedSizeKB = compressedStats.size / 1024;

        if (compressedSizeKB <= maxSizeKB) {
            fs.unlinkSync(filePath);
            fs.renameSync(compressedPath, filePath);
            return filePath;
        } else {
            await sharp(filePath)
                .resize(1500, 1500, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: 30,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(compressedPath);

            fs.unlinkSync(filePath);
            fs.renameSync(compressedPath, filePath);
            return filePath;
        }
    } catch (error) {
        console.error('Image compression failed:', error);
        throw error;
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 300 * 1024 * 1024 },
}).array('images', 100);

const compressUploadedImages = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        const compressionPromises = req.files.map(async (file) => {
            const compressedPath = await compressImage(file.path);
            const stats = fs.statSync(compressedPath);
            file.size = stats.size;
            return file;
        });

        await Promise.all(compressionPromises);
        next();
    } catch (error) {
        console.error('Error compressing images:', error);
        next(error);
    }
};

module.exports = { upload, compressUploadedImages };