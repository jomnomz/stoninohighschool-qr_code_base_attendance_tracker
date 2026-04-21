import * as XLSX from 'xlsx';

const STUDENT_HEADERS = [
  'LRN',
  'First Name',
  'Last Name',
  'Middle Name',
  'Grade',
  'Section',
  'Email',
  'Phone Number',
  'Guardian First Name',
  'Guardian Middle Name',
  'Guardian Last Name',
  'Guardian Phone Number',
  'Guardian Email',
];

const TEACHER_HEADERS = [
  'Employee ID',
  'First Name',
  'Last Name',
  'Middle Name',
  'Email Address',
  'Phone Number',
  'Subjects',
  'Grade-Sections (Teaching)',
  'Adviser Grade-Section',
];

const MASTER_DATA_HEADERS = {
  gradeSections: ['Grade', 'Section'],
  subjects: ['Subject Code', 'Subject Name'],
  schedules: ['Grade', 'Class Start', 'Class End', 'Grace Period'],
};

const joinList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean).join(', ');
  }
  return value ?? '';
};

const autoSizeColumns = (headers, rows) => {
  return headers.map((header, index) => {
    const longestCell = rows.reduce((max, row) => {
      const value = String(row[index] ?? '');
      return Math.max(max, value.length);
    }, String(header).length);

    return { wch: Math.max(longestCell + 2, 16) };
  });
};

const createSheetFromRows = (headers, rows) => {
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = autoSizeColumns(headers, rows);
  return worksheet;
};

const getDateSuffix = () => new Date().toISOString().slice(0, 10);

const exportStudentEntity = (students, filename) => {
  const rows = (students || []).map((student) => [
    student.lrn ?? '',
    student.first_name ?? '',
    student.last_name ?? '',
    student.middle_name ?? '',
    student.grade ?? '',
    student.section ?? '',
    student.email ?? '',
    student.phone_number ?? '',
    student.guardian_first_name ?? '',
    student.guardian_middle_name ?? '',
    student.guardian_last_name ?? '',
    student.guardian_phone_number ?? '',
    student.guardian_email ?? '',
  ]);

  const workbook = XLSX.utils.book_new();
  const worksheet = createSheetFromRows(STUDENT_HEADERS, rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  XLSX.writeFile(workbook, `${filename}-${getDateSuffix()}.xlsx`);
};

const exportTeacherEntity = (teachers, filename) => {
  const rows = (teachers || []).map((teacher) => [
    teacher.employee_id ?? '',
    teacher.first_name ?? '',
    teacher.last_name ?? '',
    teacher.middle_name ?? '',
    teacher.email_address ?? teacher.email ?? '',
    teacher.phone_no ?? teacher.phone_number ?? '',
    joinList(teacher.subjects),
    joinList(teacher.grade_sections_teaching),
    teacher.adviser_grade_section ?? '',
  ]);

  const workbook = XLSX.utils.book_new();
  const worksheet = createSheetFromRows(TEACHER_HEADERS, rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');
  XLSX.writeFile(workbook, `${filename}-${getDateSuffix()}.xlsx`);
};

const exportMasterDataEntity = (data, filename) => {
  const workbook = XLSX.utils.book_new();

  const gradeSections = data?.gradeSections || [];
  const subjects = data?.subjects || [];
  const schedules = data?.schedules || [];

  const gradeSectionRows = gradeSections.map((item) => [
    item.grade ?? '',
    item.section ?? item.section_name ?? '',
  ]);
  const gradeSectionSheet = createSheetFromRows(MASTER_DATA_HEADERS.gradeSections, gradeSectionRows);
  XLSX.utils.book_append_sheet(workbook, gradeSectionSheet, 'Grade Sections');

  const subjectRows = subjects.map((item) => [item.subject_code ?? '', item.subject_name ?? '']);
  const subjectSheet = createSheetFromRows(MASTER_DATA_HEADERS.subjects, subjectRows);
  XLSX.utils.book_append_sheet(workbook, subjectSheet, 'Subjects');

  const scheduleRows = schedules.map((item) => [
    item.grade_level ?? item.grade ?? '',
    item.class_start ?? '',
    item.class_end ?? '',
    item.grace_period_minutes ?? item.grace_period ?? 15,
  ]);
  const scheduleSheet = createSheetFromRows(MASTER_DATA_HEADERS.schedules, scheduleRows);
  XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Grade Schedules');

  XLSX.writeFile(workbook, `${filename}-${getDateSuffix()}.xlsx`);
};

export function exportEntity({ entity, data = [], filename } = {}) {
  if (!entity) {
    throw new Error('Missing entity export type');
  }

  if (entity !== 'masterData' && (!Array.isArray(data) || data.length === 0)) {
    throw new Error('No data available to export');
  }

  if (entity === 'student') {
    exportStudentEntity(data, filename || 'student-export');
    return;
  }

  if (entity === 'teacher') {
    exportTeacherEntity(data, filename || 'teacher-export');
    return;
  }

  if (entity === 'masterData') {
    const hasGradeSections = Array.isArray(data?.gradeSections) && data.gradeSections.length > 0;
    const hasSubjects = Array.isArray(data?.subjects) && data.subjects.length > 0;
    const hasSchedules = Array.isArray(data?.schedules) && data.schedules.length > 0;

    if (!hasGradeSections && !hasSubjects && !hasSchedules) {
      throw new Error('No master data available to export');
    }

    const baseFilename = filename || 'master-data-export';
    exportMasterDataEntity(data, baseFilename);
    return;
  }

  throw new Error('Unsupported entity export type');
}
