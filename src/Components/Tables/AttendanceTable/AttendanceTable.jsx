import React, { useState, useEffect, useMemo } from 'react';
import { useRowExpansion } from '../../hooks/useRowExpansion'; 
import { grades, shouldHandleRowClick } from '../../../Utils/tableHelpers';
import { formatStudentName, formatDate, formatNA, formatAttendanceStatus } from '../../../Utils/Formatters'; 
import { sortEntities } from '../../../Utils/SortEntities'; 
import Button from '../../UI/Buttons/Button/Button';
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';
import styles from './AttendanceTable.module.css';
import { useAttendance } from '../../Hooks/useAttendance';

const AttendanceTable = ({
  searchTerm = '',
  selectedSection = '',
  onSectionsUpdate,
  onGradeUpdate,
  onClearSectionFilter,
  onSectionSelect,
  availableSections = [],
  loading: parentLoading = false
}) => {
  const { 
    currentClass,
    attendances,
    loading: attendanceLoading,
    error,
    currentDate,
    changeClass,
    refreshAttendance
  } = useAttendance();
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();

  // Format time for display
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      
      const date = new Date();
      date.setHours(hours, minutes, seconds);
      
      return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return timeString;
    }
  };

  // Format time without seconds for cleaner display
  const formatTimeDisplayShort = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      
      const date = new Date();
      date.setHours(hours, minutes);
      
      return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return timeString;
    }
  };

  const handleClassChange = (className) => {
    changeClass(className);
    toggleRow(null);
  };

  const handleSectionFilter = (section) => {
    if (onSectionSelect) {
      onSectionSelect(section);
    }
  };

  const handleRowClick = (attendanceId, e) => {
    if (shouldHandleRowClick(false, e.target)) {
      toggleRow(attendanceId);
    }
  };

  const formatStatusWithStyle = (status) => {
    const baseClass = styles.status;
    let statusClass;
    
    switch (status) {
      case 'present':
        statusClass = styles.statusPresent;
        break;
      case 'late':
        statusClass = styles.statusLate;
        break;
      case 'absent':
        statusClass = styles.statusAbsent;
        break;
      default:
        statusClass = styles.statusAbsent;
    }
    
    return {
      text: formatAttendanceStatus(status),
      className: `${baseClass} ${statusClass}`
    };
  };

  // Get unique sections from current attendances
  const allUniqueSections = useMemo(() => {
    const sections = attendances
      .map(attendance => attendance.section || '')
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort();
  }, [attendances]);

  // Sort and filter attendances
  const sortedAttendances = useMemo(() => {
    let filtered = sortEntities(attendances, { type: 'student' });
    
    // Apply grade filter (already handled by useAttendance, but just in case)
    if (currentClass !== 'all') {
      filtered = filtered.filter(attendance => attendance.grade === currentClass);
    }
    
    // Apply section filter
    if (selectedSection) {
      filtered = filtered.filter(attendance => attendance.section === selectedSection);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(attendance => 
        attendance.lrn?.toLowerCase().includes(searchLower) ||
        attendance.first_name?.toLowerCase().includes(searchLower) ||
        attendance.last_name?.toLowerCase().includes(searchLower) ||
        attendance.grade?.toString().toLowerCase().includes(searchLower) ||
        attendance.section?.toString().toLowerCase().includes(searchLower) ||
        attendance.status?.toLowerCase().includes(searchLower) ||
        attendance.scan_type?.toLowerCase().includes(searchLower)
      );
    }
    
    console.log(`🔍 Filtered attendances: ${filtered.length} (from ${attendances.length} total)`);
    return filtered;
  }, [attendances, currentClass, selectedSection, searchTerm]);

  useEffect(() => {
    if (onSectionsUpdate) {
      onSectionsUpdate(allUniqueSections);
    }
  }, [allUniqueSections, onSectionsUpdate]);

  useEffect(() => {
    if (onGradeUpdate) {
      onGradeUpdate(currentClass);
    }
  }, [currentClass, onGradeUpdate]);

  const renderExpandedRow = (attendance) => {
    const statusInfo = formatStatusWithStyle(attendance.status);
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(attendance.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="9">
          <div 
            className={`${styles.attendanceCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.attendanceHeader}>
              {formatStudentName(attendance)}
            </div>
            <div className={styles.studentInfo}>
              <strong>Attendance Details</strong>
            </div>
            <div className={styles.attendanceInfo}>LRN: {formatNA(attendance.lrn)}</div>
            <div className={styles.attendanceInfo}>Full Name: {formatStudentName(attendance)}</div>
            <div className={styles.attendanceInfo}>Grade & Section: {attendance.grade} - {attendance.section}</div>
            <div className={styles.attendanceInfo}>Time In: {formatTimeDisplay(attendance.time_in)}</div>
            <div className={styles.attendanceInfo}>Time Out: {formatTimeDisplay(attendance.time_out)}</div>
            <div className={styles.attendanceInfo}>Date: {formatDate(attendance.date)}</div>
            <div className={styles.attendanceInfo}>
              Status: <span className={statusInfo.className}>{statusInfo.text}</span>
            </div>
            <div className={styles.attendanceInfo}>
              Scan Type: {formatNA(attendance.scan_type)}
            </div>
            {attendance.created_at && (
              <div className={styles.attendanceInfo}>
                Record Created: {formatDate(attendance.created_at)}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderRow = (attendance, index) => {
    const visibleRowIndex = sortedAttendances
      .slice(0, index)
      .filter(a => !isRowExpanded(a.id))
      .length;
    
    const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;
    const statusInfo = formatStatusWithStyle(attendance.status);

    return (
      <React.Fragment key={attendance.id}>
        {!isRowExpanded(attendance.id) && (
          <tr 
            className={`${styles.studentRow} ${rowColorClass}`}
            onClick={(e) => handleRowClick(attendance.id, e)}
          >
            <td>{formatNA(attendance.lrn)}</td>
            <td>{formatNA(attendance.first_name)}</td>
            <td>{formatNA(attendance.last_name)}</td>
            <td>{attendance.grade}</td>
            <td>{attendance.section}</td>
            <td>{formatTimeDisplayShort(attendance.time_in)}</td>
            <td>{formatTimeDisplayShort(attendance.time_out)}</td>
            <td>{formatDate(attendance.date)}</td>
            <td>
              <span className={statusInfo.className}>
                {statusInfo.text}
              </span>
            </td>
          </tr>
        )}
        {renderExpandedRow(attendance)}
      </React.Fragment>
    );
  };

  const getTableInfoMessage = () => {
    const attendanceCount = sortedAttendances.length;
    
    let message = '';
    
    if (selectedSection) {
      message = `Showing ${attendanceCount} attendance records in Section ${selectedSection}`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
      
      if (searchTerm) {
        message += ` matching "${searchTerm}"`;
      }
    } else if (searchTerm) {
      message = `Found ${attendanceCount} attendance records matching "${searchTerm}"`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
    } else {
      if (currentClass === 'all') {
        message = `Showing ${attendanceCount} attendance records across all grades`;
      } else {
        message = `Showing ${attendanceCount} attendance records in Grade ${currentClass}`;
      }
    }
    
    message += ` for ${currentDate || 'today'}`;
    
    return message;
  };

  if (parentLoading || attendanceLoading) {
    return (
      <div className={styles.attendanceTableContainer}>
        <div className={styles.loading}>Loading attendance records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.attendanceTableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.attendanceTableContainer} ref={tableRef}>
      <div className={styles.attendanceTable}>
        <div className={styles.classContainers}>
          <Button 
            label="All"
            tabBottom={true}
            height="xs"
            width="xs-sm"
            color="grades"
            active={currentClass === 'all'}
            onClick={() => handleClassChange('all')}
          >
            All
          </Button>
          
          {grades.map(grade => (
            <Button 
              key={grade}
              label={`Grade ${grade}`}
              tabBottom={true}
              height="xs"
              width="xs-sm"
              color="grades"
              active={currentClass === grade}
              onClick={() => handleClassChange(grade)}
            >
              Grade {grade}
            </Button>
          ))}

          <div className={styles.tableInfo}>
            <p>{getTableInfoMessage()}</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.attendancesTable}>
            <thead>
              <tr>
                <th>LRN</th>
                <th>FIRST NAME</th>
                <th>LAST NAME</th>
                <th>GRADE</th>
                <th>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderRow}>
                      <span>SECTION</span>
                      <SectionDropdown 
                        availableSections={allUniqueSections}
                        selectedValue={selectedSection}
                        onSelect={handleSectionFilter}
                      />
                    </div>
                  </div>
                </th>
                <th>TIME IN</th>
                <th>TIME OUT</th>
                <th>DATE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {sortedAttendances.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.noAttendance}>
                    {getTableInfoMessage()}
                  </td>
                </tr>
              ) : (
                sortedAttendances.map((attendance, index) => renderRow(attendance, index))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTable;