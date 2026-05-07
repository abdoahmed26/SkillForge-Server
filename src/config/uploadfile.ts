import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config();


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const multerOptions: MulterOptions = {
    storage: new CloudinaryStorage({
        cloudinary,
        params: (req, file) => {
        return {
            folder: process.env.CLOUDINARY_FOLDER_NAME,
            allowed_formats: ['jpg', 'png', 'jpeg', "mp4", "mp3"],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };
        },
    }),
};