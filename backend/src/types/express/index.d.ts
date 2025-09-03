// /backend/src/types/express/index.d.ts
import 'express';

// Augment the Express Request interface to include properties added by middleware
declare global {
  namespace Express {
    export interface Request {
      user?: {
        userId: string;
        email: string;
        username: string;
      };
      file?: Multer.File;
    }

    namespace Multer {
      export interface File {
        /** The name of the form field associated with this file. */
        fieldname: string;
        /** The original name of the file from the client. */
        originalname: string;
        /** The MIME type of the file. */
        mimetype: string;
        /** The size of the file in bytes. */
        size: number;
        /** A Buffer containing the entire file. */
        buffer: Buffer;
      }
    }
  }
}
