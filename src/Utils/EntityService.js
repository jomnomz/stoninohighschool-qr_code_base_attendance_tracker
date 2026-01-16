import { supabase } from "../lib/supabase"; 

// Base entity service
export class EntityService {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async fetchByField(field, value) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq(field, value);
    
    if (error) throw error;
    return data || [];
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }

  async create(data) {
    const { data: newData, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return newData;
  }
}

// Teacher-specific service with assignment methods
export class TeacherService extends EntityService {
  constructor() {
    super('teachers');
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        created_by_user:users!teachers_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!teachers_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `);
    
    if (error) throw error;
    return data || [];
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users!teachers_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!teachers_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  // NEW: Get teacher's assigned subjects - UPDATED
  async getTeacherSubjects(teacherId) {
    const { data, error } = await supabase
      .from('teacher_subjects')
      .select(`
        subject_id,
        subject:subjects(subject_code, subject_name)
      `)
      .eq('teacher_id', teacherId);
    
    if (error) {
      console.error('Error fetching teacher subjects:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  }

  // NEW: Get teacher's assigned sections - UPDATED
  async getTeacherSections(teacherId) {
    const { data, error } = await supabase
      .from('teacher_sections')
      .select(`
        section_id,
        is_adviser,
        section:sections(
          id,
          section_name,
          grade:grades(grade_level)
        )
      `)
      .eq('teacher_id', teacherId);
    
    if (error) {
      console.error('Error fetching teacher sections:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  }

  // NEW: Get teacher's subject-section assignments - UPDATED
  async getTeacherSubjectSections(teacherId) {
    const { data, error } = await supabase
      .from('teacher_subject_sections')
      .select(`
        subject_id,
        section_id,
        subject:subjects(subject_code, subject_name),
        section:sections(
          section_name,
          grade:grades(grade_level)
        )
      `)
      .eq('teacher_id', teacherId);
    
    if (error) {
      console.error('Error fetching teacher subject-sections:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  }

  // NEW: Get teacher's complete assignments - UPDATED
  async getTeacherAssignments(teacherId) {
    try {
      const [subjectsResult, sectionsResult, assignmentsResult] = await Promise.all([
        this.getTeacherSubjects(teacherId),
        this.getTeacherSections(teacherId),
        this.getTeacherSubjectSections(teacherId)
      ]);

      console.log('📊 Teacher assignments fetched:', {
        teacherId,
        subjects: subjectsResult.data?.length || 0,
        sections: sectionsResult.data?.length || 0,
        assignments: assignmentsResult.data?.length || 0
      });

      return {
        subjects: subjectsResult.data || [],
        sections: sectionsResult.data || [],
        assignments: assignmentsResult.data || [],
        error: null
      };
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
      return {
        subjects: [],
        sections: [],
        assignments: [],
        error
      };
    }
  }

  // NEW: Update teacher assignments
  async updateTeacherAssignments(teacherId, assignments) {
    try {
      // Update subjects
      if (assignments.subjectIds && assignments.subjectIds.length > 0) {
        const subjectAssignments = assignments.subjectIds.map(subjectId => ({
          teacher_id: teacherId,
          subject_id: subjectId
        }));
        
        // Delete existing subjects
        await supabase
          .from('teacher_subjects')
          .delete()
          .eq('teacher_id', teacherId);
        
        // Insert new subjects
        const { error: subjectsError } = await supabase
          .from('teacher_subjects')
          .insert(subjectAssignments);
        
        if (subjectsError) throw subjectsError;
      }

      // Update sections with adviser flag
      if (assignments.sectionIds && assignments.sectionIds.length > 0) {
        const sectionAssignments = assignments.sectionIds.map(sectionId => ({
          teacher_id: teacherId,
          section_id: sectionId,
          is_adviser: assignments.adviserSectionId === sectionId
        }));
        
        // Delete existing sections
        await supabase
          .from('teacher_sections')
          .delete()
          .eq('teacher_id', teacherId);
        
        // Insert new sections
        const { error: sectionsError } = await supabase
          .from('teacher_sections')
          .insert(sectionAssignments);
        
        if (sectionsError) throw sectionsError;
      }

      // Update subject-section assignments
      if (assignments.subjectIds && assignments.sectionIds) {
        const teachingAssignments = [];
        
        assignments.subjectIds.forEach(subjectId => {
          assignments.sectionIds.forEach(sectionId => {
            teachingAssignments.push({
              teacher_id: teacherId,
              subject_id: subjectId,
              section_id: sectionId
            });
          });
        });
        
        if (teachingAssignments.length > 0) {
          // Delete existing teaching assignments
          await supabase
            .from('teacher_subject_sections')
            .delete()
            .eq('teacher_id', teacherId);
          
          // Insert new teaching assignments
          const { error: assignmentsError } = await supabase
            .from('teacher_subject_sections')
            .insert(teachingAssignments);
          
          if (assignmentsError) throw assignmentsError;
        }
      }

      return { success: true, message: 'Teacher assignments updated successfully' };
    } catch (error) {
      console.error('Error updating teacher assignments:', error);
      return { success: false, error: error.message };
    }
  }
}

// Student-specific service - UPDATED WITH GRADE/SECTION RELATIONSHIPS
export class StudentService extends EntityService {
  constructor() {
    super('students');
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        grade_info:grades(
          id,
          grade_level
        ),
        section_info:sections(
          id,
          section_name
        ),
        created_by_user:users!students_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!students_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `);
    
