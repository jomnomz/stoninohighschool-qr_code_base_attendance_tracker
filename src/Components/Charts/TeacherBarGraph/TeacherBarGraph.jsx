import React from 'react';
import styles from './TeacherBarGraph.module.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTeacherClassAttendance } from '../../Hooks/useTeacherClassAttendance';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TeacherBarGraph = ({ teacherId, teacherClasses }) => {
  const { classStats, loading } = useTeacherClassAttendance(teacherId, teacherClasses);

  const calculatePercentages = () => {
    return classStats.map(stat => {
      const total = stat.total || 0;
      const presentPercent = total > 0 ? Math.round((stat.present / total) * 100) : 0;
      const latePercent = total > 0 ? Math.round((stat.late / total) * 100) : 0;
      const absentPercent = total > 0 ? Math.round((stat.absent / total) * 100) : 0;
      
      return {
        className: stat.className,
        present: presentPercent,
        late: latePercent,
        absent: absentPercent,
        presentCount: stat.present,
        lateCount: stat.late,
        absentCount: stat.absent,
        total: total
      };
    });
  };

  const percentageData = calculatePercentages();
  const classLabels = percentageData.map(stat => stat.className);

  const data = {
    labels: classLabels,
    datasets: [
      {
        label: 'Present',
        data: percentageData.map(stat => stat.present),
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
        borderWidth: 1,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        label: 'Late',
        data: percentageData.map(stat => stat.late),
        backgroundColor: '#FFC107',
        borderColor: '#FFC107',
        borderWidth: 1,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        label: 'Absent',
        data: percentageData.map(stat => stat.absent),
        backgroundColor: '#F44336',
        borderColor: '#F44336',
        borderWidth: 1,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { 
          font: { size: 11 },
          callback: function(value) {
            const label = this.getLabelForValue(value);
            return label.length > 12 ? label.substring(0, 10) + '..' : label;
          }
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
        }
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
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            const dataIndex = context.dataIndex;
            const classStat = percentageData[dataIndex];
            
            let count = 0;
            if (label === 'Present') count = classStat?.presentCount || 0;
            else if (label === 'Late') count = classStat?.lateCount || 0;
            else if (label === 'Absent') count = classStat?.absentCount || 0;
            
            const studentText = count === 1 ? 'student' : 'students';
            return `${label}: ${value}% (${count} ${studentText})`;
          },
          title: function(tooltipItems) {
            const index = tooltipItems[0].dataIndex;
            const classStat = percentageData[index];
            return `${classStat.className} - Total: ${classStat.total} students`;
          }
        }
      }
    }
  };

  return (
    <div className={styles.teacherBarGraph}>
      <h3 className={styles.graphTitle}>Attendance Overview | By Class</h3>
      <div className={styles.chartWrapper}>
        {loading ? (
          <div className={styles.loading}>Loading class data...</div>
        ) : classStats.length === 0 ? (
          <div className={styles.noData}>No classes assigned</div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  );
};

export default TeacherBarGraph;