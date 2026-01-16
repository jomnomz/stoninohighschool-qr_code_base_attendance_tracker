import React, { useState, useEffect, useMemo } from 'react';
import { formatStudentName, formatNA } from '../../../Utils/Formatters';
import { sortEntities } from '../../../Utils/SortEntities';
import styles from './TeacherStudentViewTable.module.css';
import { supabase } from '../../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../Authentication/AuthProvider/AuthProvider';
import { useRowExpansion } from '../../hooks/useRowExpansion';
import Input from '../../UI/Input/Input';
import Button from '../../UI/Buttons/Button/Button';

const TeacherStudentViewTable = () => {
  const [students, setStudents] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [currentClass, setCurrentClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();

  const fetchTeacherClasses = async () => {
    if (!user) return;

    try {
      const teacherEmail = user.email;
      
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('email_address', teacherEmail)
        .single();

      if (teacherError) throw teacherError;

      const { data: teacherSectionsData, error: sectionsError } = await supabase
        .from('teacher_sections')
        .select(`
          id,
          section_id,
          is_adviser,
          section:sections (
            id,
            section_name,
            grade:grades (
              id,
              grade_level
            )
          )
        `)
        .eq('teacher_id', teacherData.id)
        .eq('is_adviser', true);

      if (sectionsError) throw sectionsError;

      const { data: teacherSubjectSectionsData, error: subjectSectionsError } = await supabase
        .from('teacher_subject_sections')
        .select(`
          id,
          subject_id,
          section_id,
          subject:subjects (
            id,
            subject_name,
            subject_code
          ),
          section:sections (
            id,
            section_name,
            grade:grades (
              id,
              grade_level
            )
          )
        `)
        .eq('teacher_id', teacherData.id);

      if (subjectSectionsError) throw subjectSectionsError;

      const classMap = new Map();

      if (teacherSectionsData && teacherSectionsData.length > 0) {
        teacherSectionsData.forEach(item => {
          if (item.section) {
            const grade = item.section.grade?.grade_level || '';
            const section = item.section.section_name || '';
            const className = `${grade}-${section}`;
            const key = className;
            
            if (!classMap.has(key)) {
              classMap.set(key, {
                id: item.id,
                className: className,
                grade: grade,
                section: section,
                schoolYear: 'SY 2024-2025',
                subjects: []
              });
            }
            
            classMap.get(key).subjects.push({
              subjectName: 'Advisory Class',
              subjectCode: 'ADV',
              isAdvisory: true
            });
          }
        });
      }

      if (teacherSubjectSectionsData && teacherSubjectSectionsData.length > 0) {
        teacherSubjectSectionsData.forEach(item => {
          if (item.section && item.subject) {
            const grade = item.section.grade?.grade_level || '';
            const section = item.section.section_name || '';
            const className = `${grade}-${section}`;
            const subjectCode = item.subject.subject_code || 'SUB';
            const subjectName = item.subject.subject_name || 'Subject';
            const key = className;
            
            if (!classMap.has(key)) {
              classMap.set(key, {
                id: item.id,
                className: className,
                grade: grade,
                section: section,
                schoolYear: 'SY 2024-2025',
                subjects: []
              });
            }
            
            classMap.get(key).subjects.push({
              subjectName: subjectName,
              subjectCode: subjectCode,
              isAdvisory: false
            });
          }
        });
      }

      const classes = Array.from(classMap.values()).map(cls => {
        cls.subjects.sort((a, b) => {
          if (!a.isAdvisory && b.isAdvisory) return -1;
          if (a.isAdvisory && !b.isAdvisory) return 1;
          return a.subjectCode.localeCompare(b.subjectCode);
        });

        const subjectDisplay = cls.subjects
          .map(sub => sub.subjectCode)
          .join(' | ');

        return {
          ...cls,
          subjectDisplay: subjectDisplay,
          fullSubjects: cls.subjects
        };
      });

      classes.sort((a, b) => {
        const gradeA = parseInt(a.grade) || 0;
        const gradeB = parseInt(b.grade) || 0;
        if (gradeA !== gradeB) return gradeA - gradeB;
        return a.section.localeCompare(b.section);
      });

      setTeacherClasses(classes);
      
      if (classes.length > 0) {
        setCurrentClass(classes[0].className);
      }
    } catch (err) {
      console.error('Error fetching teacher classes:', err);
      setError('Failed to load teacher classes: ' + err.message);
    }
  };

  const fetchClassStudents = async () => {
    if (!currentClass) return;

    setLoading(true);
    setError(null);
    
    try {
      const { grade, section } = parseClassName(currentClass);
      
      if (!grade || !section) {
        throw new Error(`Invalid class name: ${currentClass}`);
      }
      
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('section_name', section)
        .single();

      if (sectionError) throw new Error(`Section "${section}" not found`);

      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('id, grade_level')
        .eq('grade_level', grade)
        .single();

      if (gradeError) throw new Error(`Grade "${grade}" not found`);

      const { data: classStudents, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          lrn,
          first_name,
          last_name,
          middle_name,
          email,
          phone_number,
          guardian_first_name,
          guardian_last_name,
          guardian_phone_number,
          guardian_email,
          created_at,
          grade:grades(grade_level),
          section:sections(section_name)
        `)
        .eq('grade_id', gradeData.id)
        .eq('section_id', sectionData.id)
        .order('last_name');

      if (studentsError) throw studentsError;

      const transformedData = (classStudents || []).map(student => ({
        ...student,
        grade: student.grade?.grade_level || 'N/A',
        section: student.section?.section_name || 'N/A'
      }));

      setStudents(transformedData);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching class students:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseClassName = (className) => {
    const match = className.match(/^(\d+)[-\s](.+)$/);
    if (match) {
      const grade = match[1];
      const section = match[2];
      return { grade, section };
    }
    return { grade: null, section: null };
  };

  useEffect(() => {
    fetchTeacherClasses();
  }, [user]);

  useEffect(() => {
    if (currentClass) {
      fetchClassStudents();
    }
  }, [currentClass]);

  const sortedStudents = useMemo(() => {
    return sortEntities(students, { type: 'student' });
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return sortedStudents;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return sortedStudents.filter(student => 
      student.lrn?.toLowerCase().includes(searchLower) ||
      student.first_name?.toLowerCase().includes(searchLower) ||
      student.middle_name?.toLowerCase().includes(searchLower) ||
      student.last_name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  }, [sortedStudents, searchTerm]);

  const handleGenerateReport = (studentId, studentName, e) => {
    e.stopPropagation();
    alert(`Generating report for ${studentName} (ID: ${studentId}) from class ${currentClass}`);
  };

  const handleClassChange = (className) => {
    setCurrentClass(className);
    toggleRow(null);
  };

  const handleRowClick = (studentId, e) => {
    if (e.target.closest('button') || e.target.closest('.action-button')) {
      return;
    }
    toggleRow(studentId);
  };

  const currentClassDetails = useMemo(() => {
    return teacherClasses.find(cls => cls.className === currentClass);
  }, [teacherClasses, currentClass]);

  const getTableInfoMessage = () => {
    const studentCount = filteredStudents.length;
    
    if (!currentClassDetails) return '';
    
    const { grade, section } = parseClassName(currentClass);
    
    let message = `Showing ${studentCount} student/s in Grade ${grade} - Section ${section}`;
    
    const hasAdvisory = currentClassDetails.subjects.some(sub => sub.isAdvisory);
    const otherSubjects = currentClassDetails.subjects.filter(sub => !sub.isAdvisory);
    
    if (otherSubjects.length > 0) {
      const subjectCodes = otherSubjects.map(sub => sub.subjectCode).join(', ');
      message += ` (${subjectCodes}`;
      
      if (hasAdvisory) {
        message += `, Advisory Class`;
      }
      
      message += `)`;
    } else if (hasAdvisory) {
      message += ` (Advisory Class)`;
    }
    
    if (searchTerm) {
      message += ` matching "${searchTerm}"`;
    }
    
    return message;
  };

  const renderExpandedRow = (student) => {
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(student.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="5">
          <div 
            className={`${styles.studentCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.studentHeader}>
              {formatStudentName(student)}
            </div>
          
            <div className={styles.details}>
              <div>
                <div className={styles.studentInfo}>
                  <strong>Student Details</strong>
                </div>
                <div className={styles.studentInfo}>Student ID: {formatNA(student.lrn)}</div>
                <div className={styles.studentInfo}>Section: {student.section}</div>
                <div className={styles.studentInfo}>Phone Number: {formatNA(student.phone_number)}</div>
              </div>

              <div>
                <div className={styles.studentInfo}>
                  <strong>Guardian Information</strong>
                </div>
                <div className={styles.studentInfo}>
                  Name of Parent: {formatNA(student.guardian_first_name)} {formatNA(student.guardian_last_name)}
                </div>
                <div className={styles.studentInfo}>
                  Phone Number: {formatNA(student.guardian_phone_number)}
                </div>
                <div className={styles.studentInfo}>
                  Email address: {formatNA(student.guardian_email)}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  if (loading && students.length === 0) {
    return (
      <div className={styles.teacherStudentView}>
        <div className={styles.loading}>Loading student profiles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.teacherStudentView}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.teacherStudentView} ref={tableRef}>
      <div className={styles.searchContainer}>
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          search={true}
        />
      </div>

      <div className={styles.classContainers}>
        {teacherClasses.map((cls) => (
          <Button 
            key={cls.className}
            label={`${cls.className} | ${cls.subjectDisplay}`}
            tabBottom={true}
            height="xs"
            width="lg"
            color="grades"
            active={currentClass === cls.className}
            onClick={() => handleClassChange(cls.className)}
            title={`${cls.grade}-${cls.section} - Subjects: ${cls.fullSubjects.map(s => `${s.subjectName} (${s.subjectCode})`).join(', ')}`}
          />
        ))}
        
        <div className={styles.tableInfo}>
          <p>{getTableInfoMessage()}</p>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.studentsTable}>
          <thead>
            <tr>
              <th>STUDENT ID</th>
              <th>NAME</th>
              <th>SECTION</th>
              <th>EMAIL</th>
              <th>GENERATE</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.noStudents}>
                  {searchTerm 
                    ? `No students found matching "${searchTerm}"` 
                    : `No students found in class ${currentClass}`}
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, index) => {
                const visibleRowIndex = filteredStudents
                  .slice(0, index)
                  .filter(s => !isRowExpanded(s.id))
                  .length;
                
                const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;

                return (
                  <React.Fragment key={student.id}>
                    {!isRowExpanded(student.id) && (
                      <tr 
                        className={`${styles.studentRow} ${rowColorClass}`}
                        onClick={(e) => handleRowClick(student.id, e)}
                      >
                        <td>{formatNA(student.lrn)}</td>
                        <td>{formatStudentName(student)}</td>
                        <td>{student.section}</td>
                        <td>{formatNA(student.email)}</td>
                        <td>
                          <div className={styles.reportButtonContainer}>
                            <button 
                              className={styles.reportButton}
                              onClick={(e) => handleGenerateReport(student.id, formatStudentName(student), e)}
                              title="Generate attendance report"
                            >
                              <FontAwesomeIcon icon={faImage} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {renderExpandedRow(student)}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherStudentViewTable;