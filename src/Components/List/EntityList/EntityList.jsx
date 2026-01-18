import React from 'react';
import { 
  formatGradeSection,
  formatStudentDisplayName,
  formatTeacherDisplayName,
} from '../../../Utils/Formatters'; 
import styles from './EntityList.module.css';

function EntityList({ 
  entities = [], 
  maxHeight = "100px",
  title = "Entities included",
  showNumbers = true,
  variant = 'multiple',
  entityType = 'student' 
}) {
  if (entities.length === 0) {
    return null;
  }

  // Helper function to format GradeSection display (for grade sections)
  const formatGradeSectionDisplay = (gradeSection) => {
    if (!gradeSection) return '';
    
    // Check if gradeSection is already a formatted string or an object
    if (typeof gradeSection === 'string') {
      return gradeSection;
    }
    
    const grade = gradeSection.grade || gradeSection.grade_level || '';
    const section = gradeSection.section || gradeSection.section_name || '';
    const room = gradeSection.room;
    
    let display = '';
    if (grade && section) {
      display = `Grade ${grade} - ${section}`;
    } else if (grade) {
      display = `Grade ${grade}`;
    } else if (section) {
      display = section;
    }
    
    if (room && room !== 'N/A' && room !== '') {
      display += ` (Room ${room})`;
    }
    
    return display;
  };

  // Helper function to format Subject display
  const formatSubjectDisplay = (subject) => {
    if (!subject) return '';
    
    if (typeof subject === 'string') {
      return subject;
    }
    
    const code = subject.subject_code || subject.code || '';
    const name = subject.subject_name || subject.name || subject.displayName || '';
    
    if (code && name) {
      return `${code} - ${name}`;
    } else if (code) {
      return code;
    } else if (name) {
      return name;
    }
    
    return '';
  };

  // Helper function to format GradeSchedule display
  const formatGradeScheduleDisplay = (schedule) => {
    if (!schedule) return '';
    
    if (typeof schedule === 'string') {
      return schedule;
    }
    
    const grade = schedule.grade || schedule.grade_level || '';
    const startTime = schedule.class_start || '';
    const endTime = schedule.class_end || '';
    const gracePeriod = schedule.grace_period_minutes || 15;
    
    let display = '';
    if (grade) {
      display = `Grade ${grade}`;
    }
    
    if (startTime && endTime) {
      // Format time from "HH:MM:SS" to AM/PM format
      const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${period}`;
      };
      
      display += ` (${formatTime(startTime)} - ${formatTime(endTime)})`;
    }
    
    if (gracePeriod !== undefined && gracePeriod !== null) {
      display += ` • ${gracePeriod} min grace`;
    }
    
    return display;
  };

  const formatEntityDetails = (entity) => {
    switch (entityType) {
      case 'student':
        return {
          identifier: entity.lrn || '',
          name: formatStudentDisplayName(entity),
          details: formatGradeSection(entity)
        };
      
      case 'teacher':
        return {
          identifier: entity.employee_id || '',
          name: formatTeacherDisplayName(entity),
          details: entity.email_address || 'NA'
        };
      
      case 'subject':
        return {
          identifier: entity.subject_code || entity.code || '',
          name: entity.subject_name || entity.name || '',
          details: formatSubjectDisplay(entity)
        };
      
      case 'gradeSection':
      case 'section':
        return {
          identifier: `${entity.grade || entity.grade_level || ''}-${entity.section || entity.section_name || ''}`,
          name: formatGradeSectionDisplay(entity),
          details: entity.room && entity.room !== 'N/A' ? `Room ${entity.room}` : ''
        };
      
      case 'grade':
        return {
          identifier: `Grade ${entity.grade_level || entity.grade || ''}`,
          name: `Grade ${entity.grade_level || entity.grade || ''}`,
          details: entity.description || ''
        };
      
      case 'gradeSchedule':
      case 'schedule':
        return {
          identifier: `Grade ${entity.grade || entity.grade_level || ''} Schedule`,
          name: formatGradeScheduleDisplay(entity),
          details: entity.grace_period_minutes ? `${entity.grace_period_minutes} min grace period` : ''
        };
      
      case 'room':
        return {
          identifier: entity.room_number || entity.name || '',
          name: entity.name || entity.room_number || '',
          details: entity.description || entity.building || ''
        };
      
      default:
        // Try to intelligently guess the structure
        if (entity.lrn) {
          // Probably a student
          return {
            identifier: entity.lrn || '',
            name: formatStudentDisplayName(entity),
            details: formatGradeSection(entity)
          };
        } else if (entity.employee_id) {
          // Probably a teacher
          return {
            identifier: entity.employee_id || '',
            name: formatTeacherDisplayName(entity),
            details: entity.email_address || 'NA'
          };
        } else if (entity.subject_code) {
          // Probably a subject
          return {
            identifier: entity.subject_code || '',
            name: entity.subject_name || '',
            details: formatSubjectDisplay(entity)
          };
        } else if (entity.grade || entity.grade_level) {
          if (entity.section || entity.section_name) {
            // Probably a grade section
            return {
              identifier: `${entity.grade || entity.grade_level || ''}-${entity.section || entity.section_name || ''}`,
              name: formatGradeSectionDisplay(entity),
              details: entity.room && entity.room !== 'N/A' ? `Room ${entity.room}` : ''
            };
          } else if (entity.class_start || entity.class_end) {
            // Probably a grade schedule
            return {
              identifier: `Grade ${entity.grade || entity.grade_level || ''} Schedule`,
              name: formatGradeScheduleDisplay(entity),
              details: entity.grace_period_minutes ? `${entity.grace_period_minutes} min grace period` : ''
            };
          } else {
            // Probably just a grade
            return {
              identifier: `Grade ${entity.grade_level || entity.grade || ''}`,
              name: `Grade ${entity.grade_level || entity.grade || ''}`,
              details: entity.description || ''
            };
          }
        } else {
          // Fallback - try to use common fields
          return { 
            identifier: entity.id || entity.code || '',
            name: entity.name || entity.title || entity.displayName || 'Unnamed Entity',
            details: entity.description || entity.email || entity.info || ''
          };
        }
    }
  };

  const getTitle = () => {
    const entityTypeText = {
      student: 'Student',
      teacher: 'Teacher', 
      subject: 'Subject',
      gradeSection: 'Grade Section',
      section: 'Section',
      grade: 'Grade',
      gradeSchedule: 'Grade Schedule',
      schedule: 'Schedule',
      room: 'Room'
    }[entityType] || 'Entity';
    
    return `${title} (${entities.length} ${entityTypeText}${entities.length !== 1 ? 's' : ''}):`;
  };

  // Helper to determine what to display for each entity type
  const getEntityDisplayText = (details) => {
    switch (entityType) {
      case 'student':
        return `${details.identifier} | ${details.name} | ${details.details}`;
      
      case 'teacher':
        return `${details.identifier} | ${details.name} | ${details.details}`;
      
      case 'subject':
        return details.details || `${details.identifier} - ${details.name}`;
      
      case 'gradeSection':
      case 'section':
        return details.name;
      
      case 'grade':
        return details.name;
      
      case 'gradeSchedule':
      case 'schedule':
        return details.name;
      
      case 'room':
        return `${details.identifier}${details.details ? ` - ${details.details}` : ''}`;
      
      default:
        if (details.identifier && details.name) {
          return details.details 
            ? `${details.identifier} | ${details.name} | ${details.details}`
            : `${details.identifier} | ${details.name}`;
        } else {
          return details.name || details.identifier || 'Unknown Entity';
        }
    }
  };

  if (variant === 'single' && entities.length === 1) {
    const entity = entities[0];
    const details = formatEntityDetails(entity);
    return (
      <div className={styles.singleEntityContainer}>
        <div className={styles.singleEntityHeader}>
          {title || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}:`}
        </div>
        <div className={styles.singleEntityDetails}>
          {getEntityDisplayText(details)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.entityListContainer}>
      <div className={styles.listHeader}>
        {getTitle()}
      </div>
      <div className={styles.entityList} style={{ maxHeight }}>
        {entities.map((entity, index) => {
          const details = formatEntityDetails(entity);
          return (
            <div key={entity.id || entity._id || index} className={styles.entityItem}>
              {showNumbers && (
                <div className={styles.entityNumber}>{index + 1}.</div>
              )}
              <div className={styles.entityDetails}>
                <div className={styles.entityName}>
                  {getEntityDisplayText(details)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EntityList;