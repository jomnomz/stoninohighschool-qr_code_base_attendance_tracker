import React from 'react';
import { Line } from 'react-chartjs-2';
import styles from './LineChart.module.css'
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
import { useWeeklyAttendanceStats } from '../../Hooks/useWeeklyAttendanceStats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = ({ teacherId, teacherSections }) => {
  const { weeklyStats, loading } = useWeeklyAttendanceStats(teacherId, teacherSections);

  const generateDates = () => {
    const dates = [];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return dates;
  };

  const dates = loading ? generateDates() : weeklyStats.dates;
  const presentData = loading ? [0, 0, 0, 0, 0] : weeklyStats.present;
  const lateData = loading ? [0, 0, 0, 0, 0] : weeklyStats.late;
  const absentData = loading ? [0, 0, 0, 0, 0] : weeklyStats.absent;
  const presentCounts = loading ? [0, 0, 0, 0, 0] : weeklyStats.presentCounts;
  const lateCounts = loading ? [0, 0, 0, 0, 0] : weeklyStats.lateCounts;
  const absentCounts = loading ? [0, 0, 0, 0, 0] : weeklyStats.absentCounts;
  const hasRecords = loading ? [true, true, true, true, true] : weeklyStats.hasRecords;

  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Present',
        data: presentData,
        borderColor: '#4CAF50',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#4CAF50',
        clip: false // Prevents point clipping
      },
      {
        label: 'Late',
        data: lateData,
        borderColor: '#FFC107',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#FFC107',
        clip: false
      },
      {
        label: 'Absent',
        data: absentData,
        borderColor: '#F44336',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#F44336',
        clip: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10, // Gives the top points room to breathe
        right: 10
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          font: { size: 10 }
        }
      },
      y: {
                stacked: true,
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
          paddingBottom: 20, 
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataIndex = context.dataIndex;
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            if (hasRecords[dataIndex] === false) {
              return context.datasetIndex === 0 ? 'No attendance data' : null;
            }
            let count = 0;
            if (label === 'Present') count = presentCounts[dataIndex] || 0;
            else if (label === 'Late') count = lateCounts[dataIndex] || 0;
            else if (label === 'Absent') count = absentCounts[dataIndex] || 0;
            return `${label}: ${value}% (${count} students)`;
          }
        }
      }
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
        hitRadius: 10
      }
    }
  };

  return (
    <div className={styles.lineChartContainer}>
      <h3 className={styles.graphTitle}>Attendance Performance | Past 5 Days</h3>
      <div className={styles.chartWrapper}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default LineChart;