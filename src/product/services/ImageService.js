const cloudinary = require('../../config/cloudinary');
const sharp = require('sharp');
const fs = require('fs').promises;

class ImageService {
    constructor() {
        this.MAX_FILE_SIZE_MB = 10;
        this.DEFAULT_COMPRESSION_QUALITY = 80;
        this.MAX_UPLOAD_RETRIES = 3;
    }

    async processVariations(variationsData, files, folder = 'products') {
        try {
            const parsedVariations = this.parseVariationsData(variationsData);
            const imageMap = this.extractImageMap(files);

            const processedVariations = await Promise.all(
                parsedVariations.map(async (variation) => {
                    if (!variation.color) {
                        throw new Error('Each variation must have a color');
                    }

                    const matchedFiles = this.findMatchingFiles(files, variation.color, imageMap);
                    const imageUrls = await this.uploadVariationImages(matchedFiles, folder);

                    return { ...variation, images: imageUrls };
                })
            );

            return processedVariations;
        } catch (error) {
            throw new Error(`Failed to process variations: ${error.message}`);
        }
    }

    parseVariationsData(variationsData) {
        try {
            const parsed = typeof variationsData === 'string' ? JSON.parse(variationsData) : variationsData;
            if (!Array.isArray(parsed)) {
                throw new Error('Variations must be an array');
            }
            return parsed;
        } catch (parseError) {
            throw new Error(`Invalid variations data format: ${parseError.message}`);
        }
    }

    extractImageMap(files) {
        const imageMapFile = files.find(f => f.fieldname === 'imageMap');
        if (!imageMapFile?.buffer) return {};

        try {
            return JSON.parse(imageMapFile.buffer.toString());
        } catch {
            return {};
        }
    }

    findMatchingFiles(files, color, imageMap) {
        return files.filter(file => {
            if (file.fieldname === 'imageMap') return false;

            if (Object.keys(imageMap).length > 0) {
                const info = imageMap[file.originalname];
                return info?.color?.toLowerCase() === color.toLowerCase();
            }

            return file.originalname.toLowerCase().includes(color.toLowerCase());
        });
    }

    async uploadVariationImages(files, folder) {
        return await Promise.all(
            files.map(async (file) => {
                const compressedPath = await this.ensureCloudinaryCompatible(file.path);
                const uploaded = await this.uploadWithRetry(compressedPath, folder, file.originalname);

                if (compressedPath !== file.path) {
                    await this.safeUnlink(compressedPath);
                }

                return uploaded.secure_url;
            })
        );
    }

    async ensureCloudinaryCompatible(filePath, maxSizeKB = 8000) {
        try {
            const stats = await fs.stat(filePath);
            const fileSizeKB = stats.size / 1024;

            if (fileSizeKB <= maxSizeKB) return filePath;

            const compressedPath = filePath.replace(/(\.[^.]+)$/, '_cloudinary_compressed$1');
            const quality = this.calculateCompressionQuality(fileSizeKB);
            const maxWidth = this.calculateMaxWidth(fileSizeKB);

            await sharp(filePath)
                .resize(maxWidth, maxWidth, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(compressedPath);

            return compressedPath;
        } catch {
            return filePath;
        }
    }

    calculateCompressionQuality(fileSizeKB) {
        if (fileSizeKB > 25000) return 30;
        if (fileSizeKB > 15000) return 50;
        return 70;
    }

    calculateMaxWidth(fileSizeKB) {
        if (fileSizeKB > 25000) return 1200;
        if (fileSizeKB > 15000) return 1500;
        return 1800;
    }

    async uploadWithRetry(imagePath, folder, fileName, maxRetries = 3) {
        // Validate inputs
        if (!imagePath || !fileName) {
            throw new Error('Image path and file name are required.');
        }

        // Check file exists and size
        await fs.access(imagePath);
        const stats = await fs.stat(imagePath);
        if (stats.size > 10 * 1024 * 1024) {
            throw new Error(`File size exceeds 10MB limit: ${fileName}`);
        }

        // Retry upload
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await cloudinary.uploader.upload(imagePath, {
                    folder,
                    public_id: fileName.split('.')[0],
                    timeout: 120000,
                    resource_type: 'auto',
                    overwrite: true,
                    quality: 'auto:good',
                    fetch_format: 'auto'
                });
            } catch (error) {
                if (attempt === maxRetries) {
                    throw new Error(`Failed to upload ${fileName} after ${maxRetries} attempts: ${error.message}`);
                }
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    async deleteProductImages(variations) {
        if (!variations?.length) return;

        const deletePromises = variations.flatMap((variation) =>
            (variation.images || []).map(async (imageUrl) => {
                try {
                    const publicId = this.extractPublicId(imageUrl);
                    await cloudinary.uploader.destroy(publicId, { timeout: 60000 });
                } catch {
                    // Silent fail for image deletion
                }
            })
        );

        await Promise.all(deletePromises);
    }

    extractPublicId(imageUrl) {
        const urlParts = imageUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        const publicId = lastPart.split('.')[0];
        return urlParts.slice(-2, -1)[0] + '/' + publicId;
    }

    updateVariationsWithoutImages(existingVariations, newVariationsData) {
        try {
            const parsedVariations = this.parseVariationsData(newVariationsData);

            return existingVariations.map(existingVariation => {
                const updatedVariation = parsedVariations.find(v => v.color === existingVariation.color);
                return updatedVariation
                    ? { ...existingVariation, ...updatedVariation, images: existingVariation.images }
                    : existingVariation;
            });
        } catch (error) {
            throw new Error(`Error updating variations: ${error.message}`);
        }
    }

    async cleanupFiles(files) {
        await Promise.all(files.map(file => this.safeUnlink(file.path).catch(() => {})));
    }

    async safeUnlink(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
}

// Export the class as a constructor
module.exports = ImageService;