import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import styles from './TeacherLineChart.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTeacherClassAttendance } from '../../Hooks/useTeacherClassAttendance';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TeacherLineChart = ({ teacherId, teacherClasses }) => {
  const [currentStatus, setCurrentStatus] = useState('present');
  const { weeklyStats, loading } = useTeacherClassAttendance(teacherId, teacherClasses);

  const classColors = [
    '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#FF5722', '#00BCD4', '#795548'
  ];

  const getChartData = () => {
    if (!weeklyStats || !weeklyStats.dates || weeklyStats.dates.length === 0) {
      return { labels: [], datasets: [] };
    }

    const statusDataKey = currentStatus;
    const statusLabels = weeklyStats[statusDataKey]?.labels || [];
    const statusData = weeklyStats[statusDataKey]?.data || [];
    const studentTotalsData = weeklyStats.totalStudents?.data || [];
    
    const percentageDatasets = statusLabels.map((className, classIndex) => {
      const rawCounts = statusData[classIndex] || [];
      const studentTotals = studentTotalsData[classIndex] || [];
      
      const percentageData = rawCounts.map((count, dayIndex) => {
        const total = studentTotals[dayIndex] || 0;
        return total > 0 ? Math.round((count / total) * 100) : 0;
      });

      return {
        label: className,
        data: percentageData,
        rawCounts: rawCounts, 
        studentTotals: studentTotals, 
        borderColor: classColors[classIndex % classColors.length],
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: classColors[classIndex % classColors.length],
        clip: false // Prevents point clipping at 100%
      };
    });

    return {
      labels: weeklyStats.dates,
      datasets: percentageDatasets
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, right: 10 }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25,
          font: { size: 10 },
          callback: (value) => value + '%'
        },
        grid: { color: '#f0f0f0' }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11 },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataset = context.dataset;
            const dataIndex = context.dataIndex;
            const hasRecords = weeklyStats.hasRecords?.[dataIndex];
            
            if (hasRecords === false) {
              return context.datasetIndex === 0 ? 'No attendance data' : null;
            }
            
            const percentage = context.raw || 0;
            const rawCount = dataset.rawCounts?.[dataIndex] || 0;
            const totalStudents = dataset.studentTotals?.[dataIndex] || 0;
            const studentText = rawCount === 1 ? 'student' : 'students';
            
            return `${dataset.label}: ${percentage}% (${rawCount}/${totalStudents} ${studentText})`;
          }
        }
      }
    },
    elements: {
      point: { radius: 3, hoverRadius: 6 }
    }
  };

  const hasData = weeklyStats && weeklyStats[currentStatus]?.data?.length > 0;

  return (
    <div className={styles.teacherLineChartContainer}>
      <h3 className={styles.graphTitle}>Attendance Performance | Past 5 Days</h3>
      
      <div className={styles.chartToggle}>
        <button 
          className={currentStatus === 'present' ? styles.active : ''}
          onClick={() => setCurrentStatus('present')}
        >Present</button>
        <button 
          className={currentStatus === 'late' ? styles.active : ''}
          onClick={() => setCurrentStatus('late')}
        >Late</button>
        <button 
          className={currentStatus === 'absent' ? styles.active : ''}
          onClick={() => setCurrentStatus('absent')}
        >Absent</button>
      </div>
      
      <div className={styles.chartWrapper}>
        {loading ? (
          <div className={styles.loading}>Loading trend data...</div>
        ) : !hasData ? (
          <div className={styles.noData}>No attendance data available</div>
        ) : (
          <Line data={getChartData()} options={options} />
        )}
      </div>
    </div>
  );
};

export default TeacherLineChart;