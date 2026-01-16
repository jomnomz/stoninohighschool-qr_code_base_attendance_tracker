import { useState, useCallback, useEffect } from 'react';
import styles from './AdminAttendance.module.css'
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import AttendanceTable from '../../../Components/Tables/AttendanceTable/AttendanceTable.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

function AdminAttendance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [currentGrade, setCurrentGrade] = useState('all');
  const [loading, setLoading] = useState(false);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
  };

  const handleClearSectionFilter = () => {
    setSelectedSection('');
  };

  const handleSectionsUpdate = (sections) => {
    setAvailableSections(sections);
  };

  const handleGradeUpdate = (grade) => {
    setCurrentGrade(grade);
  };

  return (
    <main className={styles.main}>
      <PageLabel 
        icon={<AssignmentTurnedInIcon sx={{ fontSize: 50, mb: -0.7 }}  />}  
        label="Attendance"
      />
      <SectionLabel label="Attendance Records" />
      
      <div className={styles.top}>
        <div className={styles.searchAndFilter}>
          <Input 
            placeholder="Search Attendance Records" 
            value={searchTerm}
            onChange={handleSearchChange}
            search="true"
          />
        </div>
      </div>

      <AttendanceTable
        searchTerm={searchTerm}
        selectedSection={selectedSection}
        onSectionsUpdate={handleSectionsUpdate}
        onGradeUpdate={handleGradeUpdate}
        onClearSectionFilter={handleClearSectionFilter}
        onSectionSelect={handleSectionSelect}
        availableSections={availableSections}
        loading={loading}
      />
    </main>
  );
}

export default AdminAttendance;