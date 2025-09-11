import { uploadController } from "@src/controllers";
import { Router, Request, Response } from "express";

import multer from "multer";


// Multer config for handling multipart form-data (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });
export const uploadRouter: Router = Router();

// Route to handle file upload
uploadRouter.post("/upload", upload.single("file"), (req, res) =>
    uploadController.uploadFile(req, res)
);

// uploadRouter.post("/upload", (...args: [Request, Response]) =>
//     uploadController.uploadFile(...args)
// );
