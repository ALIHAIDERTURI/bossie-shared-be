import { UploadService } from "@src/services/upload.service";


import { Request, Response } from "express";

export class UploadController {
    /**
     * @param __service
     */

    public constructor(public __service: UploadService) { }
    /**
     *
     * @param req
     * @param res
     * @param next
     */

    public uploadFile = async (req: Request, res: Response) => {
        const { file } = req;
        console.log("here");
        let message: any = "Successfully uploaded."


        if (!file) {
            return res.status(400).json({ message: 'File is required' });
        }

        try {
            // Pass file and type to the service layer
            const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            const response = await this.__service.uploadFile({ file, type: fileType });

            res.status(200).json({
                statusCode: 200,
                message,
                response,
            });
        } catch (error: any) {
            console.error("Error in uploadFile:", error.message);
            res.status(403).send({
                statusCode: 403,
                message: "Error uploading file",
            });
        }
    };

}