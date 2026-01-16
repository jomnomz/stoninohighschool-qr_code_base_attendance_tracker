import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useEntityEdit } from '../../hooks/useEntityEdit';
import { useRowExpansion } from '../../hooks/useRowExpansion';
import { sortEntities } from '../../../Utils/SortEntities';
import { compareSections } from '../../../Utils/CompareHelpers';
import Button from '../../UI/Buttons/Button/Button';
import SectionDropdown from '../../UI/Buttons/SectionDropdown/SectionDropdown';
import styles from './Table.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as farCircle } from "@fortawesome/free-regular-svg-icons";
import { faCircle as fasCircle, faPenToSquare, faTrashCan, faQrcode } from "@fortawesome/free-solid-svg-icons";

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

const Table = ({
  // Data
  data = [],
  loading = false,
  error = null,
  
  // Configuration
  entityType = 'generic',
  columns = [],
  grades = ['7', '8', '9', '10'],
  availableSections = [],
  
  // Actions
  onEdit = null,
  onDelete = null,
  onQrCode = null,
  onSaveEdit = null,
  
  // Custom renderers
  renderEditInput = null,
  renderEditCell = null,
  renderExpandedRow = null,
  renderActionButtons = null,
  renderCustomCell = null,
  
  // Filters
  searchTerm = '',
  selectedSection = '',
  currentClass = 'all',
  onClassChange = () => {},
  onSectionSelect = () => {},
  
  // Selection
  selectedItems = [],
  onItemSelect = () => {},
  onSelectAll = () => {},
  
  // Services
  entityService = null,
  
  // Custom handlers
  shouldHandleRowClick = () => true,
  getRowColorClass = (index) => index % 2 === 0 ? styles.rowEven : styles.rowOdd,
  
  // Props
  refreshData = () => {},
  refreshAllData = () => {},
  onClearSectionFilter = () => {},
  onSingleDeleteClick = null,
  
  // UI
  showClassFilter = true,
  showSectionFilter = true,
  showSelectColumn = true,
  expandable = true,
  editable = true,
  
  // Modals
  Modals = null,
  modalProps = {},
  
  // Edit state management
  editingData = null,
  onEditChange = null,
  onEditSave = null,
  onEditCancel = null,
  editFormData = {},
  validationErrors = {},
  saving = false
}) => {
  const [filteredData, setFilteredData] = useState([]);
  const [sortedData, setSortedData] = useState([]);
  const [sectionInputValue, setSectionInputValue] = useState('');
  const [sectionSuggestionsId] = useState(() => `sectionSuggestions_${Math.random().toString(36).substr(2, 9)}`);
  
  // Initialize edit hook with parent's setter if provided
  const { editingId, startEdit, cancelEdit, updateEditField } = useEntityEdit(
    data,
    onEditChange || (() => {}),
    entityType,
    refreshAllData
  );
  
  const { expandedRow, tableRef, toggleRow, isRowExpanded } = useRowExpansion();
  
  // Get all unique sections from data
  const allUniqueSections = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    const sections = data
      .map(item => {
        // Handle section extraction based on entity type
        if (entityType === 'student' || entityType === 'guardian') {
          if (typeof item.section === 'object' && item.section !== null) {
            return item.section.section_name || '';
          }
          return item.section?.toString() || '';
        }
        return '';
      })
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort(compareSections);
  }, [data, entityType]);
  
  // Get sections for current grade/class
  const currentGradeSections = useMemo(() => {
    if (currentClass === 'all') {
      return allUniqueSections;
    }
    
    if (!data || !Array.isArray(data)) return [];
    
    const sections = data
      .filter(item => {
        const itemGrade = typeof item.grade === 'object' && item.grade !== null 
          ? item.grade.grade_level 
          : item.grade?.toString();
        return itemGrade === currentClass;
      })
      .map(item => {
        if (typeof item.section === 'object' && item.section !== null) {
          return item.section.section_name || '';
        }
        return item.section?.toString() || '';
      })
      .filter(section => section && section.trim() !== '');
    
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.sort(compareSections);
  }, [data, currentClass, allUniqueSections]);
  
  // Sections to show in dropdown
  const sectionsToShowInDropdown = useMemo(() => {
    if (!selectedSection) {
      return currentGradeSections;
    }
    return allUniqueSections;
  }, [selectedSection, currentGradeSections, allUniqueSections]);
  
  // Filtered section suggestions for input
  const filteredSectionSuggestions = useMemo(() => {
    if (!sectionInputValue) return allUniqueSections;
    
    const inputLower = sectionInputValue.toLowerCase();
    return allUniqueSections.filter(section => 
      section.toLowerCase().includes(inputLower)
    );
  }, [allUniqueSections, sectionInputValue]);
  
  // Filter data based on search, class, and section
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let filtered = [...data];
    
    // Apply class filter
    if (currentClass !== 'all') {
      filtered = filtered.filter(item => {
        const itemGrade = typeof item.grade === 'object' && item.grade !== null 
          ? item.grade.grade_level 
          : item.grade?.toString();
        return itemGrade === currentClass;
      });
    }
    
    // Apply section filter
    if (selectedSection) {
      filtered = filtered.filter(item => {
        const itemSection = typeof item.section === 'object' && item.section !== null
          ? item.section.section_name
          : item.section?.toString();
        return itemSection === selectedSection;
      });
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        // Check all string fields for search
        return Object.entries(item).some(([key, value]) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          } else if (typeof value === 'object' && value !== null) {
            // Check nested object string properties
            return Object.values(value).some(nestedValue => 
              typeof nestedValue === 'string' && 
              nestedValue.toLowerCase().includes(searchLower)
            );
          }
          return false;
        });
      });
    }
    
    return filtered;
  }, [data, currentClass, selectedSection, searchTerm, entityType]);
  
  // Sort data
  useEffect(() => {
    const sorted = sortEntities(processedData, { type: entityType });
    setSortedData(sorted);
    setFilteredData(processedData);
  }, [processedData, entityType]);
  
  const handleClassChange = (className) => {
    onClassChange(className);
    toggleRow(null);
    cancelEdit();
  };
  
  const handleSectionFilter = (section) => {
    onSectionSelect(section);
  };
  
  const handleRowClick = (itemId, e) => {
    if (shouldHandleRowClick(editingId, e.target) && expandable) {
      toggleRow(itemId);
    }
  };
  
  const handleEditClick = (item, e) => {
    e.stopPropagation();
    
    // Prepare item for editing
    const itemForEdit = { ...item };
    
    // Convert grade/section objects to strings for editing if needed
    if (entityType === 'student' || entityType === 'guardian') {
      itemForEdit.grade = typeof item.grade === 'object' ? item.grade.grade_level : item.grade;
      itemForEdit.section = typeof item.section === 'object' ? item.section.section_name : item.section;
    }
    
    startEdit(itemForEdit);
    if (itemForEdit.section) {
      setSectionInputValue(itemForEdit.section);
    }
    toggleRow(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateEditField(name, value);
    
    if (name === 'section') {
      setSectionInputValue(value);
    }
  };
  
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    updateEditField(name, value);
  };
  
  const handleSaveEdit = async (itemId, e) => {
    if (e) e.stopPropagation();
    
    if (onSaveEdit) {
      try {
        const result = await onSaveEdit(itemId, editFormData, {
          currentClass,
          entityService,
          cancelEdit: () => {
            cancelEdit();
            setSectionInputValue('');
          },
          setSectionInputValue: (value) => setSectionInputValue(value || '')
        });
        
        if (result?.success) {
          setSectionInputValue('');
        }
      } catch (error) {
        console.error('Error saving edit:', error);
      }
    } else {
      // If no onSaveEdit provided, just cancel edit
      cancelEdit();
      setSectionInputValue('');
    }
  };
  
  const handleInputClick = (e) => {
    e.stopPropagation();
  };
  
  const handleDeleteClick = (item, e) => {
    e.stopPropagation();
    if (onSingleDeleteClick) {
      onSingleDeleteClick(item);
    } else if (onDelete) {
      onDelete(item);
    }
  };
  
  const handleQRCodeClick = (item, e) => {
    e.stopPropagation();
    if (onQrCode) {
      onQrCode(item);
    }
  };
  
  const handleItemSelect = (itemId, e) => {
    e.stopPropagation();
    onItemSelect(itemId);
  };
  
  const handleSelectAllClick = () => {
    const allVisibleIds = sortedData.map(item => item.id);
    onSelectAll(allVisibleIds);
  };
  
  const allVisibleSelected = sortedData.length > 0 && 
    sortedData.every(item => selectedItems.includes(item.id));
  
  // Default renderers
  const defaultRenderEditInput = (fieldName, type = 'text', placeholder = '') => (
    <input
      type={type}
      name={fieldName}
      value={editFormData[fieldName] || ''}
      onChange={handleInputChange}
      onClick={handleInputClick}
      className={`${styles.editInput} ${validationErrors[fieldName] ? styles.errorInput : ''} edit-input`}
      placeholder={placeholder}
    />
  );
  
  const defaultRenderGradeDropdown = () => (
    <select
      name="grade"
      value={editFormData.grade || ''}
      onChange={handleSelectChange}
      onClick={handleInputClick}
      className={`${styles.editSelect} ${validationErrors.grade ? styles.errorInput : ''} edit-input`}
    >
      <option value="">Select grade</option>
      {grades.map(grade => (
        <option key={grade} value={grade}>
          {grade}
        </option>
      ))}
    </select>
  );
  
  const defaultRenderSectionInput = () => (
    <>
      <input
        type="text"
        name="section"
        list={sectionSuggestionsId}
        value={editFormData.section || ''}
        onChange={handleInputChange}
        onClick={handleInputClick}
        className={`${styles.editInput} ${validationErrors.section ? styles.errorInput : ''} edit-input`}
        placeholder="Enter section"
        autoComplete="off"
      />
      <datalist id={sectionSuggestionsId}>
        {filteredSectionSuggestions.map(section => (
          <option key={section} value={section} />
        ))}
      </datalist>
    </>
  );
  
  const defaultRenderActionButtons = (item) => (
    <div className={`${styles.editActions} action-button`}>
      <button 
        onClick={(e) => handleSaveEdit(item.id, e)}
        disabled={saving}
        className={styles.saveBtn}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button 
        onClick={() => {
          cancelEdit();
          setSectionInputValue('');
        }}
        disabled={saving}
        className={styles.cancelBtn}
      >
        Cancel
      </button>
    </div>
  );
  
  const defaultRenderEditCell = (item) => (
    <div className={styles.editCell}>
      {editingId === item.id ? (
        renderActionButtons ? renderActionButtons(item) : defaultRenderActionButtons(item)
      ) : (
        <div className={styles.icon}>
          <FontAwesomeIcon 
            icon={faPenToSquare} 
            onClick={(e) => handleEditClick(item, e)}
            className="action-button"
          />
        </div>
      )}
    </div>
  );
  
  const defaultRenderExpandedRow = (item) => {
    const addedAt = formatDateTimeLocal(item.created_at);
    const updatedAt = item.updated_at ? formatDateTimeLocal(item.updated_at) : 'Never updated';
    
    return (
      <tr className={`${styles.expandRow} ${isRowExpanded(item.id) ? styles.expandRowActive : ''}`}>
        <td colSpan={columns.length + (showSelectColumn ? 1 : 0)}>
          <div 
            className={`${styles.expandableCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.itemHeader}>
              {entityType === 'student' && `${item.first_name} ${item.last_name}`}
              {entityType === 'teacher' && `${item.first_name} ${item.last_name}`}
              {entityType === 'guardian' && `${item.first_name} ${item.last_name}`}
            </div>
          
            <div className={styles.details}>
              <div>
                <div className={styles.itemInfo}>
                  <strong>Details</strong>
                </div>
                {Object.entries(item).slice(0, 5).map(([key, value]) => {
                  if (typeof value === 'string' && value && !key.includes('password')) {
                    return (
                      <div key={key} className={styles.itemInfo}>
                        {key.replace(/_/g, ' ')}: {value}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
          
              <div>
                <div className={styles.itemInfo}>
                  <strong>Record Information</strong>
                </div>
                <div className={styles.itemInfo}>
                  Added: {addedAt}
                </div>
                <div className={styles.itemInfo}>
                  Last Updated: {updatedAt}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };
  
  const renderField = (item, column) => {
    if (editingId === item.id && editable) {
      // Use custom renderer if provided
      if (renderEditInput) {
        return renderEditInput(column.key, item);
      }
      
      // Default field rendering for editing
      if (column.key === 'grade' && entityType === 'student') {
        return defaultRenderGradeDropdown();
      } else if (column.key === 'section' && entityType === 'student') {
        return defaultRenderSectionInput();
      } else {
        return defaultRenderEditInput(
          column.key,
          column.key.includes('email') ? 'email' : 'text',
          column.label
        );
      }
    }
    
    // Use custom cell renderer if provided
    if (renderCustomCell) {
      return renderCustomCell(item, column);
    }
    
    // Default field display
    const value = item[column.key];
    if (value === null || value === undefined) return '';
    
    // Hide certain fields from main table for students
    if (entityType === 'student') {
      if (column.key === 'email' || column.key === 'phone_number' || column.key.startsWith('guardian_')) {
        return ''; // Hide from main table, only show in expanded row
      }
    }
    
    if (typeof value === 'object') {
      // Handle nested objects
      if (column.key === 'grade' && value.grade_level) {
        return value.grade_level;
      } else if (column.key === 'section' && value.section_name) {
        return value.section_name;
      }
      return JSON.stringify(value);
    }
    
    return value;
  };
  
  const renderRow = (item, index, isExpanded) => {
    const rowColorClass = getRowColorClass(index);
    const isSelected = selectedItems.includes(item.id);
    
    if (isExpanded) {
      return (
        <React.Fragment key={item.id}>
          {/* Hidden row for maintaining table structure */}
          <tr 
            className={`${styles.itemRow} ${rowColorClass} ${editingId === item.id ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
            onClick={(e) => handleRowClick(item.id, e)}
            style={{ height: '0px', visibility: 'hidden', overflow: 'hidden' }}
          >
            {showSelectColumn && (
              <td style={{ height: '0px', padding: '0', border: 'none' }}>
                <div className={styles.icon} onClick={(e) => handleItemSelect(item.id, e)}>
                  <FontAwesomeIcon 
                    icon={isSelected ? fasCircle : farCircle} 
                    style={{ 
                      cursor: 'pointer', 
                      color: isSelected ? '#007bff' : '',
                      visibility: 'hidden'
                    }}
                  />
                </div>
              </td>
            )}
            
            {columns.map((column, colIndex) => (
              <td key={colIndex} style={{ height: '0px', padding: '0', border: 'none' }}>
                {renderField(item, column)}
              </td>
            ))}
          </tr>
          
          {/* Expanded row */}
          {renderExpandedRow 
            ? renderExpandedRow(item, { rowColorClass, isSelected })
            : defaultRenderExpandedRow(item)}
        </React.Fragment>
      );
    }
    
    return (
      <tr 
        key={item.id}
        className={`${styles.itemRow} ${rowColorClass} ${editingId === item.id ? styles.editingRow : ''} ${isSelected ? styles.selectedRow : ''}`}
        onClick={(e) => handleRowClick(item.id, e)}
      >
        {showSelectColumn && (
          <td>
            <div className={styles.icon} onClick={(e) => handleItemSelect(item.id, e)}>
              <FontAwesomeIcon 
                icon={isSelected ? fasCircle : farCircle} 
                style={{ 
                  cursor: 'pointer', 
                  color: isSelected ? '#007bff' : '' 
                }}
              />
            </div>
          </td>
        )}
        
        {columns.map((column, colIndex) => {
          // Check if this is an action column
          if (column.isAction) {
            if (column.key === 'edit' && editable) {
              return (
                <td key={colIndex}>
                  {renderEditCell ? renderEditCell(item) : defaultRenderEditCell(item)}
                </td>
              );
            } else if (column.key === 'delete') {
              return (
                <td key={colIndex}>
                  <div className={styles.icon}>
                    <FontAwesomeIcon 
                      icon={faTrashCan} 
                      className="action-button"
                      onClick={(e) => handleDeleteClick(item, e)}
                    />
                  </div>
                </td>
              );
            } else if (column.key === 'qr_code' && onQrCode) {
              return (
                <td key={colIndex}>
                  <div className={styles.icon}>
                    <FontAwesomeIcon 
                      icon={faQrcode} 
                      onClick={(e) => handleQRCodeClick(item, e)} 
                      className="action-button"
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </td>
              );
            }
          }
          
          return (
            <td key={colIndex}>
              {renderField(item, column)}
            </td>
          );
        })}
      </tr>
    );
  };
  
  const getTableInfoMessage = () => {
    const itemCount = sortedData.length;
    const selectedCount = selectedItems.filter(id => 
      sortedData.some(item => item.id === id)
    ).length;
    
    let message = '';
    
    if (selectedSection) {
      message = `Showing ${itemCount} student/s in Section ${selectedSection}`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
      
      if (searchTerm) {
        message += ` matching "${searchTerm}"`;
      }
    } else if (searchTerm) {
      message = `Found ${itemCount} student/s matching "${searchTerm}"`;
      
      if (currentClass === 'all') {
        message += ' across all grades';
      } else {
        message += ` in Grade ${currentClass}`;
      }
    } else {
      if (currentClass === 'all') {
        message = `Showing ${itemCount} student/s across all grades`;
      } else {
        message = `Showing ${itemCount} student/s in Grade ${currentClass}`;
      }
    }
    
    if (selectedCount > 0) {
      message += ` (${selectedCount} selected)`;
    }
    
    return message;
  };
  
  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className={styles.tableContainer} ref={tableRef}>
      <div className={styles.tableWrapper}>
        <div className={styles.tableHeader}>
          {(showClassFilter && entityType === 'student') && (
            <div className={styles.classContainers}>
              <Button 
                label="All"
                tabBottom={true}
                height="xs"
                width="xs-sm"
                color="grades"
                active={currentClass === 'all'}
                onClick={() => handleClassChange('all')}
              >
                All
              </Button>
              
              {grades.map(grade => (
                <Button 
                  key={grade}
                  label={`Grade ${grade}`}
                  tabBottom={true}
                  height="xs"
                  width="xs-sm"
                  color="grades"
                  active={currentClass === grade}
                  onClick={() => handleClassChange(grade)}
                >
                  Grade {grade}
                </Button>
              ))}
            </div>
          )}
          
          <div className={styles.tableInfo}>
            <p>{getTableInfoMessage()}</p>
          </div>
        </div>
        
        <div className={styles.scrollWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {showSelectColumn && (
                  <th>
                    <div className={styles.icon} onClick={handleSelectAllClick}>
                      <FontAwesomeIcon 
                        icon={allVisibleSelected ? fasCircle : farCircle} 
                        style={{ 
                          cursor: 'pointer',
                          color: allVisibleSelected ? '#007bff' : '' 
                        }}
                      />
                    </div>
                  </th>
                )}
                
                {columns.map((column, index) => (
                  <th key={index}>
                    {column.key === 'section' && showSectionFilter ? (
                      <div className={styles.sectionHeader}>
                        <div className={styles.sectionHeaderRow}>
                          <span>{column.label}</span>
                          <SectionDropdown 
                            availableSections={sectionsToShowInDropdown}
                            selectedValue={selectedSection}
                            onSelect={handleSectionFilter}
                          />
                        </div>
                      </div>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + (showSelectColumn ? 1 : 0)} 
                    className={styles.noItems}
                  >
                    {getTableInfoMessage()}
                  </td>
                </tr>
              ) : (
                sortedData.map((item, index) => {
                  const isExpanded = isRowExpanded(item.id);
                  return renderRow(item, index, isExpanded);
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Render custom modals if provided */}
      {Modals && <Modals {...modalProps} />}
    </div>
  );
};

export default Table;