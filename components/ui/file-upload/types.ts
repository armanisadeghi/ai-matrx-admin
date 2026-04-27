import { EnhancedFileDetails } from "@/utils/file-operations/constants";

export type UploadedFileResult = {
  url: string;
  type: string;
  details?: EnhancedFileDetails;
};
