import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../Modal/Modal';
import ClassAttendanceReportTable from '../../Tables/ClassAttendanceReportTable/ClassAttendanceReportTable.jsx';
import Button from '../../UI/Buttons/Button/Button.jsx';
import { exportClassAttendanceReportToExcel } from '../../../Utils/exportEntity';
import styles from './ClassAttendanceReportModal.module.css';

const ClassAttendanceReportModal = ({ isOpen, onClose, currentClass }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  // Parse grade and section from currentClass (e.g., "7-A")
  const parseClassName = (className) => {
    const match = className?.match(/^(\d+)[-\s](.+)$/);
    if (match) {
      return { grade: match[1], section: match[2] };
    }
    return { grade: null, section: null };
  };


  // Month navigation helpers
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      let month = prev.month - 1;
      let year = prev.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
      return { month, year };
    });
  };
  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      let month = prev.month + 1;
      let year = prev.year;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      return { month, year };
    });
  };
  const handleMonthDropdown = (e) => {
    setSelectedMonth(prev => ({ ...prev, month: Number(e.target.value) }));
  };

  // Section label
  const { grade, section } = parseClassName(currentClass);
  const sectionLabel = grade && section ? `Grade ${grade} - ${section}` : '';


  // Shared attendance data state for both table and export
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loading, setLoading] = useState(false);


  const handleExport = () => {
    exportClassAttendanceReportToExcel({
      attendanceRows,
      selectedMonth: selectedMonth.month,
      year: selectedMonth.year,
      className: currentClass
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xxl">
      <h2 className={styles.modalTitle}>Class Attendance Report</h2>
      {sectionLabel && <div className={styles.sectionLabel}>{sectionLabel}</div>}
      <div className={styles.monthSelectorRow}>
        <button className={styles.monthNavButton} onClick={handlePrevMonth} aria-label="Previous Month">&#60;</button>
        <select className={styles.monthDropdown} value={selectedMonth.month} onChange={handleMonthDropdown}>
          {monthNames.map((name, idx) => (
            <option key={name} value={idx}>{name} {selectedMonth.year}</option>
          ))}
        </select>
        <button className={styles.monthNavButton} onClick={handleNextMonth} aria-label="Next Month">&#62;</button>
        <Button
          label={loading ? 'Exporting...' : 'Export'}
          onClick={handleExport}
          disabled={loading || attendanceRows.length === 0}
          height="sm"
          width="xs-sm"
          color="primary"
          style={{ marginLeft: 'auto' }}
        />
      </div>
      <ClassAttendanceReportTable
        currentClass={currentClass}
        selectedMonth={selectedMonth}
        attendanceRows={attendanceRows}
        setAttendanceRows={setAttendanceRows}
        loading={loading}
        setLoading={setLoading}
      />
    </Modal>
  );
};

export default ClassAttendanceReportModal;
