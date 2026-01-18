import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatStudentName, formatNA } from '../../../Utils/Formatters';
import { sortEntities } from '../../../Utils/SortEntities';
import styles from './TeacherAttendanceTable.module.css';
import { supabase } from '../../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faSearch } from '@fortawesome/free-solid-svg-icons';
import Input from '../../../Components/UI/Input/Input.jsx';

const TeacherAttendanceTable = ({ 
  className,
  subject
}) => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayDate, setDisplayDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [datesLoading, setDatesLoading] = useState(false);

  // Get current Philippine date in YYYY-MM-DD format
  const getCurrentPhilippinesDate = useCallback(() => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split('T')[0];
  }, []);

  // Get Philippine date for display
  const getPhilippinesDisplayDate = useCallback(() => {
    const dateToUse = selectedDate || getCurrentPhilippinesDate();
    const date = new Date(dateToUse + 'T00:00:00Z');
    const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDate, getCurrentPhilippinesDate]);

  // Get current date for database queries (assuming dates in database are Philippine dates)
  const getCurrentDatabaseDate = useCallback(() => {
    if (selectedDate) {
      return selectedDate;
    }
    
    // Return Philippine date for database query
    return getCurrentPhilippinesDate();
  }, [selectedDate, getCurrentPhilippinesDate]);

  // Parse class name to extract grade and section
  const parseClassName = useCallback((className) => {
    if (!className) return { grade: null, section: null };
    
    const match = className.match(/^(\d+)[-\s](.+)$/);
    if (match) {
      return { 
        grade: match[1].trim(), 
        section: match[2].trim() 
      };
    }
    
    return { grade: null, section: null };
  }, []);

  // Find the correct section ID based on grade and section name
  const findSectionId = useCallback(async (grade, sectionName) => {
    try {
      // Get grade ID first
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('id')
        .eq('grade_level', parseInt(grade))
        .single();

      if (gradeError || !gradeData) {
        console.error('Error finding grade:', gradeError);
        return null;
      }

      // Get section ID using grade_id AND section_name
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('id')
        .eq('grade_id', gradeData.id)
        .eq('section_name', sectionName)
        .single();

      if (sectionError || !sectionData) {
        console.error('Error finding section:', sectionError);
        return null;
      }

      return sectionData.id;
    } catch (err) {
      console.error('Error in findSectionId:', err);
      return null;
    }
  }, []);

  // Fetch available dates for this class
  const fetchAvailableDates = useCallback(async () => {
    if (!className) return;

    setDatesLoading(true);
    try {
      const { grade, section } = parseClassName(className);
      
      if (!grade || !section) {
        console.error('Invalid class name format:', className);
        return;
      }

      // Find section ID
      const sectionId = await findSectionId(grade, section);
      if (!sectionId) {
        setAvailableDates([]);
        return;
      }

      // Get students in this section
      const { data: classStudents, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('section_id', sectionId);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        setAvailableDates([]);
        return;
      }

      if (!classStudents || classStudents.length === 0) {
        setAvailableDates([]);
        return;
      }

      const studentIds = classStudents.map(s => s.id);
      
      // Get unique dates where attendance exists for these students
      const { data: attendanceDates, error: datesError } = await supabase
        .from('attendance')
        .select('date')
        .in('student_id', studentIds)
        .order('date', { ascending: false });

      if (datesError) throw datesError;

      // Extract unique dates (assuming they're already in Philippine time)
      const uniqueDates = [...new Set(attendanceDates?.map(item => item.date) || [])];
      setAvailableDates(uniqueDates);

    } catch (err) {
      console.error('Error fetching dates:', err);
      setAvailableDates([]);
    } finally {
      setDatesLoading(false);
    }
  }, [className, parseClassName, findSectionId]);

  // Fetch attendance data
  const fetchClassAttendance = useCallback(async () => {
    if (!className) {
      setError('No class name provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const todayDate = getCurrentDatabaseDate();
      const { grade, section } = parseClassName(className);
      
      if (!grade || !section) {
        throw new Error(`Invalid class name format: ${className}`);
      }
      
      // Find section ID using grade AND section name
      const sectionId = await findSectionId(grade, section);
      if (!sectionId) {
        throw new Error(`Section "${section}" in Grade ${grade} not found`);
      }

      // Get students in this section
      const { data: classStudents, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          lrn,
          first_name,
          last_name,
          middle_name,
          grade_id,
          section_id
        `)
        .eq('section_id', sectionId)
        .order('last_name')
        .order('first_name');

      if (studentsError) throw studentsError;

      if (!classStudents || classStudents.length === 0) {
        setAttendances([]);
        setLoading(false);
        return;
      }

      // Get attendance records for the selected date
      const studentIds = classStudents.map(s => s.id);
      
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', todayDate)
        .in('student_id', studentIds);

      if (attendanceError) throw attendanceError;

      // Transform data
      const attendanceMap = new Map();
      attendanceRecords?.forEach(record => {
        attendanceMap.set(record.student_id, record);
      });

      const transformedData = classStudents.map(student => {
        const attendance = attendanceMap.get(student.id);
        
        if (attendance) {
          return {
            id: attendance.id,
            lrn: student.lrn,
            first_name: student.first_name,
            last_name: student.last_name,
            middle_name: student.middle_name,
            time_in: attendance.time_in,
            time_out: attendance.time_out,
            date: attendance.date,
            status: attendance.status || 'present',
            student_lrn: student.lrn,
            student_id: student.id
          };
        } else {
          return {
            id: `${student.id}-${todayDate}`,
            lrn: student.lrn,
            first_name: student.first_name,
            last_name: student.last_name,
            middle_name: student.middle_name,
            time_in: null,
            time_out: null,
            date: todayDate,
            status: 'absent',
            student_lrn: student.lrn,
            student_id: student.id
          };
        }
      });

      setAttendances(transformedData);
      setDisplayDate(getPhilippinesDisplayDate());
      
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError(err.message);
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  }, [className, getCurrentDatabaseDate, getPhilippinesDisplayDate, parseClassName, findSectionId, getCurrentPhilippinesDate]);

  // Format time display - SIMPLE VERSION (no timezone conversion needed)
  const formatTimeDisplay = useCallback((timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      // Time is already in Philippine time in the database
      const [hours, minutes] = timeString.split(':').map(Number);
      
      // Format as 12-hour time
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      
      return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error, timeString);
      return timeString;
    }
  }, []);

  // Format status with styling
  const formatStatusWithStyle = useCallback((status) => {
    let className = styles.status;
    let displayText = 'Absent';
    
    switch(status?.toLowerCase()) {
      case 'present':
        className += ` ${styles.statusPresent}`;
        displayText = 'Present';
        break;
      case 'late':
        className += ` ${styles.statusLate}`;
        displayText = 'Late';
        break;
      case 'absent':
        className += ` ${styles.statusAbsent}`;
        displayText = 'Absent';
        break;
      default:
        className += ` ${styles.statusAbsent}`;
    }
    
    return { className, text: displayText };
  }, []);

  // Handle date selection
  const handleDateSelect = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  // Check if a date is today in Philippine time
  const isToday = useCallback((dateString) => {
    if (!dateString) return false;
    const todayPhilippines = getCurrentPhilippinesDate();
    return dateString === todayPhilippines;
  }, [getCurrentPhilippinesDate]);

  // Filter and sort attendances
  const filteredAttendances = useMemo(() => {
    let filtered = attendances;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(attendance => {
        const fullName = `${attendance.first_name || ''} ${attendance.last_name || ''} ${attendance.middle_name || ''}`.toLowerCase();
        const lrn = attendance.lrn?.toLowerCase() || '';
        return fullName.includes(searchLower) || lrn.includes(searchLower);
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(attendance => 
        attendance.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    return sortEntities(filtered, { type: 'student' });
  }, [attendances, searchTerm, statusFilter]);

  // Calculate statistics based on filtered data
  const stats = useMemo(() => {
    const total = filteredAttendances.length;
    const present = filteredAttendances.filter(a => a.status === 'present').length;
    const late = filteredAttendances.filter(a => a.status === 'late').length;
    const absent = filteredAttendances.filter(a => a.status === 'absent').length;
    
    return { total, present, late, absent };
  }, [filteredAttendances]);

  // Initial fetch and subscribe to changes
  useEffect(() => {
    if (className) {
      fetchClassAttendance();
      fetchAvailableDates();
      
      const channel = supabase
        .channel(`attendance-${className}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance'
          },
          () => {
            fetchClassAttendance();
            fetchAvailableDates();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [className, fetchClassAttendance, fetchAvailableDates]);

  // Re-fetch when date changes
  useEffect(() => {
    if (className && selectedDate !== undefined) {
      fetchClassAttendance();
    }
  }, [selectedDate, className, fetchClassAttendance]);

  // Render loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading attendance for {className}...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error Loading Attendance</h3>
          <p>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={fetchClassAttendance}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header - 3 Columns */}
      <div className={styles.headerGrid}>
        <div className={styles.headerColumn}>
          <h2 className={styles.className}>{className}</h2>
        </div>
        <div className={styles.headerColumn}>
          {subject && <p className={styles.subject}>{subject}</p>}
        </div>
        <div className={styles.headerColumn}>
          <p className={styles.date}>Date: {displayDate}</p>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className={styles.filterRow}>
        <div className={styles.searchContainer}>
          <Input
            placeholder="Search students by name or LRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            search={true}
          />
        </div>
        
        <div className={styles.filterContainer}>
          <div className={styles.statusFilter}>
            <label htmlFor="statusFilter" className={styles.filterLabel}>
              Filter by Status:
            </label>
            <select
              id="statusFilter"
              className={styles.statusSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        <div className={styles.dateSelectorContainer}>
          <div className={styles.dateSelector}>
            <FontAwesomeIcon icon={faCalendarDays} className={styles.dateIcon} />
            <span className={styles.dateLabel}>Viewing:</span>
            <div className={`${styles.currentDateIndicator} ${!selectedDate || isToday(selectedDate) ? styles.currentDateIndicatorActive : ''}`}>
              {!selectedDate || isToday(selectedDate) ? 'Today' : 'Past Date'}
            </div>
            <select
              className={styles.dateSelect}
              value={selectedDate || getCurrentPhilippinesDate()}
              onChange={(e) => {
                handleDateSelect(e.target.value);
              }}
              disabled={datesLoading}
            >
              {availableDates.map(date => {
                const dateObj = new Date(date + 'T00:00:00Z');
                const phDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
                const formattedDate = phDate.toLocaleDateString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                const isDateToday = isToday(date);
                
                return (
                  <option key={date} value={date}>
                    {formattedDate} {isDateToday ? '(Today)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className={styles.statsContainer}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Students:</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Present:</span>
          <span className={`${styles.statValue} ${styles.present}`}>
            {stats.present}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Late:</span>
          <span className={`${styles.statValue} ${styles.late}`}>
            {stats.late}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Absent:</span>
          <span className={`${styles.statValue} ${styles.absent}`}>
            {stats.absent}
          </span>
        </div>
      </div>

      {/* Attendance Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.attendanceTable}>
            <thead>
              <tr>
                <th className={`${styles.lrnColumn} ${styles.tableHeader}`}>LRN</th>
                <th className={`${styles.nameColumn} ${styles.tableHeader}`}>STUDENT NAME</th>
                <th className={`${styles.timeColumn} ${styles.tableHeader}`}>TIME IN</th>
                <th className={`${styles.timeColumn} ${styles.tableHeader}`}>TIME OUT</th>
                <th className={`${styles.statusColumn} ${styles.tableHeader}`}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.noData}>
                    {attendances.length === 0 
                      ? `No students found in class ${className}`
                      : 'No students match your search criteria'}
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((attendance, index) => {
                  const statusInfo = formatStatusWithStyle(attendance.status);
                  
                  return (
                    <tr 
                      key={attendance.id} 
                      className={index % 2 === 0 ? styles.rowEven : styles.rowOdd}
                    >
                      <td className={`${styles.lrnCell} ${styles.tableCell}`}>{formatNA(attendance.lrn)}</td>
                      <td className={`${styles.nameCell} ${styles.tableCell}`}>{formatStudentName(attendance)}</td>
                      <td className={`${styles.timeCell} ${styles.tableCell}`}>{formatTimeDisplay(attendance.time_in)}</td>
                      <td className={`${styles.timeCell} ${styles.tableCell}`}>{formatTimeDisplay(attendance.time_out)}</td>
                      <td className={`${styles.statusCell} ${styles.tableCell}`}>
                        <span className={statusInfo.className}>
                          {statusInfo.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendanceTable;