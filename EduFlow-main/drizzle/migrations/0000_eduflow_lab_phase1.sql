-- EduFlow Lab Phase 1: SQL practice question bank + student progress

CREATE TABLE public.lab_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  setup_sql TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lab_datasets TO authenticated;
GRANT ALL ON public.lab_datasets TO service_role;

ALTER TABLE public.lab_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lab datasets"
  ON public.lab_datasets FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.lab_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  dataset_key TEXT NOT NULL REFERENCES public.lab_datasets(key),
  expected_output JSONB NOT NULL,
  expected_ordered BOOLEAN NOT NULL DEFAULT true,
  hint TEXT,
  solution TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lab_questions TO authenticated;
GRANT ALL ON public.lab_questions TO service_role;

ALTER TABLE public.lab_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published lab questions"
  ON public.lab_questions FOR SELECT TO authenticated
  USING (is_published);

CREATE TABLE public.lab_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.lab_questions(id) ON DELETE CASCADE,
  last_sql TEXT,
  status TEXT NOT NULL DEFAULT 'attempted' CHECK (status IN ('attempted', 'solved')),
  attempts INT NOT NULL DEFAULT 0,
  solved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX idx_lab_attempts_user ON public.lab_attempts (user_id);

GRANT SELECT, INSERT, UPDATE ON public.lab_attempts TO authenticated;
GRANT ALL ON public.lab_attempts TO service_role;

ALTER TABLE public.lab_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read their own lab attempts"
  ON public.lab_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own lab attempts"
  ON public.lab_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own lab attempts"
  ON public.lab_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO public.lab_datasets (key, name, description, setup_sql) VALUES
