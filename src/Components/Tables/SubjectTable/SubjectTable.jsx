import React, { useState, useEffect } from 'react';
import styles from './SubjectTable.module.css';
import { EntityService } from '../../../Utils/EntityService';
import { useRowExpansion } from '../../Hooks/useRowExpansion'; 
import { useEntityEdit } from '../../Hooks/useEntityEdit'; 
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
  onSingleDeleteClick,
  onEntityDataUpdate,
  onInfoTextChange
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
    );
  };

  // Get table info message
  const getTableInfoMessage = () => {
    const subjectCount = filteredSubjects.length;
    
    if (searchTerm) {
      return `Found ${subjectCount} subject/s matching "${searchTerm}"`;
    }
    
    return `Showing ${subjectCount} subject/s`;
  };

  useEffect(() => {
    if (onInfoTextChange) {
      onInfoTextChange(getTableInfoMessage());
    }
  }, [onInfoTextChange, searchTerm, filteredSubjects.length, selectedSubjects.length]);

  useEffect(() => {
    if (onEntityDataUpdate) {
      onEntityDataUpdate(subjects);
    }
  }, [subjects, onEntityDataUpdate]);

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
        const isSelected = selectedSubjects.includes(row.id);
        return (
          <div className={styles.icon} onClick={(e) => handleSubjectSelect(row.id, e)}>
            <FontAwesomeIcon 
              icon={isSelected ? fasCircle : farCircleRegular}
              style={{ cursor: 'pointer', color: isSelected ? '#0f6b58' : '' }}
            />
          </div>
        );
      }
    },
    {
      key: 'subject_code',
      label: 'SUBJECT CODE',
      headerStyle: withColumnWidth('20%', 120),
      cellStyle: withColumnWidth('20%', 120),
      renderCell: ({ row }) => {
        const isEditing = editingId === row.id;
        if (!isEditing) return row.subject_code;

        return (
          <input
            type="text"
            value={editFormData.subject_code || ''}
            onChange={(e) => updateEditField('subject_code', e.target.value.toUpperCase())}
            className={`${styles.editInput} ${validationErrors.subject_code ? styles.errorInput : ''}`}
            style={{ textTransform: 'uppercase' }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      }
    },
    {
      key: 'subject_name',
      label: 'SUBJECT NAME',
      headerStyle: withColumnWidth('55%', 200),
      cellStyle: withColumnWidth('55%', 200),
      renderCell: ({ row }) => {
        const isEditing = editingId === row.id;
        if (!isEditing) return row.subject_name;

        return (
          <input
            type="text"
            value={editFormData.subject_name || ''}
            onChange={(e) => updateEditField('subject_name', e.target.value)}
            className={`${styles.editInput} ${validationErrors.subject_name ? styles.errorInput : ''}`}
            onClick={(e) => e.stopPropagation()}
          />
        );
      }
    },
    {
      key: 'edit',
      label: 'EDIT',
      headerStyle: withColumnWidth('10%', 70),
      cellStyle: withColumnWidth('10%', 70),
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
    <div className={styles.subjectTableContainer} ref={tableRef}>
      <Table
        columns={columns}
        rows={filteredSubjects}
        getRowId={(row) => row.id}
        loading={loading}
        error={error ? `Error: ${error}` : ''}
        emptyMessage={getTableInfoMessage()}
        containerRef={tableRef}
        tableLabel="Subject records"
        onRowClick={({ row }) => toggleRow(row.id)}
        isRowSelected={({ row }) => selectedSubjects.includes(row.id)}
        rowClassName={({ row }) => {
          const isEditing = editingId === row.id;
          return `${styles.subjectRow} ${isEditing ? styles.editingRow : ''}`;
        }}
        expandedRowId={expandedRow}
        renderExpandedRow={({ row }) => renderExpandedRow(row)}
        persistExpandedRows
        hideMainRowWhenExpanded
        getExpandedRowClassName={({ isExpanded }) => `${styles.expandRow} ${isExpanded ? styles.expandRowActive : ''}`}
        stickyHeader
        wrapperClassName={styles.tableWrapper}
      />

      {Object.keys(validationErrors).length > 0 && (
        <div className={styles.tableInfo}>
          <p className={styles.errorMessage}>{Object.values(validationErrors)[0]}</p>
        </div>
      )}

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