import React, { useState, useEffect } from 'react';
import styles from './SubjectTable.module.css';
import { EntityService } from '../../../Utils/EntityService';
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { useEntityEdit } from '../../Hooks/useEntityEdit'; 
import DeleteEntityModal from '../../Modals/DeleteEntityModal/DeleteEntityModal';
import { useToast } from '../../Toast/ToastContext/ToastContext';
import { supabase } from '../../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPenToSquare, 
  faTrashCan,
  faCircle as fasCircle 
} from "@fortawesome/free-solid-svg-icons";
import { faCircle as farCircleRegular } from "@fortawesome/free-regular-svg-icons";

// Date formatter function
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

const SubjectTable = ({ 
  searchTerm = '',
  onSelectedSubjectsUpdate,
  selectedSubjects = [],
  onSingleDeleteClick
}) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { expandedRow, toggleRow, isRowExpanded, tableRef } = useRowExpansion();
  const { success, error: toastError } = useToast();
  
  const subjectService = new EntityService('subjects');

  // Fetch function for subjects
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('subject_name');
      
      if (error) throw error;
      
      setSubjects(data || []);
      
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError(err.message);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Entity edit hook
  const {
    editingId,
    editFormData,
    saving,
    validationErrors,
    startEdit,
    cancelEdit,
    updateEditField,
    saveEdit
  } = useEntityEdit(subjects, setSubjects, 'subject', fetchSubjects);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchSubjects();
    
    const subscription = supabase
      .channel('subjects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects'
        },
        () => {
          fetchSubjects();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter subjects based on search term
  const filteredSubjects = subjects.filter(subject => {
    const searchLower = searchTerm.toLowerCase();
    return (
      subject.subject_code.toLowerCase().includes(searchLower) ||
      subject.subject_name.toLowerCase().includes(searchLower)
    );
  });

  // Handle individual subject selection
  const handleSubjectSelect = (subjectId, e) => {
    e.stopPropagation();
    const newSelected = selectedSubjects.includes(subjectId)
      ? selectedSubjects.filter(id => id !== subjectId)
      : [...selectedSubjects, subjectId];
    
    if (onSelectedSubjectsUpdate) {
      onSelectedSubjectsUpdate(newSelected);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    const allVisibleIds = filteredSubjects.map(subject => subject.id);
    const allSelected = allVisibleIds.every(id => selectedSubjects.includes(id));
    
    const newSelected = allSelected
      ? selectedSubjects.filter(id => !allVisibleIds.includes(id))
      : [...new Set([...selectedSubjects, ...allVisibleIds])];
    
    if (onSelectedSubjectsUpdate) {
      onSelectedSubjectsUpdate(newSelected);
    }
  };

  const allVisibleSelected = filteredSubjects.length > 0 && 
    filteredSubjects.every(subject => selectedSubjects.includes(subject.id));

  // Delete handler
  const handleDeleteClick = (subject, e) => {
    e.stopPropagation();
    if (onSingleDeleteClick) {
      onSingleDeleteClick(subject, 'subject');
    } else {
      setSelectedSubject(subject);
      setIsDeleteModalOpen(true);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async (id) => {
    setIsDeleting(true);
    try {
      await subjectService.delete(id);
      success('Subject deleted successfully');
      fetchSubjects();
      // Remove from selected if it was selected
      const newSelected = selectedSubjects.filter(selectedId => selectedId !== id);
      if (onSelectedSubjectsUpdate) {
        onSelectedSubjectsUpdate(newSelected);
      }
    } catch (err) {
      toastError(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setSelectedSubject(null);
    }
  };

  // Edit handlers
  const handleEditClick = (subject, e) => {
    e.stopPropagation();
    startEdit(subject);
  };

  const handleSaveEdit = async (id, e) => {
    if (e) e.stopPropagation();
    
    const result = await saveEdit(id, null, async (id, data) => {
      return await subjectService.update(id, {
        subject_code: data.subject_code,
        subject_name: data.subject_name
      });
    });

    if (result.success) {
      success('Subject updated successfully');
    }
  };

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    cancelEdit();
  };

  // Render edit cell
  const renderEditCell = (subject) => (
    <div className={styles.editCell}>
      {editingId === subject.id ? (
        <div className={styles.editActions}>
          <button 
            onClick={(e) => handleSaveEdit(subject.id, e)}
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={(e) => handleCancelEdit(e)}
            disabled={saving}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(subject, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

  // Render expanded row with details
  const renderExpandedRow = (subject) => {
    const addedAt = formatDateTimeLocal(subject.created_at);
    const updatedAt = subject.updated_at ? formatDateTimeLocal(subject.updated_at) : 'Never updated';
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(subject.id) ? styles.expandRowActive : ''}`}>
        <td colSpan="5">
          <div 
            className={`${styles.subjectCard} ${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.subjectHeader}>
              {subject.subject_code} - {subject.subject_name}
            </div>
            <div className={styles.details}>
              <div>
                <div className={styles.subjectInfo}>
                  <strong>Subject Details</strong>
                </div>
                <div className={styles.subjectInfo}>Subject Code: {subject.subject_code}</div>
                <div className={styles.subjectInfo}>Subject Name: {subject.subject_name}</div>
              </div>
              
              <div>
                <div className={styles.subjectInfo}>
                  <strong>Record Information</strong>
                </div>
                <div className={styles.subjectInfo}>Added: {addedAt}</div>
                <div className={styles.subjectInfo}>Last Updated: {updatedAt}</div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Loading state
  if (loading) return (
    <div className={styles.subjectTableContainer}>
      <div className={styles.loading}>Loading subjects...</div>
    </div>
  );
  
  // Error state
  if (error) return (
    <div className={styles.subjectTableContainer}>
      <div className={styles.error}>Error: {error}</div>
    </div>
  );

  // Get table info message
  const getTableInfoMessage = () => {
    const subjectCount = filteredSubjects.length;
    const selectedCount = selectedSubjects.length;
    
    if (searchTerm) {
      return `Found ${subjectCount} subject/s matching "${searchTerm}"${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`;
    }
    
    return `Showing ${subjectCount} subject/s${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`;
  };

  // Render regular row (only shows when NOT expanded)
  const renderRegularRow = (subject, rowColorClass, visibleRowIndex, isSelected) => {
    const isEditing = editingId === subject.id;
    
    return (
      <tr 
        key={subject.id}
        className={`${styles.subjectRow} ${rowColorClass} ${isEditing ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
        onClick={() => toggleRow(subject.id)}
      >
        <td>
          <div className={styles.icon} onClick={(e) => handleSubjectSelect(subject.id, e)}>
            <FontAwesomeIcon 
              icon={isSelected ? fasCircle : farCircleRegular} 
              style={{ 
                cursor: 'pointer', 
                color: isSelected ? '#007bff' : '' 
              }}
            />
          </div>
        </td>
        
        <td>
          {isEditing ? (
            <input
              type="text"
              value={editFormData.subject_code || ''}
              onChange={(e) => updateEditField('subject_code', e.target.value.toUpperCase())}
              className={`${styles.editInput} ${validationErrors.subject_code ? styles.errorInput : ''}`}
              style={{ textTransform: 'uppercase' }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            subject.subject_code
          )}
        </td>
        
        <td>
          {isEditing ? (
            <input
              type="text"
              value={editFormData.subject_name || ''}
              onChange={(e) => updateEditField('subject_name', e.target.value)}
              className={`${styles.editInput} ${validationErrors.subject_name ? styles.errorInput : ''}`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            subject.subject_name
          )}
        </td>
        
        <td>
          {renderEditCell(subject)}
        </td>
        
        <td>
          <div className={styles.icon}>
            <FontAwesomeIcon 
              icon={faTrashCan} 
              className="action-button"
              onClick={(e) => handleDeleteClick(subject, e)}
            />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.subjectTableContainer} ref={tableRef}>
      {/* Table info similar to other tables */}
      <div className={styles.tableInfo}>
        <p>{getTableInfoMessage()}</p>
      </div>

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>
                <div className={styles.icon} onClick={handleSelectAll}>
                  <FontAwesomeIcon 
                    icon={allVisibleSelected ? fasCircle : farCircleRegular} 
                    style={{ 
                      cursor: 'pointer',
                      color: allVisibleSelected ? '#007bff' : '' 
                    }}
                  />
                </div>
              </th>
              <th>SUBJECT CODE</th>
              <th>SUBJECT NAME</th>
              <th>EDIT</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.noSubject}>
                  {getTableInfoMessage()}
                </td>
              </tr>
            ) : (
              filteredSubjects.map((subject, index) => {
                const visibleRowIndex = filteredSubjects
                  .slice(0, index)
                  .filter(s => !isRowExpanded(s.id))
                  .length;
                
                const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;
                const isSelected = selectedSubjects.includes(subject.id);

                return (
                  <React.Fragment key={subject.id}>
                    {/* Only show regular row if NOT expanded */}
                    {!isRowExpanded(subject.id) && (
                      renderRegularRow(subject, rowColorClass, visibleRowIndex, isSelected)
                    )}
                    {/* Always render expanded row (it will be hidden if not active) */}
                    {renderExpandedRow(subject)}
                    {/* ERROR ROW - Only when editing has errors */}
                    {editingId === subject.id && Object.keys(validationErrors).length > 0 && (
                      <tr className={styles.errorRow}>
                        <td colSpan="5" className={styles.errorMessages}>
                          {Object.values(validationErrors).map((error, idx) => (
                            <div key={idx} className={styles.errorMessage}>
                              {error}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DeleteEntityModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setSelectedSubject(null);
          }
        }}
        entity={selectedSubject}
        entityType="subject"
        onConfirm={handleConfirmDelete}
        currentFilter={searchTerm}
      />
    </div>
  );
};

export default SubjectTable;