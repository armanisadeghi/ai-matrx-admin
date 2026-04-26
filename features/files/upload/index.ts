/**
 * features/files/upload — single-source upload primitive.
 *
 * Use `cloudUpload` for everything. The hooks under `features/files/hooks`
 * are now thin wrappers over this module.
 */

export {
  cloudUpload,
  cloudUploadRaw,
  cloudUploadMany,
  cloudUploadImperative,
  isCloudUploadFailure,
  isCloudUploadSuccess,
} from "./cloudUpload";
export type {
  CloudUploadOptions,
  CloudUploadSuccess,
  CloudUploadFailure,
  CloudUploadResult,
  CloudUploadManyOptions,
  CloudUploadManyResult,
} from "./cloudUpload";
