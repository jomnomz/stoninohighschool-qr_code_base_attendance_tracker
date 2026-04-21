import React, { useState, useEffect } from 'react';
import styles from './GradeSectionTable.module.css';
import { EntityService } from '../../../Utils/EntityService';
import { StudentService } from '../../../Utils/EntityService';
import { useRowExpansion } from '../../Hooks/useRowExpansion';
import DeleteEntityModal from '../../Modals/DeleteEntityModal/DeleteEntityModal';
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { supabase } from '../../../lib/supabase';
import Table from '../Table/Table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPenToSquare, 
  faTrashCan,
  faCircle as fasCircle 
} from "@fortawesome/free-solid-svg-icons";
import { faCircle as farCircleRegular } from "@fortawesome/free-regular-svg-icons";
import { compareSections } from '../../../Utils/CompareHelpers';

const formatDateTimeLocal = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'N/A';
  }
};

// Sorting function for grade sections (numerical grade sorting)
const sortGradeSections = (sections) => {
  return [...sections].sort((a, b) => {
    const gradeA = parseInt(a.grade) || 0;
    const gradeB = parseInt(b.grade) || 0;
    
    if (gradeA !== gradeB) {
      return gradeA - gradeB;
    }
    
    const sectionComparison = compareSections(a.section || '', b.section || '');
    return sectionComparison;
  });
};

