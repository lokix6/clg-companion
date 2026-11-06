import { supabase } from "@/integrations/supabase/client";

export const ASSIGNMENT_ATTACHMENTS_BUCKET = "assignment-attachments";
export const ASSIGNMENT_SUBMISSIONS_BUCKET = "assignment-submissions";

export async function uploadFacultyAttachment(facultyId: string, file: File) {
  const path = `${facultyId}/${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage
    .from(ASSIGNMENT_ATTACHMENTS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return { path, name: file.name };
}

export async function uploadStudentSubmission(
  assignmentId: string,
  studentId: string,
  file: File,
) {
  const path = `${assignmentId}/${studentId}/${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage
    .from(ASSIGNMENT_SUBMISSIONS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return { path, name: file.name };
}

export async function signedUrl(bucket: string, path: string, expiresIn = 300) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function openStorageFile(bucket: string, path: string) {
  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  try {
    const url = await signedUrl(bucket, path);
    if (popup) {
      popup.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    popup?.close();
    throw error;
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
