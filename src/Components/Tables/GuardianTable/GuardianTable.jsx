import React, { useState, useEffect, useMemo } from 'react';
import { useEntityEdit } from '../../Hooks/useEntityEdit';
import { useRowExpansion } from '../../Hooks/useRowExpansion';
import { grades } from '../../../Utils/TableHelpers';
import { formatNA } from '../../../Utils/Formatters';
import { sortGuardians } from '../../../Utils/SortEntities'; 
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';
import styles from './GuardianTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { supabase } from '../../../lib/supabase'; 
import Table from '../Table/Table.jsx';

const GuardianTable = ({
  searchTerm = '',
  selectedSection = '',
  onSectionsUpdate,
  onGradeUpdate,
  onClearSectionFilter,
  onSectionSelect,
  availableSections = [],
  guardians: propGuardians = [],
  loading: parentLoading = false
}) => {
  const [guardians, setGuardians] = useState([]);
  const [currentClass, setCurrentClass] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  const { 
    editingId, 
    editFormData, 
    saving, 
    validationErrors,
    startEdit, 
    cancelEdit, 
    updateEditField, 
    saveEdit 
  } = useEntityEdit(guardians, setGuardians, 'guardian');
  const [localGuardians, setLocalGuardians] = useState([]);

  useEffect(() => {
    if (propGuardians && propGuardians.length > 0) {
      console.log('📊 Initializing guardians from parent:', propGuardians.length);
      setGuardians(propGuardians);
      setLoading(false);
    } else if (!parentLoading) {
      setGuardians([]);
      setLoading(false);
    }
  }, [propGuardians, parentLoading]);

  useEffect(() => {
    if (propGuardians && propGuardians.length >= 0) {
      setGuardians(propGuardians);
    }
  }, [propGuardians]);

  useEffect(() => {
    const subscription = supabase
      .channel('guardians-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        () => {
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (guardians && guardians.length > 0) {
      const sortedGuardians = sortGuardians(guardians);
      setLocalGuardians(sortedGuardians);
    } else {
      setLocalGuardians([]);
    }
  }, [guardians]);

  const allUniqueSections = useMemo(() => {
    const sections = localGuardians
      .map(guardian => guardian.section || '')
      .filter(section => section && section !== 'N/A' && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort();
  }, [localGuardians]);

  const currentGradeSections = useMemo(() => {
    if (currentClass === 'all') {
      return allUniqueSections;
    }
    
    const sections = localGuardians
      .filter(guardian => guardian.grade === currentClass)
      .map(guardian => guardian.section || '')
      .filter(section => section && section !== 'N/A' && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort();
  }, [localGuardians, currentClass, allUniqueSections]);

  const sectionsToShowInDropdown = useMemo(() => {
    return currentGradeSections;
  }, [currentGradeSections]);

  const sortedGuardians = useMemo(() => {
    let filtered = localGuardians;
    
    if (currentClass !== 'all') {
      filtered = filtered.filter(guardian => guardian.grade === currentClass);
    }
    
    if (selectedSection) {
      filtered = filtered.filter(guardian => guardian.section === selectedSection);
    }
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(guardian => 
        guardian.first_name?.toLowerCase().includes(searchLower) ||
        guardian.last_name?.toLowerCase().includes(searchLower) ||
        guardian.guardian_of?.toLowerCase().includes(searchLower) ||
        guardian.student_lrn?.toLowerCase().includes(searchLower) ||
        guardian.email?.toLowerCase().includes(searchLower) ||
        guardian.phone_number?.toLowerCase().includes(searchLower) ||
        guardian.grade?.toString().toLowerCase().includes(searchLower) ||
        guardian.section?.toString().toLowerCase().includes(searchLower)
      );
    }
    
    console.log(`🔍 Filtered guardians: ${filtered.length} (from ${localGuardians.length} total)`);
    return filtered;
  }, [localGuardians, currentClass, selectedSection, searchTerm]);

  useEffect(() => {
    if (onSectionsUpdate) {
      onSectionsUpdate(allUniqueSections);
    }
  }, [allUniqueSections, onSectionsUpdate]);

  useEffect(() => {
    if (onGradeUpdate) {
      onGradeUpdate(currentClass);
    }
  }, [currentClass, onGradeUpdate]);

  useEffect(() => {
    if (selectedSection && currentClass !== 'all') {
      const isValidSection = currentGradeSections.includes(selectedSection);
      if (!isValidSection && onSectionSelect) {
        console.log(`🔄 Clearing invalid section selection: ${selectedSection} is not in Grade ${currentClass}`);
        onSectionSelect('');
      }
    }
  }, [currentClass, currentGradeSections, selectedSection, onSectionSelect]);

  const handleClassChange = (className) => {
    setCurrentClass(className);
    setLoading(true);
    
    if (selectedSection && onSectionSelect) {
      onSectionSelect('');
    }
    
    if (selectedSection && onClearSectionFilter) {
      onClearSectionFilter();
    }
    
    setTimeout(() => setLoading(false), 100);
  };

  const handleSectionFilter = (section) => {
    if (onSectionSelect) {
      onSectionSelect(section);
    }
  };

  const handleEditClick = (guardian, e) => {
    e.stopPropagation();
    startEdit(guardian);
  };

  const handleSaveEdit = async (guardianId, e) => {
    if (e) e.stopPropagation();
    
    const result = await saveEdit(
      guardianId, 
      currentClass, 
      async (id, data) => {
        // Update guardian info in the student record
        const updateData = {
          guardian_first_name: data.first_name,
          guardian_middle_name: data.middle_name,
          guardian_last_name: data.last_name,
          guardian_email: data.email,
          guardian_phone_number: data.phone_number,
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('students')
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
        return { success: true };
      }
    );
    
    if (result.success) {
    }
  };

  const handleRowClick = (guardianId, e) => {
    const isEditing = editingId === guardianId;
    const isInteractiveElement = e.target.closest('.edit-input') || 
                                 e.target.closest('.action-button') ||
                                 e.target.closest('button') ||
                                 e.target.closest('input');
    
    if (!isEditing && !isInteractiveElement) {
      toggleRow(guardianId);
    }
  };

  const renderEditField = (guardian, fieldName) => {
    if (editingId === guardian.id) {
      const error = validationErrors[fieldName];
      
      return (
        <div className={styles.editFieldContainer}>
          <input
            type={fieldName === 'email' ? 'email' : 'text'}
            name={fieldName}
            value={editFormData[fieldName] || ''}
            onChange={(e) => updateEditField(fieldName, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`${styles.editInput} ${error ? styles.errorInput : ''} edit-input`}
            placeholder={fieldName.replace('_', ' ')}
          />
          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      );
    }
    return fieldName === 'email' || fieldName === 'phone_number'
      ? formatNA(guardian[fieldName])
      : guardian[fieldName] || '';
  };

  const renderActionButtons = (guardian) => {
    if (editingId === guardian.id) {
      return (
        <div className={`${styles.editActions} action-button`}>
          <button 
            onClick={(e) => handleSaveEdit(guardian.id, e)}
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={() => cancelEdit()}
            disabled={saving}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
      );
    }
    return (
      <div className={styles.icon} onClick={(e) => handleEditClick(guardian, e)}>
        <FontAwesomeIcon icon={faPenToSquare} className="action-button" />
      </div>
    );
  };

  const renderExpandedContent = (guardian) => (
    <div 
      className={`${styles.guardianCard} ${styles.expandableCard}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.guardianHeader}>
        {guardian.first_name} {guardian.last_name}
      </div>
      <div className={styles.guardianInfo}>
        <strong>Guardian Details</strong>
      </div>
      <div className={styles.guardianInfo}>
        Full Name: {guardian.first_name} {guardian.middle_name} {guardian.last_name}
      </div>
      <div className={styles.guardianInfo}>
        Guardian Of: {guardian.guardian_of}
      </div>
      <div className={styles.guardianInfo}>
        Student LRN: {guardian.student_lrn || 'N/A'}
      </div>
      <div className={styles.guardianInfo}>
        Grade and Section: {guardian.grade} - {guardian.section}
      </div>
      <div className={styles.guardianInfo}>
        Email: {formatNA(guardian.email)}
      </div>
      <div className={styles.guardianInfo}>
        Phone: {formatNA(guardian.phone_number)}
      </div>
    </div>
  );

  const renderEditCell = (guardian) => (
    <div className={styles.editCell}>
      {editingId === guardian.id ? (
        renderActionButtons(guardian)
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(guardian, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );

  const getTableInfoMessage = () => {
    const guardianCount = sortedGuardians.length;
    
    let message = '';
    
    if (selectedSection) {
      message = `Showing ${guardianCount} guardian/s in Section ${selectedSection}`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
      
      if (searchTerm) {
        message += ` matching "${searchTerm}"`;
      }
    } else if (searchTerm) {
      message = `Found ${guardianCount} guardian/s matching "${searchTerm}"`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
    } else {
      if (currentClass === 'all') {
        message = `Showing ${guardianCount} guardian/s across all grades`;
      } else {
        message = `Showing ${guardianCount} guardian/s in Grade ${currentClass}`;
      }
    }
    
    return message;
  };

  const getVisibleRowClassName = useMemo(() => {
    return ({ row, rowIndex }) => {
      const visibleRowIndex = sortedGuardians
        .slice(0, rowIndex)
        .filter(guardian => !isRowExpanded(guardian.id))
        .length;

      const rowColorClass = visibleRowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd;

      return [
        styles.guardianRow,
        rowColorClass,
        editingId === row.id ? styles.editingRow : ''
      ].filter(Boolean).join(' ');
    };
  }, [sortedGuardians, isRowExpanded, editingId]);

  const tableColumns = useMemo(() => [
    {
      key: 'first_name',
      label: 'FIRST NAME',
      renderCell: ({ row }) => renderEditField(row, 'first_name')
    },
    {
      key: 'last_name',
      label: 'LAST NAME',
      renderCell: ({ row }) => renderEditField(row, 'last_name')
    },
    {
      key: 'guardian_of',
      label: 'GUARDIAN OF',
      renderCell: ({ row }) => row.guardian_of
    },
    {
      key: 'grade',
      label: 'GRADE',
      renderCell: ({ row }) => row.grade
    },
    {
      key: 'section',
      label: 'SECTION',
      renderHeader: () => (
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderRow}>
            <span>SECTION</span>
            <SectionDropdown 
              availableSections={sectionsToShowInDropdown}
              selectedValue={selectedSection}
              onSelect={handleSectionFilter}
            />
          </div>
        </div>
      ),
      renderCell: ({ row }) => row.section
    },
    {
      key: 'phone_number',
      label: 'PHONE NO.',
      renderCell: ({ row }) => renderEditField(row, 'phone_number')
    },
    {
      key: 'edit',
      label: 'EDIT',
      renderCell: ({ row }) => renderEditCell(row)
    }
  ], [sectionsToShowInDropdown, selectedSection, renderEditCell, renderEditField]);

  return (
    <Table
      columns={tableColumns}
      rows={sortedGuardians}
      getRowId={(row) => row.id}
      loading={parentLoading || loading}
      error={error ? `Error: ${error}` : ''}
      emptyMessage={getTableInfoMessage()}
      containerRef={tableRef}
      gradeTabs={{
        options: grades,
        currentValue: currentClass,
        onChange: handleClassChange,
        showAll: true,
        allLabel: 'All',
        renderLabel: (grade) => `Grade ${grade}`
      }}
      infoText={getTableInfoMessage()}
      tableLabel="Guardians"
      onRowClick={({ rowId, event }) => handleRowClick(rowId, event)}
      rowClassName={getVisibleRowClassName}
      expandedRowId={expandedRow}
      renderExpandedRow={({ row }) => renderExpandedContent(row)}
      expandedRowColSpan={7}
      persistExpandedRows={true}
      hideMainRowWhenExpanded={true}
      getExpandedRowClassName={({ isExpanded }) => `${styles.expandRow} ${isExpanded ? styles.expandRowActive : ''}`}
      striped={false}
      noDataColSpan={7}
      className={styles.guardianTableContainer}
      wrapperClassName={styles.tableWrapper}
    />
  );
};

export default GuardianTable;