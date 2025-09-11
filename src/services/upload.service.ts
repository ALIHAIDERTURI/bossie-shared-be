const AWS = require('aws-sdk');



export class UploadService {
    public uploadFile = async (data: any): Promise<any> => {

        const { file, type } = data;
        console.log("file", file, "type--", type);
        AWS.config.update({
            accessKeyId: process.env.A_ACCESS_KEY_ID,
            secretAccessKey: process.env.A_SECRET_ACCESS_KEY,
        });

        const BUCKET_NAME = `${process.env.FILE_UPLOAD_BUCKET_NAME}`;
        const s3 = new AWS.S3();

        const fileBuffer = file.buffer; // Get binary data from the file
        const fileSizeInBytes = fileBuffer.length;

        // Define file size limits (optional check)
        const maxImageSizeInBytes = 4194304; // 4MB
        const maxVideoSizeInBytes = 52428800; // 50MB (adjust as needed)

        if (type === 'image' && fileSizeInBytes > maxImageSizeInBytes) {
            throw new Error("De afbeeldingsgrootte overschrijdt de limiet van 4 MB");
        } else if (type === 'video' && fileSizeInBytes > maxVideoSizeInBytes) {
            throw new Error("Videoformaat overschrijdt de limiet van 50 MB");
        }

        const fileExtension = type === 'image' ? 'jpg' : 'mp4'; // Customize based on MIME type
        const key = `${Date.now()}-${file.originalname}`;

        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: file.mimetype,
        };

        // Upload file to S3
        try {
            const uploadResult = await s3.upload(params).promise();
            return {
                awsKey: uploadResult.Key,
                awsUrl: uploadResult.Location,
            };
        } catch (error: any) {
            throw new Error("Fout bij het uploaden van bestand naar S3:" + error.message);
        }
    };


}