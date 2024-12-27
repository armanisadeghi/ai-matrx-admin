import { AvailableBuckets } from "./types";
import { supabaseStandard, supabaseDebug } from "@/utils/supabase/debugClient";

const debug = true;
const supabase = debug ? supabaseDebug : supabaseStandard;

export async function fetchStorageContents(
  bucket: AvailableBuckets,
  path: string,
  options: {
    limit?: number;
    sortBy?: { column: string; order: "asc" | "desc" };
  }
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path, options);

  if (error) throw error;
  if (!data) throw new Error("No data received");

  return data;
}

export async function fetchStorageItem(
  bucketName: AvailableBuckets,
  path: string
) {
  console.log("--> Path: ", path);

  const { data, error } = await supabase.storage.from(bucketName).list("", {
    limit: 1,
    offset: 0,
    search: path,
  });

  if (error) {
    throw new Error(`Error fetching storage item: ${error.message}`);
  }

  console.log("--> data", data);

  return data[0];
}

export async function copyStorageItem(
  bucketName: AvailableBuckets,
  currentPath: string,
  duplicatePath: string
) {
  const { data: file, error: downloadError } = await supabase.storage
    .from(bucketName)
    .download(currentPath);

  if (downloadError) throw downloadError;
  if (!file) throw new Error("File not found");

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(duplicatePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  return fetchStorageItem(bucketName, duplicatePath);
}

export async function moveOrRenameFile(
    bucketName: AvailableBuckets,
    oldPath: string,
    newPath: string
  ) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .move(oldPath, newPath);
  
    if (error) {
      throw new Error(`Error moving file: ${error.message}`);
    }
    return true;
  }

  export async function moveOrRenameFolder(
    bucketName: AvailableBuckets,
    oldPath: string,
    newPath: string
  ) {
    const { data, error } = await supabase.rpc('rename_storage_folder', {
      bucket_name: bucketName,
      old_folder_path: oldPath,
      new_folder_path: newPath
    });
  
    if (error) {
      throw new Error(`Error moving folder: ${error.message}`);
    }
  
    return data;
  }
  