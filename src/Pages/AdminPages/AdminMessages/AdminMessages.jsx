import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminMessages.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import MessageTable from '../../../Components/Tables/MessageTable/MessageTable.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import MessageIcon from '@mui/icons-material/Message';
import DateSelector from '../../../Components/UI/Buttons/DateSelector/DateSelector.jsx';
import { supabase } from '../../../lib/supabase';

function AdminMessages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [currentGrade, setCurrentGrade] = useState('all');
  const [loading, setLoading] = useState(false);
  
  // Date filtering only
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
      // Get unique dates from sms_logs table
      const { data: smsDates, error } = await supabase
        .from('sms_logs')
        .select('sent_at')
        .order('sent_at', { ascending: false })
        .limit(100); // Limit to recent logs

      if (error) throw error;

      // Extract unique dates (YYYY-MM-DD format) - PH time
      const uniqueDates = [...new Set(smsDates?.map(item => {
        const date = new Date(item.sent_at);
        const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
        return phDate.toISOString().split('T')[0];
      }) || [])];

      // Get today's date in PH time
      const today = getCurrentPhilippinesDate();
      
      // Combine today's date with existing dates
      // Remove duplicates and ensure today is first
      const allDates = [...new Set([today, ...uniqueDates])];
      
      // Sort by date (newest first)
      allDates.sort((a, b) => new Date(b) - new Date(a));

      setAvailableDates(allDates);

      // Set default to today
      setSelectedDate(today);
      
    } catch (err) {
      console.error('Error fetching dates:', err);
      // Still show today even if fetch fails
      const today = getCurrentPhilippinesDate();
      setAvailableDates([today]);
      setSelectedDate(today);
    } finally {
      setDatesLoading(false);
    }
  }, [getCurrentPhilippinesDate]);

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
      <SectionLabel label="Notification Records" />
      
      <div className={styles.top}>
        <div className={styles.searchAndFilter}>
          <div className={styles.searchContainer}>
            <Input 
              placeholder="Search SMS Messages" 
              value={searchTerm}
              onChange={handleSearchChange}
              search="true"
            />
          </div>
          
          {/* Date Filter only */}
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

      <MessageTable
        searchTerm={searchTerm}
        selectedSection={selectedSection}
        onSectionsUpdate={handleSectionsUpdate}
        onGradeUpdate={handleGradeUpdate}
        onClearSectionFilter={handleClearSectionFilter}
        onSectionSelect={handleSectionSelect}
        availableSections={availableSections}
        loading={loading}
        // Pass date filter only
        selectedDate={selectedDate}
      />
    </main>
  );
}

export default AdminMessages;