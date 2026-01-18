import styles from './AdminDashboard.module.css'
import BarGraph from "../../../Components/Charts/BarGraph/BarGraph.jsx";
import LineChart from "../../../Components/Charts/LineChart/LineChart.jsx";
import PieChart from "../../../Components/Charts/PieChart/PieChart.jsx";
import DashboardCard from "../../../Components/UI/Cards/DashboardCard/DashboardCard.jsx";
import SectionLabel from "../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx";
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import DateTodayLabel from "../../../Components/UI/Labels/DateTodayLabel/DateTodayLabel.jsx";
import { useSupabaseData } from '../../../Components/Hooks/fetchData.js'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faChalkboardUser,
  faUserCheck,
  faComments,
  faUserGraduate,
  faUserShield
} from "@fortawesome/free-solid-svg-icons";

import DashboardIcon from '@mui/icons-material/Dashboard';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import MessageIcon from '@mui/icons-material/Message';
import SchoolIcon from '@mui/icons-material/School';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

function AdminDashboard() {
  // Fetch students data
  const { data: students, loading: studentsLoading } = useSupabaseData('students');
  
  // Fetch teachers data
  const { data: teachers, loading: teachersLoading } = useSupabaseData('teachers');

  // State for SMS count
  const [smsCount, setSmsCount] = useState(0);
  const [smsLoading, setSmsLoading] = useState(true);
  const [smsError, setSmsError] = useState(null);

  // Get start and end of today in Philippine time (UTC+8)
  const getTodayPhilippinesTimeRange = useCallback(() => {
    const now = new Date();
    
    // Convert to Philippine time (UTC+8)
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // Start of day in Philippine time
    const startOfDay = new Date(phNow);
    startOfDay.setHours(0, 0, 0, 0);
    
    // End of day in Philippine time
    const endOfDay = new Date(phNow);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Convert back to UTC for database query
    const startUTC = new Date(startOfDay.getTime() - (8 * 60 * 60 * 1000));
    const endUTC = new Date(endOfDay.getTime() - (8 * 60 * 60 * 1000));
    
    return {
      start: startUTC.toISOString(),
      end: endUTC.toISOString()
    };
  }, []);

  // Fetch SMS logs count for today
  const fetchSmsCount = useCallback(async () => {
    setSmsLoading(true);
    setSmsError(null);
    
    try {
      const { start, end } = getTodayPhilippinesTimeRange();
      console.log('📱 Fetching SMS logs for today:', { start, end });
      
      // Get count of SMS logs for today (Philippine time)
      const { data, error, count } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact', head: false })
        .gte('sent_at', start)
        .lte('sent_at', end);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`✅ Found ${count || 0} SMS logs for today`);
      setSmsCount(count || 0);
      
    } catch (err) {
      console.error('❌ Error fetching SMS logs:', err);
      setSmsError(err.message);
      setSmsCount(0); // Default to 0 on error
    } finally {
      setSmsLoading(false);
    }
  }, [getTodayPhilippinesTimeRange]);

  // Count unique guardians (assuming each student has one guardian)
  const guardianCount = students?.reduce((unique, student) => {
    const guardianKey = `${student.guardian_first_name}-${student.guardian_last_name}-${student.guardian_phone_number}`;
    if (!unique.has(guardianKey)) {
      unique.add(guardianKey);
    }
    return unique;
  }, new Set()).size;

  // Count teachers with accounts (status = 'active')
  const teachersWithAccounts = teachers?.filter(teacher => teacher.status === 'active').length || 0;

  // Total teachers count
  const totalTeachers = teachers?.length || 0;

  // Fetch SMS count on component mount
  useEffect(() => {
    fetchSmsCount();
    
    // Set up a refresh interval to update SMS count periodically (every 5 minutes)
    const intervalId = setInterval(fetchSmsCount, 5 * 60 * 1000);
    
    // Set up real-time subscription for SMS logs
    const channel = supabase
      .channel('sms-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_logs'
        },
        (payload) => {
          console.log('📬 New SMS log inserted:', payload);
          // Refresh SMS count when new logs are added
          fetchSmsCount();
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [fetchSmsCount]);

  const isLoading = studentsLoading || teachersLoading || smsLoading;

  if (isLoading) return <div>Loading dashboard...</div>;

  return (
    <>
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <PageLabel icon={<DashboardIcon sx={{ fontSize: 50, mb: -0.7 }}  />} label="Dashboard"></PageLabel>
          <DateTodayLabel></DateTodayLabel>    
        </div>
        <SectionLabel label="Registered Users"></SectionLabel>
        <div className={styles.cards}>
          {/* Students Card */}
          <DashboardCard  
            colors={{bg: '#FF6B6B'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faUserGraduate} /> Students
              </div>
              <div className={styles.number}>{students?.length || 0}</div>
            </div>
          </DashboardCard>

          {/* Guardians Card */}
          <DashboardCard  
            colors={{bg: '#4ECDC4'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faUserShield} /> Guardians
              </div>
              <div className={styles.number}>{guardianCount || 0}</div>
            </div>
          </DashboardCard>

          {/* Total Teachers Card */}
          <DashboardCard 
            colors={{bg: '#FFD166'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faChalkboardUser} /> Total Teachers
              </div>
              <div className={styles.number}>{totalTeachers}</div>             
            </div>
          </DashboardCard>

          {/* Teachers with Accounts Card */}
          <DashboardCard 
            colors={{bg: '#06D6A0'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <FontAwesomeIcon icon={faUserCheck} /> Teacher Accounts
              </div>
              <div className={styles.number}>{teachersWithAccounts}</div>             
            </div>
          </DashboardCard>

          {/* SMS Sent Today Card */}
          <DashboardCard 
            colors={{bg: '#118AB2'}}
          >
            <div className={styles.card}>
              <div className={styles.label}>
                <MessageIcon sx={{ mb: -0.5 }}/> SMS Sent Today
              </div>
              <div className={styles.number}>
                {smsError ? (
                  <span className={styles.errorText}>Error</span>
                ) : (
                  smsCount.toLocaleString()
                )}
              </div>
              {smsError && (
                <div className={styles.smsError}>
                  <small>{smsError}</small>
                </div>
              )}
              {!smsError && !smsLoading && (
                <div className={styles.smsTimestamp}>
                  <small>As of {new Date().toLocaleTimeString('en-PH', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: 'Asia/Manila'
                  })}</small>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
        <SectionLabel label="Statistics"></SectionLabel>
        <div className={styles.charts}>
          <BarGraph></BarGraph>
          <PieChart></PieChart>
          <LineChart></LineChart>
        </div>
      </main>
    </>
  )
}

export default AdminDashboard;