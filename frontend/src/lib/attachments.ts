export const attachmentAccept = "application/pdf,image/jpeg,image/png,image/webp";

export function isAllowedAttachment(file: File) {
  return !file.type || attachmentAccept.split(",").includes(file.type);
}

export function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
