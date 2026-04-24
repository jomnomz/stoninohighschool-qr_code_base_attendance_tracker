import React, { useEffect, useState, useMemo, useCallback } from 'react';
// Removed useToast and all edit-related imports
import Table from '../Table/Table.jsx';
import { formatStudentName } from '../../../Utils/Formatters';
import { supabase } from '../../../lib/supabase';
import styles from './ClassAttendanceReportTable.module.css';

const withColumnWidth = (width, minWidth) => ({
  width,
  minWidth: `${minWidth}px`
});

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];


const ClassAttendanceReportTable = ({ currentClass, selectedMonth, attendanceRows, setAttendanceRows, loading, setLoading }) => {
  const [error, setError] = useState(null);

  // Parse grade and section from currentClass (e.g., "7-A")
  const parseClassName = (className) => {
    const match = className?.match(/^(\d+)[-\s](.+)$/);
    if (match) {
      return { grade: match[1], section: match[2] };
    }
    return { grade: null, section: null };
  };

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!currentClass) return;
      setLoading(true);
      setError(null);
      try {
        const { grade, section } = parseClassName(currentClass);
        if (!grade || !section) throw new Error('Invalid class name');

        // Fetch section and grade IDs
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .select('id, section_name')
          .eq('section_name', section)
          .single();
        if (sectionError) throw sectionError;

        const { data: gradeData, error: gradeError } = await supabase
          .from('grades')
          .select('id, grade_level')
          .eq('grade_level', grade)
          .single();
        if (gradeError) throw gradeError;

        // Fetch students in this class
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, middle_name')
          .eq('grade_id', gradeData.id)
          .eq('section_id', sectionData.id);
        if (studentsError) throw studentsError;

        // Fetch attendance records for these students for the selected month/year
        const studentIds = students.map(s => s.id);
        let newAttendanceRows = [];
        if (studentIds.length > 0) {
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('student_id, status, date')
            .in('student_id', studentIds);
          if (attendanceError) throw attendanceError;

          students.forEach(student => {
            // Filter attendance for this student for the selected month/year
            const records = (attendanceData || []).filter(a => {
              const d = new Date(a.date);
              return a.student_id === student.id && d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month;
            });
            const schoolDays = records.length;
            const present = records.filter(r => r.status === 'present').length;
            const late = records.filter(r => r.status === 'late').length;
            const absent = records.filter(r => r.status === 'absent').length;
            const attendanceRate = schoolDays > 0 ? (((present + late) / schoolDays) * 100).toFixed(2) : '0.00';
            newAttendanceRows.push({
              id: student.id,
              name: formatStudentName(student),
              schoolDays,
              present,
              late,
              absent,
              attendanceRate: `${attendanceRate}%`
            });
          });
        }
        setAttendanceRows(newAttendanceRows);
      } catch (err) {
        setError(err.message || 'Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceData();
    // eslint-disable-next-line
  }, [currentClass, selectedMonth, setAttendanceRows, setLoading]);



  // --- Columns ---
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Student Name',
      headerStyle: withColumnWidth('30%', 180),
      cellStyle: withColumnWidth('30%', 180),
      renderCell: ({ row }) => row.name
    },
    {
      key: 'schoolDays',
      label: 'School Days',
      headerStyle: withColumnWidth('14%', 80),
      cellStyle: withColumnWidth('14%', 80),
      renderCell: ({ row }) => row.schoolDays
    },
    {
      key: 'present',
      label: 'Present',
      headerStyle: withColumnWidth('14%', 80),
      cellStyle: withColumnWidth('14%', 80),
      renderCell: ({ row }) => row.present
    },
    {
      key: 'late',
      label: 'Late',
      headerStyle: withColumnWidth('14%', 80),
      cellStyle: withColumnWidth('14%', 80),
      renderCell: ({ row }) => row.late
    },
    {
      key: 'absent',
      label: 'Absent',
      headerStyle: withColumnWidth('14%', 80),
      cellStyle: withColumnWidth('14%', 80),
      renderCell: ({ row }) => row.absent
    },
    {
      key: 'attendanceRate',
      label: 'Attendance Rate',
      headerStyle: withColumnWidth('14%', 100),
      cellStyle: withColumnWidth('14%', 100),
      renderCell: ({ row }) => row.attendanceRate
    }
  ], []);

  // --- Row class for pending highlight ---
  const rowClassName = (row) => styles.attendanceTableRow;

  return (
    <Table
      columns={columns}
      rows={attendanceRows}
      getRowId={row => row.id}
      loading={loading}
      error={error ? `Error: ${error}` : ''}
      emptyMessage={loading ? 'Loading attendance data...' : 'No attendance data found for this class.'}
      tableLabel="Class Attendance Report"
      striped={true}
      stickyHeader={true}
      rowClassName={rowClassName}
      wrapperClassName={styles.modalTableScroll}
    />
  );
};

export default ClassAttendanceReportTable;