    if (error) throw error;
    
    // Transform data to include proper grade and section names
    const transformedData = (data || []).map(student => ({
      ...student,
      // Use grade from grades table if available, otherwise use text field or fallback
      grade: student.grade_info?.grade_level || student.grade || 'N/A',
      // Use section from sections table if available, otherwise use text field or fallback
      section: student.section_info?.section_name || student.section || 'N/A',
      // Keep original IDs
      grade_id: student.grade_id,
      section_id: student.section_id
    }));
    
    return transformedData;
  }

  async fetchByGrade(grade) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        grade_info:grades(
          id,
          grade_level
        ),
        section_info:sections(
          id,
          section_name
        ),
        created_by_user:users!students_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!students_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .eq('grade', grade);
    
    if (error) throw error;
    
    // Transform data to include proper grade and section names
    const transformedData = (data || []).map(student => ({
      ...student,
      // Use grade from grades table if available, otherwise use text field or fallback
      grade: student.grade_info?.grade_level || student.grade || 'N/A',
      // Use section from sections table if available, otherwise use text field or fallback
      section: student.section_info?.section_name || student.section || 'N/A',
      // Keep original IDs
      grade_id: student.grade_id,
      section_id: student.section_id
    }));
    
    return transformedData;
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        grade_info:grades(
          id,
          grade_level
        ),
        section_info:sections(
          id,
          section_name
        ),
        created_by_user:users!students_created_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        ),
        updated_by_user:users!students_updated_by_fkey(
          user_id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    
    // Transform the single student record
    const transformedStudent = {
      ...data,
      grade: data.grade_info?.grade_level || data.grade || 'N/A',
      section: data.section_info?.section_name || data.section || 'N/A',
      grade_id: data.grade_id,
      section_id: data.section_id
    };
    
    return transformedStudent;
  }

  async generateTokenForStudent(id) {
    const token = crypto.randomUUID();
    return this.update(id, { qr_verification_token: token });
  }
}

// Guardian service - UPDATED TO USE TRANSFORMED DATA
export class GuardianService extends EntityService {
  constructor() {
    super('students'); // Still uses students table but transforms data
  }

  async fetchAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        id,
        first_name,
        last_name,
        grade,
        section,
        grade_id,
        section_id,
        guardian_first_name,
        guardian_middle_name,
        guardian_last_name,
        guardian_phone_number,
        guardian_email,
        grade_info:grades(
          id,
          grade_level
        ),
        section_info:sections(
          id,
          section_name
        )
      `);
    
    if (error) throw error;
    
    // Transform data first, then convert to guardian format
    const transformedData = (data || []).map(student => ({
      ...student,
      grade: student.grade_info?.grade_level || student.grade || 'N/A',
      section: student.section_info?.section_name || student.section || 'N/A'
    }));
    
    return this.transformToGuardianFormat(transformedData);
  }

  async fetchByGrade(grade) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        id,
        first_name,
        last_name,
        grade,
        section,
        grade_id,
        section_id,
        guardian_first_name,
        guardian_middle_name,
        guardian_last_name,
        guardian_phone_number,
        guardian_email,
        grade_info:grades(
          id,
          grade_level
        ),
        section_info:sections(
          id,
          section_name
        )
      `)
      .eq('grade', grade);
    
    if (error) throw error;
    
    // Transform data first, then convert to guardian format
    const transformedData = (data || []).map(student => ({
      ...student,
      grade: student.grade_info?.grade_level || student.grade || 'N/A',
      section: student.section_info?.section_name || student.section || 'N/A'
    }));
    
    return this.transformToGuardianFormat(transformedData);
  }

  async updateGuardian(studentId, guardianData) {
    const updates = {
      guardian_first_name: guardianData.first_name,
      guardian_middle_name: guardianData.middle_name,
      guardian_last_name: guardianData.last_name,
      guardian_phone_number: guardianData.phone_number,
      guardian_email: guardianData.email
    };
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', studentId)
      .select(`
        *,
        grade_info:grades(
          id,
          grade_level
        ),
        section_info:sections(
          id,
          section_name
        )
      `)
      .single();
    
    if (error) throw error;
    
    // Transform the updated student
    const transformedStudent = {
      ...data,
      grade: data.grade_info?.grade_level || data.grade || 'N/A',
      section: data.section_info?.section_name || data.section || 'N/A'
    };
    
    return this.transformToGuardianFormat([transformedStudent])[0];
  }

  transformToGuardianFormat(students) {
    return students.map(student => ({
      id: student.id,
      first_name: student.guardian_first_name,
      middle_name: student.guardian_middle_name,
      last_name: student.guardian_last_name,
      phone_number: student.guardian_phone_number,
      email: student.guardian_email,
      student_id: student.id,
      guardian_of: `${student.first_name} ${student.last_name}`,
      grade: student.grade,
      section: student.section
    }));
  }
}