('campus', 'Campus Database', 'A small campus database with students, courses and enrollments.', 'CREATE TABLE students (id INT PRIMARY KEY, name TEXT NOT NULL, dept TEXT NOT NULL, semester INT NOT NULL, city TEXT, gpa NUMERIC(3,1), joined_on DATE NOT NULL);
CREATE TABLE courses (id INT PRIMARY KEY, title TEXT NOT NULL, dept TEXT NOT NULL, credits INT NOT NULL);
CREATE TABLE enrollments (id INT PRIMARY KEY, student_id INT NOT NULL REFERENCES students(id), course_id INT NOT NULL REFERENCES courses(id), grade TEXT, enrolled_on DATE NOT NULL);
INSERT INTO students VALUES
(1,''Ananya Sharma'',''CSE'',3,''Hyderabad'',8.7,''2023-08-01''),
(2,''Rahul Verma'',''ECE'',2,''Delhi'',7.9,''2024-07-15''),
(3,''Priya Nair'',''CSE'',1,''Kochi'',9.1,''2025-06-20''),
(4,''Arjun Mehta'',''MECH'',4,''Mumbai'',7.2,''2022-08-05''),
(5,''Sneha Reddy'',''ECE'',3,''Hyderabad'',8.4,''2023-08-01''),
(6,''Vikram Singh'',''CIVIL'',2,''Jaipur'',6.8,''2024-07-15''),
(7,''Divya Iyer'',''CSE'',1,''Chennai'',NULL,''2025-06-20''),
(8,''Karan Patel'',''MECH'',4,''Ahmedabad'',7.5,''2022-08-05''),
(9,''Meera Joshi'',''CIVIL'',1,''Pune'',8.9,''2025-06-20'');
INSERT INTO courses VALUES
(1,''Database Systems'',''CSE'',4),
(2,''Data Structures'',''CSE'',3),
(3,''Circuit Analysis'',''ECE'',3),
(4,''Thermodynamics'',''MECH'',4),
(5,''Structural Design'',''CIVIL'',3),
(6,''Operating Systems'',''CSE'',4);
INSERT INTO enrollments VALUES
(1,1,1,''A'',''2025-01-10''),
(2,1,2,''B'',''2025-01-12''),
(3,2,3,''A'',''2025-02-01''),
(4,3,1,''A'',''2025-01-10''),
(5,3,2,''A'',''2025-01-11''),
(6,4,4,''B'',''2025-02-03''),
(7,5,3,''C'',''2025-02-01''),
(8,5,1,''B'',''2025-01-10''),
(9,6,5,''B'',''2025-03-15''),
(10,7,1,NULL,''2025-06-25''),
(11,8,4,''A'',''2025-02-03''),
(12,2,6,''B'',''2025-02-05'');');

INSERT INTO public.lab_questions
  (question_number, topic, difficulty, title, statement, dataset_key, expected_output, expected_ordered, hint, solution)
VALUES
(1, 'SELECT & FROM', 'easy', 'List all students', 'Retrieve every column for every student in the students table, ordered by id.', 'campus', '[{"id":1,"name":"Ananya Sharma","dept":"CSE","semester":3,"city":"Hyderabad","gpa":"8.7","joined_on":"2023-08-01"},{"id":2,"name":"Rahul Verma","dept":"ECE","semester":2,"city":"Delhi","gpa":"7.9","joined_on":"2024-07-15"},{"id":3,"name":"Priya Nair","dept":"CSE","semester":1,"city":"Kochi","gpa":"9.1","joined_on":"2025-06-20"},{"id":4,"name":"Arjun Mehta","dept":"MECH","semester":4,"city":"Mumbai","gpa":"7.2","joined_on":"2022-08-05"},{"id":5,"name":"Sneha Reddy","dept":"ECE","semester":3,"city":"Hyderabad","gpa":"8.4","joined_on":"2023-08-01"},{"id":6,"name":"Vikram Singh","dept":"CIVIL","semester":2,"city":"Jaipur","gpa":"6.8","joined_on":"2024-07-15"},{"id":7,"name":"Divya Iyer","dept":"CSE","semester":1,"city":"Chennai","gpa":null,"joined_on":"2025-06-20"},{"id":8,"name":"Karan Patel","dept":"MECH","semester":4,"city":"Ahmedabad","gpa":"7.5","joined_on":"2022-08-05"},{"id":9,"name":"Meera Joshi","dept":"CIVIL","semester":1,"city":"Pune","gpa":"8.9","joined_on":"2025-06-20"}]'::jsonb, true, 'Use SELECT * to get all columns, and ORDER BY id to sort.', 'SELECT * FROM students ORDER BY id;'),
(2, 'SELECT & FROM', 'easy', 'Course titles and credits', 'Show only the title and credits of every course, ordered by course id.', 'campus', '[{"title":"Database Systems","credits":4},{"title":"Data Structures","credits":3},{"title":"Circuit Analysis","credits":3},{"title":"Thermodynamics","credits":4},{"title":"Structural Design","credits":3},{"title":"Operating Systems","credits":4}]'::jsonb, true, 'Name the two columns after SELECT instead of using *.', 'SELECT title, credits FROM courses ORDER BY id;'),
(3, 'WHERE Clause', 'easy', 'CSE students', 'Find the name and department of all students in the CSE department, sorted alphabetically by name.', 'campus', '[{"name":"Ananya Sharma","dept":"CSE"},{"name":"Divya Iyer","dept":"CSE"},{"name":"Priya Nair","dept":"CSE"}]'::jsonb, true, 'Filter with WHERE dept = ''CSE'' (text values need single quotes).', 'SELECT name, dept FROM students WHERE dept = ''CSE'' ORDER BY name;'),
(4, 'WHERE Clause', 'medium', 'High achievers', 'List the name and gpa of students whose gpa is greater than 8.0, highest gpa first.', 'campus', '[{"name":"Priya Nair","gpa":"9.1"},{"name":"Meera Joshi","gpa":"8.9"},{"name":"Ananya Sharma","gpa":"8.7"},{"name":"Sneha Reddy","gpa":"8.4"}]'::jsonb, true, 'Combine WHERE gpa > 8.0 with ORDER BY gpa DESC.', 'SELECT name, gpa FROM students WHERE gpa > 8.0 ORDER BY gpa DESC;'),
(5, 'DISTINCT', 'easy', 'Departments on campus', 'List each department that has students, with no duplicates, in alphabetical order.', 'campus', '[{"dept":"CIVIL"},{"dept":"CSE"},{"dept":"ECE"},{"dept":"MECH"}]'::jsonb, true, 'SELECT DISTINCT removes duplicate rows.', 'SELECT DISTINCT dept FROM students ORDER BY dept;'),
(6, 'DISTINCT', 'medium', 'Grades awarded', 'List each distinct grade that has actually been awarded in enrollments (ignore rows where no grade is recorded yet), sorted alphabetically.', 'campus', '[{"grade":"A"},{"grade":"B"},{"grade":"C"}]'::jsonb, true, 'Exclude missing grades with WHERE grade IS NOT NULL before applying DISTINCT.', 'SELECT DISTINCT grade FROM enrollments WHERE grade IS NOT NULL ORDER BY grade;'),
(7, 'LIMIT & OFFSET', 'easy', 'Top 3 students by GPA', 'Show the name and gpa of the 3 students with the highest gpa.', 'campus', '[{"name":"Priya Nair","gpa":"9.1"},{"name":"Meera Joshi","gpa":"8.9"},{"name":"Ananya Sharma","gpa":"8.7"}]'::jsonb, true, 'Sort descending by gpa with NULLS LAST (students without a gpa should not rank first), then LIMIT 3.', 'SELECT name, gpa FROM students ORDER BY gpa DESC NULLS LAST LIMIT 3;'),
(8, 'LIMIT & OFFSET', 'medium', 'Second page of the leaderboard', 'Show the name and gpa of the students ranked 3rd and 4th by gpa (skip the top 2, then take 2 rows).', 'campus', '[{"name":"Ananya Sharma","gpa":"8.7"},{"name":"Sneha Reddy","gpa":"8.4"}]'::jsonb, true, 'OFFSET skips rows before LIMIT takes them. Remember NULLS LAST so missing gpas don''t rank first.', 'SELECT name, gpa FROM students ORDER BY gpa DESC NULLS LAST LIMIT 2 OFFSET 2;'),
(9, 'Aliases', 'easy', 'Renamed columns', 'Show student names and departments for first-semester students, but rename the columns to student_name and department. Sort by student_name.', 'campus', '[{"student_name":"Divya Iyer","department":"CSE"},{"student_name":"Meera Joshi","department":"CIVIL"},{"student_name":"Priya Nair","department":"CSE"}]'::jsonb, true, 'Use AS to rename a column: name AS student_name.', 'SELECT name AS student_name, dept AS department FROM students WHERE semester = 1 ORDER BY student_name;'),
(10, 'Aliases', 'medium', 'GPA as a percentage', 'For every student with a recorded gpa, show their name and their gpa converted to a percentage (gpa * 10) in a column called percentage. Highest percentage first.', 'campus', '[{"name":"Priya Nair","percentage":"91.0"},{"name":"Meera Joshi","percentage":"89.0"},{"name":"Ananya Sharma","percentage":"87.0"},{"name":"Sneha Reddy","percentage":"84.0"},{"name":"Rahul Verma","percentage":"79.0"},{"name":"Karan Patel","percentage":"75.0"},{"name":"Arjun Mehta","percentage":"72.0"},{"name":"Vikram Singh","percentage":"68.0"}]'::jsonb, true, 'You can compute and alias in one step: gpa * 10 AS percentage.', 'SELECT name, gpa * 10 AS percentage FROM students WHERE gpa IS NOT NULL ORDER BY percentage DESC;'),
(11, 'ORDER BY', 'easy', 'Courses by credit load', 'List course title and credits, sorted by credits from highest to lowest; break ties alphabetically by title.', 'campus', '[{"title":"Database Systems","credits":4},{"title":"Operating Systems","credits":4},{"title":"Thermodynamics","credits":4},{"title":"Circuit Analysis","credits":3},{"title":"Data Structures","credits":3},{"title":"Structural Design","credits":3}]'::jsonb, true, 'ORDER BY accepts multiple keys: credits DESC, title ASC.', 'SELECT title, credits FROM courses ORDER BY credits DESC, title ASC;'),
(12, 'ORDER BY', 'medium', 'Students by semester, then GPA', 'List name, semester and gpa for all students. Sort by semester ascending, and within each semester by gpa descending, putting students with no gpa last.', 'campus', '[{"name":"Priya Nair","semester":1,"gpa":"9.1"},{"name":"Meera Joshi","semester":1,"gpa":"8.9"},{"name":"Divya Iyer","semester":1,"gpa":null},{"name":"Rahul Verma","semester":2,"gpa":"7.9"},{"name":"Vikram Singh","semester":2,"gpa":"6.8"},{"name":"Ananya Sharma","semester":3,"gpa":"8.7"},{"name":"Sneha Reddy","semester":3,"gpa":"8.4"},{"name":"Karan Patel","semester":4,"gpa":"7.5"},{"name":"Arjun Mehta","semester":4,"gpa":"7.2"}]'::jsonb, true, 'Use NULLS LAST so missing gpas do not jump to the front of a descending sort.', 'SELECT name, semester, gpa FROM students ORDER BY semester ASC, gpa DESC NULLS LAST;'),
(13, 'Aggregate Functions', 'easy', 'Student body stats', 'Report three values in one row: total_students (count of all students), avg_gpa (average gpa rounded to 2 decimals), and top_gpa (the highest gpa).', 'campus', '[{"total_students":9,"avg_gpa":"8.06","top_gpa":"9.1"}]'::jsonb, true, 'COUNT, AVG and MAX ignore NULL gpas automatically (except COUNT(*)).', 'SELECT COUNT(*) AS total_students, ROUND(AVG(gpa), 2) AS avg_gpa, MAX(gpa) AS top_gpa FROM students;'),
(14, 'Aggregate Functions', 'medium', 'Enrollment overview', 'Report two values in one row: total_enrollments (all enrollment rows) and unique_students (how many different students are enrolled).', 'campus', '[{"total_enrollments":12,"unique_students":8}]'::jsonb, true, 'COUNT(DISTINCT column) counts each value only once.', 'SELECT COUNT(*) AS total_enrollments, COUNT(DISTINCT student_id) AS unique_students FROM enrollments;'),
(15, 'GROUP BY & HAVING', 'easy', 'Students per department', 'Count how many students are in each department. Show dept and student_count, sorted by dept.', 'campus', '[{"dept":"CIVIL","student_count":2},{"dept":"CSE","student_count":3},{"dept":"ECE","student_count":2},{"dept":"MECH","student_count":2}]'::jsonb, true, 'GROUP BY dept makes one row per department.', 'SELECT dept, COUNT(*) AS student_count FROM students GROUP BY dept ORDER BY dept;'),
(16, 'GROUP BY & HAVING', 'medium', 'Departments with multiple students', 'Show only the departments that have more than one student, with their student_count. Sort by student_count descending, then dept.', 'campus', '[{"dept":"CSE","student_count":3},{"dept":"CIVIL","student_count":2},{"dept":"ECE","student_count":2},{"dept":"MECH","student_count":2}]'::jsonb, true, 'HAVING filters groups after GROUP BY; WHERE cannot use aggregates.', 'SELECT dept, COUNT(*) AS student_count FROM students GROUP BY dept HAVING COUNT(*) > 1 ORDER BY student_count DESC, dept;'),
(17, 'JOINs', 'easy', 'Who enrolled in what', 'List every enrollment as student name and course title, ordered by enrollment id.', 'campus', '[{"name":"Ananya Sharma","title":"Database Systems"},{"name":"Ananya Sharma","title":"Data Structures"},{"name":"Rahul Verma","title":"Circuit Analysis"},{"name":"Priya Nair","title":"Database Systems"},{"name":"Priya Nair","title":"Data Structures"},{"name":"Arjun Mehta","title":"Thermodynamics"},{"name":"Sneha Reddy","title":"Circuit Analysis"},{"name":"Sneha Reddy","title":"Database Systems"},{"name":"Vikram Singh","title":"Structural Design"},{"name":"Divya Iyer","title":"Database Systems"},{"name":"Karan Patel","title":"Thermodynamics"},{"name":"Rahul Verma","title":"Operating Systems"}]'::jsonb, true, 'Join enrollments to students on student_id and to courses on course_id.', 'SELECT s.name, c.title FROM enrollments e JOIN students s ON s.id = e.student_id JOIN courses c ON c.id = e.course_id ORDER BY e.id;'),
(18, 'JOINs', 'medium', 'Students with no enrollment', 'Find the name and dept of students who have not enrolled in any course yet.', 'campus', '[{"name":"Meera Joshi","dept":"CIVIL"}]'::jsonb, true, 'A LEFT JOIN keeps unmatched students; their enrollment columns come back NULL.', 'SELECT s.name, s.dept FROM students s LEFT JOIN enrollments e ON e.student_id = s.id WHERE e.id IS NULL ORDER BY s.name;'),
(19, 'Subqueries', 'medium', 'Database Systems class list', 'List the names of students enrolled in the course ''Database Systems'', sorted by name. Use a subquery (IN) instead of a JOIN.', 'campus', '[{"name":"Ananya Sharma"},{"name":"Divya Iyer"},{"name":"Priya Nair"},{"name":"Sneha Reddy"}]'::jsonb, true, 'Nest two subqueries: one finds the course id, the other finds its student ids.', 'SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE title = ''Database Systems'')) ORDER BY name;'),
(20, 'Subqueries', 'hard', 'Students who never scored an A', 'Using NOT EXISTS, list the name of every student who has never received an ''A'' grade in any enrollment. Sort by name.', 'campus', '[{"name":"Arjun Mehta"},{"name":"Divya Iyer"},{"name":"Meera Joshi"},{"name":"Sneha Reddy"},{"name":"Vikram Singh"}]'::jsonb, true, 'NOT EXISTS is true when the correlated subquery finds no matching row.', 'SELECT name FROM students s WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id AND e.grade = ''A'') ORDER BY name;'),
(21, 'Date & Timestamp Filtering', 'easy', 'January 2025 enrollments', 'List the student_id, course_id and enrolled_on for enrollments made during January 2025, ordered by enrolled_on then id.', 'campus', '[{"student_id":1,"course_id":1,"enrolled_on":"2025-01-10"},{"student_id":3,"course_id":1,"enrolled_on":"2025-01-10"},{"student_id":5,"course_id":1,"enrolled_on":"2025-01-10"},{"student_id":3,"course_id":2,"enrolled_on":"2025-01-11"},{"student_id":1,"course_id":2,"enrolled_on":"2025-01-12"}]'::jsonb, true, 'A half-open range (>= first day, < first day of next month) is the safest date filter.', 'SELECT student_id, course_id, enrolled_on FROM enrollments WHERE enrolled_on >= DATE ''2025-01-01'' AND enrolled_on < DATE ''2025-02-01'' ORDER BY enrolled_on, id;'),
(22, 'Date & Timestamp Filtering', 'medium', 'Students who joined in 2025', 'List the name and joined_on of students who joined during the year 2025, ordered by joined_on.', 'campus', '[{"name":"Priya Nair","joined_on":"2025-06-20"},{"name":"Divya Iyer","joined_on":"2025-06-20"},{"name":"Meera Joshi","joined_on":"2025-06-20"}]'::jsonb, true, 'EXTRACT(YEAR FROM date) pulls the year out of a date.', 'SELECT name, joined_on FROM students WHERE EXTRACT(YEAR FROM joined_on) = 2025 ORDER BY joined_on;'),
(23, 'NULL Handling', 'easy', 'Students with missing GPA', 'Find the name and dept of students whose gpa has not been recorded yet.', 'campus', '[{"name":"Divya Iyer","dept":"CSE"}]'::jsonb, true, 'NULL cannot be compared with =; use IS NULL.', 'SELECT name, dept FROM students WHERE gpa IS NULL ORDER BY name;'),
(24, 'NULL Handling', 'medium', 'Grades with a Pending label', 'For every enrollment, show the student name and their grade — but display ''Pending'' instead of an empty grade, in a column called grade. Order by enrollment id.', 'campus', '[{"name":"Ananya Sharma","grade":"A"},{"name":"Ananya Sharma","grade":"B"},{"name":"Rahul Verma","grade":"A"},{"name":"Priya Nair","grade":"A"},{"name":"Priya Nair","grade":"A"},{"name":"Arjun Mehta","grade":"B"},{"name":"Sneha Reddy","grade":"C"},{"name":"Sneha Reddy","grade":"B"},{"name":"Vikram Singh","grade":"B"},{"name":"Divya Iyer","grade":"Pending"},{"name":"Karan Patel","grade":"A"},{"name":"Rahul Verma","grade":"B"}]'::jsonb, true, 'COALESCE(value, fallback) returns the first non-NULL argument.', 'SELECT s.name, COALESCE(e.grade, ''Pending'') AS grade FROM enrollments e JOIN students s ON s.id = e.student_id ORDER BY e.id;');