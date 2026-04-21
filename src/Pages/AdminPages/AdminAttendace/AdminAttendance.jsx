import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminAttendance.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import AttendanceTable from '../../../Components/Tables/AttendanceTable/AttendanceTable.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import DateSelector from '../../../Components/UI/Buttons/DateSelector/DateSelector.jsx';
import { supabase } from '../../../lib/supabase';

function AdminAttendance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [currentGrade, setCurrentGrade] = useState('all');
  const [loading, setLoading] = useState(false);
  
  // New state for date and status filtering
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [datesLoading, setDatesLoading] = useState(false);

  // Get current Philippine date
  const getCurrentPhilippinesDate = useCallback(() => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split('T')[0];
  }, []);

  // Fetch available dates from database
  const fetchAvailableDates = useCallback(async () => {
    setDatesLoading(true);
    try {
      // Get unique dates from attendance table
      const { data: attendanceDates, error } = await supabase
        .from('attendance')
        .select('date')
        .order('date', { ascending: false });

      if (error) throw error;

      // Extract unique dates
      const uniqueDates = [...new Set(attendanceDates?.map(item => item.date) || [])];
      setAvailableDates(uniqueDates);

      // Set default to today if not set
      if (!selectedDate && uniqueDates.length > 0) {
        const today = getCurrentPhilippinesDate();
        const todayExists = uniqueDates.includes(today);
        setSelectedDate(todayExists ? today : uniqueDates[0]);
      }
    } catch (err) {
      console.error('Error fetching dates:', err);
      setAvailableDates([]);
    } finally {
      setDatesLoading(false);
    }
  }, [selectedDate, getCurrentPhilippinesDate]);

  // Handle date selection
  const handleDateSelect = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  // Fetch dates on component mount
  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
  };

  const handleClearSectionFilter = () => {
    setSelectedSection('');
  };

  const handleSectionsUpdate = (sections) => {
    setAvailableSections(sections);
  };

  const handleGradeUpdate = (grade) => {
    setCurrentGrade(grade);
  };

  return (
    <main className={styles.main}>
      <SectionLabel label="Attendance Records" />
      
      <div className={styles.top}>
        <div className={styles.searchAndFilter}>
          <div className={styles.searchContainer}>
            <Input 
              placeholder="Search Attendance Records" 
              value={searchTerm}
              onChange={handleSearchChange}
              search="true"
            />
          </div>
          
          {/* Date and Status Filters next to search */}
          <div className={styles.filtersContainer}>
            <DateSelector
              availableDates={availableDates}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              loading={datesLoading}
              showTodayIndicator={true}
            />
          </div>
        </div>
      </div>

      <AttendanceTable
        searchTerm={searchTerm}
        selectedSection={selectedSection}
        onSectionsUpdate={handleSectionsUpdate}
        onGradeUpdate={handleGradeUpdate}
        onClearSectionFilter={handleClearSectionFilter}
        onSectionSelect={handleSectionSelect}
        availableSections={availableSections}
        loading={loading}
        selectedDate={selectedDate}
      />
    </main>
  );
}

export default AdminAttendance;