// Function to update students when a grade section changes
const updateStudentsForSectionChange = async (oldSection, newGrade, newSection, sectionId) => {
  try {
    console.log('🔄 Updating students for section change:', { 
      oldSection, 
      newGrade, 
      newSection, 
      sectionId 
    });

    // Find students with this section_id
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('id, first_name, last_name, grade, section, grade_id, section_id')
      .eq('section_id', sectionId);

    if (fetchError) {
      console.error('❌ Error fetching students:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${students?.length || 0} students in section ${oldSection}`);

    if (!students || students.length === 0) {
      return { success: true, updated: 0 };
    }

    // Update each student
    const updates = students.map(student => ({
      id: student.id,
      updates: {
        grade: newGrade.toString(), // Update text grade field
        section: newSection, // Update text section field
        grade_id: null, // We'll set this after finding the grade
        // section_id remains the same (it's already the foreign key)
      }
    }));

    // Find the grade ID for the new grade
    const { data: gradeData, error: gradeError } = await supabase
      .from('grades')
      .select('id, grade_level')
      .eq('grade_level', newGrade)
      .single();

    if (gradeError) {
      console.error('❌ Error finding grade:', gradeError);
      throw gradeError;
    }

    const gradeId = gradeData?.id;

    // Perform batch update
    let updatedCount = 0;
    const errors = [];

    for (const studentUpdate of updates) {
      try {
        const finalUpdates = {
          ...studentUpdate.updates,
          grade_id: gradeId, // Set the correct grade_id
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('students')
          .update(finalUpdates)
          .eq('id', studentUpdate.id);

        if (updateError) {
          errors.push(`Student ${studentUpdate.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } catch (err) {
        errors.push(`Student ${studentUpdate.id}: ${err.message}`);
      }
    }

    console.log(`✅ Updated ${updatedCount} students for section change`);

    if (errors.length > 0) {
      console.error('⚠️ Errors during student updates:', errors);
      return { 
        success: false, 
        updated: updatedCount, 
        errors: errors 
      };
    }

    return { success: true, updated: updatedCount };

  } catch (error) {
    console.error('❌ Error in updateStudentsForSectionChange:', error);
    throw error;
  }
};

const GradeSectionTable = ({ 
  searchTerm = '',
  onSelectedGradeSectionsUpdate,
  selectedGradeSections = [],
  onSingleDeleteClick,
  onEntityDataUpdate,
  onInfoTextChange
}) => {
  const [gradeSections, setGradeSections] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGradeSection, setSelectedGradeSection] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [updatingStudents, setUpdatingStudents] = useState(false);
  
  const { expandedRow, toggleRow, isRowExpanded, tableRef } = useRowExpansion();
  const { success, error: toastError } = useToast();
  
  const sectionService = new EntityService('sections');
  const gradeService = new EntityService('grades');
  const studentService = new StudentService();

  const fetchGradeSections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: allGrades, error: gradesError } = await supabase
        .from('grades')
        .select('id, grade_level')
        .order('grade_level');
      
      if (gradesError) {
        console.error('❌ Error fetching grades:', gradesError);
        throw gradesError;
      }
      
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          grade:grades!grade_id (
            grade_level
          )
        `);
      
      if (error) {
        console.error('❌ Error fetching sections:', error);
        throw error;
      }
      
      setGrades(allGrades || []);
      
      const transformedData = (data || []).map(item => ({
        id: item.id,
        grade: item.grade?.grade_level || 'N/A',
        section: item.section_name || 'N/A',
        created_at: item.created_at,
        updated_at: item.updated_at,
        grade_id: item.grade_id
      }));
      
      const sortedData = sortGradeSections(transformedData);
      
      setGradeSections(sortedData);
      
    } catch (err) {
      console.error('❌ Error fetching grade sections:', err);
      setError(err.message);
      setGradeSections([]);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };
  
  const startEdit = (gradeSection) => {
    setEditingId(gradeSection.id);
    setValidationErrors({});
    
    setEditFormData({
      grade: gradeSection.grade.toString(),
      section: gradeSection.section || '',
      originalGrade: gradeSection.grade,
      originalSection: gradeSection.section
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
    setValidationErrors({});
  };

  const updateEditField = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!editFormData.grade || editFormData.grade === '') {
      errors.grade = 'Grade is required';
    }
    
    if (!editFormData.section || editFormData.section.trim() === '') {
      errors.section = 'Section name is required';
    } else if (editFormData.section.length > 50) {
      errors.section = 'Section name must be 50 characters or less';
    }
    
    return errors;
  };

  const handleSaveEdit = async (gradeSectionId, e) => {
    if (e) e.stopPropagation();
    
    try {
      setSaving(true);
      
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        toastError('Please fix the validation errors');
        return { success: false };
      }
      
      const selectedGrade = grades.find(g => 
        g.grade_level.toString() === editFormData.grade
      );
      
      if (!selectedGrade) {
        throw new Error(`Grade ${editFormData.grade} not found`);
      }
      
      // Prepare section update data
      const updateData = {
        grade_id: selectedGrade.id,
        section_name: editFormData.section.trim(),
        updated_at: new Date().toISOString()
      };
      
      // Check if we need to update students (if grade or section name changed)
      const sectionBeforeEdit = gradeSections.find(s => s.id === gradeSectionId);
      const gradeChanged = sectionBeforeEdit?.grade !== editFormData.grade;
      const sectionNameChanged = sectionBeforeEdit?.section !== editFormData.section.trim();
      
      // Update the section first
      const { data: updatedSection, error: updateError } = await supabase
        .from('sections')
        .update(updateData)
        .eq('id', gradeSectionId)
        .select()
        .single();
      
      if (updateError) {
        if (updateError.code === '23505') {
          if (updateError.message.includes('sections_grade_id_section_name_key')) {
            throw new Error(`Section "${editFormData.section}" already exists in Grade ${editFormData.grade}`);
          }
        }
        
        throw new Error(updateError.message || 'Failed to update grade section');
      }
      
      // Update students if grade or section name changed
      if ((gradeChanged || sectionNameChanged) && sectionBeforeEdit) {
        try {
          setUpdatingStudents(true);
          const studentUpdateResult = await updateStudentsForSectionChange(
            sectionBeforeEdit.section,
            editFormData.grade,
            editFormData.section.trim(),
            gradeSectionId
          );
          
          if (studentUpdateResult.success) {
            console.log(`✅ Successfully updated ${studentUpdateResult.updated} students`);
          } else {
            console.warn('⚠️ Student updates had issues:', studentUpdateResult.errors);
            toastError(`Updated section but had issues with some students`);
          }
        } catch (studentError) {
          console.error('❌ Error updating students:', studentError);
          toastError('Updated section but failed to update some student records');
        } finally {
          setUpdatingStudents(false);
        }
      }
      
      // Update local state
      setGradeSections(prevSections => {
        const updatedSections = prevSections.map(section => {
          if (section.id === gradeSectionId) {
            const gradeInfo = grades.find(g => g.id === updatedSection.grade_id);
            return {
              ...section,
              ...updatedSection,
              grade: gradeInfo?.grade_level || editFormData.grade,
              section: editFormData.section.trim(),
              grade_id: selectedGrade.id
            };
          }
          return section;
        });
        
        return updatedSections;
      });
      
      success(`Grade section updated successfully${gradeChanged || sectionNameChanged ? ' (students updated)' : ''}`);
      
      cancelEdit();
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchGradeSections();
      }, 500);
      
      return { success: true };
      
    } catch (err) {
      console.error('❌ Error updating grade section:', err);
      toastError(`Failed to update: ${err.message}`);
      return { 
        success: false, 
        error: err.message
      };
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchGradeSections();
    
    const subscription = supabase
      .channel('grade-sections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sections'
        },
        () => {
          fetchGradeSections();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredGradeSections = sortGradeSections(
    gradeSections.filter(section => {
      const searchLower = searchTerm.toLowerCase();
      const grade = section.grade?.toString() || '';
      const sectionName = section.section?.toString() || '';
      
      return (
        grade.toLowerCase().includes(searchLower) ||
        sectionName.toLowerCase().includes(searchLower)
      );
    })
  );

  const handleGradeSectionSelect = (gradeSectionId, e) => {
    e.stopPropagation();
    const newSelected = selectedGradeSections.includes(gradeSectionId)
      ? selectedGradeSections.filter(id => id !== gradeSectionId)
      : [...selectedGradeSections, gradeSectionId];
    
    if (onSelectedGradeSectionsUpdate) {
      onSelectedGradeSectionsUpdate(newSelected);
    }
  };

  const handleSelectAll = () => {
    const allVisibleIds = filteredGradeSections.map(gs => gs.id);
    const allSelected = allVisibleIds.every(id => selectedGradeSections.includes(id));
    
    const newSelected = allSelected
      ? selectedGradeSections.filter(id => !allVisibleIds.includes(id))
      : [...new Set([...selectedGradeSections, ...allVisibleIds])];
    
    if (onSelectedGradeSectionsUpdate) {
      onSelectedGradeSectionsUpdate(newSelected);
    }
  };

  const allVisibleSelected = filteredGradeSections.length > 0 && 
    filteredGradeSections.every(gs => selectedGradeSections.includes(gs.id));

  const handleDeleteClick = (gradeSection, e) => {
    e.stopPropagation();
    if (onSingleDeleteClick) {
      onSingleDeleteClick(gradeSection, 'gradeSection');
    } else {
      setSelectedGradeSection(gradeSection);
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async (id) => {
    setIsDeleting(true);
    try {
      if (editingId === id) {
        cancelEdit();
      }
      
      await sectionService.delete(id);
      success('Grade section deleted successfully');
      fetchGradeSections();
      const newSelected = selectedGradeSections.filter(selectedId => selectedId !== id);
      if (onSelectedGradeSectionsUpdate) {
        onSelectedGradeSectionsUpdate(newSelected);
      }
    } catch (err) {
      toastError(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setSelectedGradeSection(null);
    }
  };

  const handleEditClick = (gradeSection, e) => {
    e.stopPropagation();
    startEdit(gradeSection);
  };

  const renderEditCell = (gradeSection) => (
    <div className={styles.editCell}>
      {editingId === gradeSection.id ? (
        <div className={styles.editActions}>
          <button 
            onClick={(e) => handleSaveEdit(gradeSection.id, e)}
            disabled={saving || updatingStudents}
            className={styles.saveBtn}
          >
            {saving || updatingStudents ? (
              updatingStudents ? 'Updating Students...' : 'Saving...'
            ) : 'Save'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              cancelEdit();
            }}
            disabled={saving || updatingStudents}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(gradeSection, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

  // Render expanded row with details
  const renderExpandedRow = (gradeSection) => {
    const addedAt = formatDateTimeLocal(gradeSection.created_at);
    const updatedAt = gradeSection.updated_at ? formatDateTimeLocal(gradeSection.updated_at) : 'Never updated';
    
    return (
      <div 
        className={`${styles.gradeSectionCard} ${styles.expandableCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.gradeSectionHeader}>
          Grade {gradeSection.grade} - Section {gradeSection.section}
        </div>
        <div className={styles.details}>
          <div>
            <div className={styles.gradeSectionInfo}>
              <strong>Grade Section Details</strong>
            </div>
            <div className={styles.gradeSectionInfo}>Grade Level: {gradeSection.grade}</div>
            <div className={styles.gradeSectionInfo}>Section: {gradeSection.section}</div>
          </div>
          
          <div>
            <div className={styles.gradeSectionInfo}>
              <strong>Record Information</strong>
            </div>
            <div className={styles.gradeSectionInfo}>Added: {addedAt}</div>
            <div className={styles.gradeSectionInfo}>Last Updated: {updatedAt}</div>
          </div>
        </div>
      </div>
    );
  };

  const getTableInfoMessage = () => {
    const sectionCount = filteredGradeSections.length;
    
    if (searchTerm) {
      return `Found ${sectionCount} grade section/s matching "${searchTerm}"`;
    }
    
    return `Showing ${sectionCount} grade section/s`;
  };

  useEffect(() => {
    if (onInfoTextChange) {
      onInfoTextChange(getTableInfoMessage());
    }
  }, [onInfoTextChange, searchTerm, filteredGradeSections.length, selectedGradeSections.length]);

  useEffect(() => {
    if (onEntityDataUpdate) {
      onEntityDataUpdate(gradeSections);
    }
  }, [gradeSections, onEntityDataUpdate]);

  const withColumnWidth = (width, minWidth) => ({
    width,
    minWidth: `${minWidth}px`
  });

  const columns = [
    {
      key: 'select',
      label: '',
      headerStyle: withColumnWidth('5%', 40),
      cellStyle: withColumnWidth('5%', 40),
      renderHeader: () => (
        <div className={styles.icon} onClick={handleSelectAll}>
          <FontAwesomeIcon 
            icon={allVisibleSelected ? fasCircle : farCircleRegular}
            style={{ cursor: 'pointer', color: allVisibleSelected ? '#0f6b58' : '' }}
          />
        </div>
      ),
      renderCell: ({ row }) => {
        const isSelected = selectedGradeSections.includes(row.id);
        return (
          <div className={styles.icon} onClick={(e) => handleGradeSectionSelect(row.id, e)}>
            <FontAwesomeIcon 
              icon={isSelected ? fasCircle : farCircleRegular}
              style={{ cursor: 'pointer', color: isSelected ? '#0f6b58' : '' }}
            />
          </div>
        );
      }
    },
    {
      key: 'grade',
      label: 'GRADE LEVEL',
      headerStyle: withColumnWidth('25%', 100),
      cellStyle: withColumnWidth('25%', 100),
      renderCell: ({ row }) => {
        const isEditing = editingId === row.id;
        if (!isEditing) return `Grade ${row.grade}`;

        return (
          <select
            value={editFormData.grade || ''}
            onChange={(e) => updateEditField('grade', e.target.value)}
            className={`${styles.editSelect} ${validationErrors.grade ? styles.errorInput : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Select Grade</option>
            {grades.map(grade => (
              <option key={grade.id} value={grade.grade_level}>
                Grade {grade.grade_level}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'section',
      label: 'SECTION',
      headerStyle: withColumnWidth('50%', 150),
      cellStyle: withColumnWidth('50%', 150),
      renderCell: ({ row }) => {
        const isEditing = editingId === row.id;
        if (!isEditing) return row.section;

        return (
          <input
            type="text"
            value={editFormData.section || ''}
            onChange={(e) => updateEditField('section', e.target.value)}
            className={`${styles.editInput} ${validationErrors.section ? styles.errorInput : ''}`}
            onClick={(e) => e.stopPropagation()}
            placeholder="Section name"
          />
        );
      }
    },
    {
      key: 'edit',
      label: 'EDIT',
      headerStyle: withColumnWidth('10%', 80),
      cellStyle: withColumnWidth('10%', 80),
      renderCell: ({ row }) => renderEditCell(row)
    },
    {
      key: 'delete',
      label: 'DELETE',
      headerStyle: withColumnWidth('10%', 70),
      cellStyle: withColumnWidth('10%', 70),
      renderCell: ({ row }) => (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faTrashCan}
            className="action-button"
            onClick={(e) => handleDeleteClick(row, e)}
          />
        </div>
      )
    }
  ];

  return (
    <div className={styles.gradeSectionTableContainer} ref={tableRef}>
      <Table
        columns={columns}
        rows={filteredGradeSections}
        getRowId={(row) => row.id}
        loading={loading}
        error={error ? `Error: ${error}` : ''}
        emptyMessage={getTableInfoMessage()}
        containerRef={tableRef}
        tableLabel="Grade and section records"
        onRowClick={({ row }) => toggleRow(row.id)}
        isRowSelected={({ row }) => selectedGradeSections.includes(row.id)}
        rowClassName={({ row }) => {
          const isEditing = editingId === row.id;
          return `${styles.gradeSectionRow} ${isEditing ? styles.editingRow : ''}`;
        }}
        expandedRowId={expandedRow}
        renderExpandedRow={({ row }) => renderExpandedRow(row)}
        persistExpandedRows
        hideMainRowWhenExpanded
        getExpandedRowClassName={({ isExpanded }) => `${styles.expandRow} ${isExpanded ? styles.expandRowActive : ''}`}
        stickyHeader
        className={styles.tableContainer}
        wrapperClassName={styles.tableWrapper}
      />

      {(updatingStudents || Object.keys(validationErrors).length > 0) && (
        <div className={styles.tableInfo}>
          {updatingStudents && <p className={styles.syncNote}>Updating student records...</p>}
          {Object.keys(validationErrors).length > 0 && (
            <p className={styles.errorMessage}>{Object.values(validationErrors)[0]}</p>
          )}
        </div>
      )}

      <DeleteEntityModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setSelectedGradeSection(null);
          }
        }}
        entity={selectedGradeSection}
        entityType="grade section"
        onConfirm={handleConfirmDelete}
        currentFilter={searchTerm}
      />
    </div>
  );
};

export default GradeSectionTable;