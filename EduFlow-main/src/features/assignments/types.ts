export type PublishStatus = "Draft" | "Published" | "Closed";
export type ReviewStatus = "Pending" | "Reviewed" | "Returned";

export type FacultyAssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string;
  max_marks: number | null;
  publish_status: PublishStatus;
  allow_late_submission: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  catalog_subject_id: string | null;
  subject_code: string | null;
  subject_name: string | null;
  department_id: string | null;
  department_name: string | null;
  semester: number | null;
  total_students: number;
  submission_count: number;
  pending_review: number;
  reviewed_count: number;
  created_at: string;
};

export type FacultySubmissionRow = {
  id: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  roll_number: string | null;
  file_url: string | null;
  file_name: string | null;
  student_comment: string | null;
  submitted_at: string;
  review_status: ReviewStatus;
  marks: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  is_late: boolean;
};

export type StudentAssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string;
  max_marks: number | null;
  allow_late_submission: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  subject_code: string | null;
  subject_name: string | null;
  faculty_name: string | null;
  submission_id: string | null;
  submitted_at: string | null;
  file_url: string | null;
  file_name: string | null;
  student_comment: string | null;
  review_status: ReviewStatus | null;
  marks: number | null;
  feedback: string | null;
  publish_status: PublishStatus;
};

export type FacultyCatalogSubject = {
  id: string;
  subject_code: string | null;
  subject_name: string;
  semester: number | null;
  department_id: string | null;
  department_name: string | null;
  student_count: number;
};
