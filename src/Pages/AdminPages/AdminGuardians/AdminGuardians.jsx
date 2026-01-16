import { useState, useCallback, useEffect } from 'react';
import styles from './AdminGuardians.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import SectionLabel from '../../../Components/UI/Labels/SectionLabel/SectionLabel.jsx';
import GuardianTable from '../../../Components/Tables/GuardianTable/GuardianTable.jsx';
import Input from '../../../Components/UI/Input/Input.jsx';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import { supabase } from '../../../lib/supabase';

function AdminGuardians() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [currentGrade, setCurrentGrade] = useState('all');
  const [allGuardians, setAllGuardians] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch all guardians from the database
  const fetchAllGuardians = useCallback(async () => {
    try {
      console.log('🔄 Fetching ALL guardians from database...');
      setLoadingData(true);
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          guardian_first_name,
          guardian_middle_name,
          guardian_last_name,
          guardian_email,
          guardian_phone_number,
          first_name,
          last_name,
          middle_name,
          lrn,
          grade:grades(grade_level),
          section:sections(section_name)
        `)
        .not('guardian_first_name', 'is', null)
        .not('guardian_last_name', 'is', null);
      
      if (error) throw error;
      
      // Transform data to guardian format
      const transformedData = (data || []).map(student => ({
        id: student.id,
        first_name: student.guardian_first_name,
        middle_name: student.guardian_middle_name,
        last_name: student.guardian_last_name,
        email: student.guardian_email,
        phone_number: student.guardian_phone_number,
        // Student information
        guardian_of: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
        student_lrn: student.lrn,
        // Flatten grade and section
        grade: student.grade?.grade_level || 'N/A',
        section: student.section?.section_name || 'N/A'
      }));
      
      setAllGuardians(transformedData);
      console.log('✅ All guardians loaded:', transformedData.length);
      
    } catch (err) {
      console.error('❌ Error loading all guardians:', err);
      setAllGuardians([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllGuardians();
  }, [fetchAllGuardians]);

  const refreshGuardians = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    fetchAllGuardians();
    setRefreshTrigger(prev => prev + 1);
  }, [fetchAllGuardians]);

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

  // Filter guardians based on search term
  const filteredGuardians = useCallback(() => {
    if (!searchTerm.trim()) {
      return allGuardians;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    return allGuardians.filter(guardian => 
      guardian.first_name?.toLowerCase().includes(searchLower) ||
      guardian.last_name?.toLowerCase().includes(searchLower) ||
      guardian.guardian_of?.toLowerCase().includes(searchLower) ||
      guardian.student_lrn?.toLowerCase().includes(searchLower) ||
      guardian.email?.toLowerCase().includes(searchLower) ||
      guardian.phone_number?.toLowerCase().includes(searchLower) ||
      guardian.grade?.toString().toLowerCase().includes(searchLower) ||
      guardian.section?.toString().toLowerCase().includes(searchLower)
    );
  }, [allGuardians, searchTerm]);

  return (
    <>
      <main className={styles.main}>
        <PageLabel 
          icon={<FamilyRestroomIcon sx={{ fontSize: 50, mb: -0.7 }} />}  
          label="Guardians"
        />
        <SectionLabel label="Guardian Records" />
        
        <div className={styles.top}>
          <div className={styles.searchAndFilter}>
            <Input 
              placeholder="Search Guardian Records" 
              value={searchTerm}
              onChange={handleSearchChange}
              search="true"
            />
          </div>
        </div>

        {loadingData ? (
          <div className={styles.loadingContainer}>
            <p>Loading guardian data...</p>
          </div>
        ) : (
          <GuardianTable 
            key={`guardian-table-${refreshTrigger}`}
            searchTerm={searchTerm}
            selectedSection={selectedSection}
            onSectionsUpdate={handleSectionsUpdate}
            onGradeUpdate={handleGradeUpdate}
            onClearSectionFilter={handleClearSectionFilter}
            onSectionSelect={handleSectionSelect}
            availableSections={availableSections}
            // Pass filtered guardians data directly
            guardians={filteredGuardians()}
            loading={loadingData}
          />
        )}
      </main>
    </>
  );
}

export default AdminGuardians;