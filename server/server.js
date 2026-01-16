// server.js - Complete Server with Correct Schema (No Adviser Sections)
import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase.js';
import { sendAttendanceSMS, formatPhoneForSemaphore, checkSemaphoreBalance } from './services/semaphoreSmsService.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ========== TEACHER ATTENDANCE ENDPOINTS ==========

// Get teacher ID by auth user ID
app.get('/api/teacher-invite/get-teacher-id-by-auth', async (req, res) => {
  try {
    const { authUserId } = req.query;
    
    if (!authUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing authUserId parameter'
      });
    }
    
    console.log(`🔍 Looking for teacher with authUserId: ${authUserId}`);
    
    // Query the teachers table for this auth user ID
    const { data, error } = await supabase
      .from('teachers')
      .select('id, employee_id, first_name, last_name, email_address, auth_user_id')
      .eq('auth_user_id', authUserId)
      .single();
    
    if (error || !data) {
      console.log('❌ Teacher not found by authUserId:', error?.message || 'No data');
      return res.status(404).json({
        success: false,
        error: 'Teacher not found with this authentication ID'
      });
    }
    
    console.log(`✅ Found teacher: ${data.id} - ${data.first_name} ${data.last_name}`);
    
    res.json({
      success: true,
      teacherId: data.id,
      teacherData: data
    });
    
  } catch (error) {
    console.error('❌ Error in get-teacher-id-by-auth:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get teacher ID by email
app.get('/api/teacher-invite/get-teacher-id-by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Missing email parameter'
      });
    }
    
    console.log(`🔍 Looking for teacher with email: ${email}`);
    
    // Query the teachers table for this email - using email_address column
    const { data, error } = await supabase
      .from('teachers')
      .select('id, employee_id, first_name, last_name, email_address, auth_user_id')
      .eq('email_address', email)
      .single();
    
    if (error || !data) {
      console.log('❌ Teacher not found by email:', error?.message || 'No data');
      return res.status(404).json({
        success: false,
        error: 'Teacher not found with this email'
      });
    }
    
    console.log(`✅ Found teacher: ${data.id} - ${data.first_name} ${data.last_name}`);
    
    res.json({
      success: true,
      teacherId: data.id,
      teacherData: data
    });
    
  } catch (error) {
    console.error('❌ Error in get-teacher-id-by-email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get teacher's classes (sections they teach) - NO ADVISER SECTIONS
app.get('/api/teacher-invite/teacher-classes/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    if (!teacherId) {
      return res.status(400).json({
        success: false,
        error: 'Missing teacherId parameter'
      });
    }
    
    console.log(`📚 Fetching classes/sections for teacher ID: ${teacherId}`);
    
    // Check if teacher exists first
    const { data: teacherCheck, error: teacherError } = await supabase
      .from('teachers')
      .select('id, employee_id, first_name, last_name, email_address')
      .eq('id', teacherId)
      .single();
    
    if (teacherError || !teacherCheck) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }
    
    // Get sections where teacher is teaching subjects - ONLY THIS
    const { data: teacherSubjectSections, error: tssError } = await supabase
      .from('teacher_subject_sections')
      .select(`
        id,
        teacher_id,
        subject_id,
        section_id,
        created_at,
        subjects (
          id,
          subject_name,
          subject_code
        ),
        sections (
          id,
          section_name,
          grade_id,
          grades (
            id,
            grade_level
          )
        )
      `)
      .eq('teacher_id', teacherId);
    
    if (tssError) {
      console.error('❌ Error fetching teacher subject sections:', tssError);
      // Return empty array instead of throwing
      return res.json({
        success: true,
        teacherName: `${teacherCheck.first_name} ${teacherCheck.last_name}`,
        employeeId: teacherCheck.employee_id,
        email: teacherCheck.email_address,
        classes: []
      });
    }
    
    // Combine and format the data - NO ADVISER SECTIONS
    const classes = [];
    const addedClassKeys = new Set();
    
    // Only add subject-section combinations (no adviser sections)
    if (teacherSubjectSections && teacherSubjectSections.length > 0) {
      teacherSubjectSections.forEach(tss => {
        const subject = tss.subjects;
        const section = tss.sections;
        const grade = section?.grades;
        
        if (subject && section && grade) {
          // Create a unique key to avoid duplicates: grade-section-subject
          const classKey = `${grade.grade_level}-${section.section_name}-${subject.subject_name}`;
          
          if (!addedClassKeys.has(classKey)) {
            classes.push({
              id: tss.id,
              className: `${grade.grade_level}-${section.section_name}`,
              gradeLevel: grade.grade_level,
              section: section.section_name,
              subject: subject.subject_name,
              subjectCode: subject.subject_code,
              schoolYear: '2023-2024', // You might want to make this dynamic
              initialColor: getRandomColor(),
              isAdviser: false,
              sectionId: section.id,
              subjectId: subject.id,
              gradeId: grade.id
            });
            addedClassKeys.add(classKey);
          }
        }
      });
    }
    
    console.log(`✅ Found ${classes.length} classes for teacher ${teacherId} (${teacherCheck.first_name} ${teacherCheck.last_name})`);
    
    res.json({
      success: true,
      teacherName: `${teacherCheck.first_name} ${teacherCheck.last_name}`,
      employeeId: teacherCheck.employee_id,
      email: teacherCheck.email_address,
      classes
    });
    
  } catch (error) {
    console.error('❌ Error in teacher-classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch teacher classes'
    });
  }
});

// Helper function to generate random colors for cards
function getRandomColor() {
  const colors = [
    '#FFB73B', // Orange
    '#3598DB', // Blue
    '#7EC384', // Green
    '#9C27B0', // Purple
    '#F44336', // Red
    '#FF9800', // Orange 2
    '#4CAF50', // Green 2
    '#1565C0', // Blue 2
    '#673AB7', // Purple 2
    '#E91E63', // Pink
    '#795548', // Brown
    '#607D8B', // Blue Grey
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ========== SEMAPHORE SMS ENDPOINTS ==========

app.get('/', async (req, res) => {
  const balance = await checkSemaphoreBalance();
  
  res.json({ 
    message: 'SEMAPHORE SMS SERVER RUNNING',
    timestamp: new Date().toISOString(),
    provider: 'Semaphore (Philippines)',
    instant: 'No Sender ID approval needed',
    cost: '₱0.60-₱0.80 per SMS',
    free_trial: '50 free credits on signup',
    sender_name: process.env.SEMAPHORE_SENDER_NAME || 'Semaphore',
    balance: balance ? `${balance.balance} credits` : 'Not configured',
    status: 'Ready for production'
  });
});

app.get('/api/health', async (req, res) => {
  const balance = await checkSemaphoreBalance();
  
  res.json({ 
    status: '✅ Server Healthy',
    timestamp: new Date().toISOString(),
    sms: {
      provider: 'Semaphore Philippines',
      configured: !!process.env.SEMAPHORE_API_KEY,
      enabled: process.env.SMS_ENABLED === 'true',
      business_hours: `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`,
      rate_limit: `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`,
      cost_per_sms: '₱0.60-₱0.80',
      sender_name: process.env.SEMAPHORE_SENDER_NAME || 'Semaphore',
      balance: balance ? `${balance.balance} credits` : 'N/A'
    },
    environment: process.env.NODE_ENV
  });
});

app.get('/api/semaphore/balance', async (req, res) => {
  try {
    const balance = await checkSemaphoreBalance();
    
    if (!balance) {
      return res.status(400).json({
        success: false,
        error: 'Semaphore not configured'
      });
    }
    
    res.json({
      success: true,
      provider: 'semaphore',
      balance: balance.balance,
      account: balance.name,
      email: balance.email,
      cost_per_sms: '1 credit',
      free_credits: '50 free credits on signup'
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/attendance/sms', async (req, res) => {
  try {
    const { studentId, scanType } = req.body;
    
    if (!studentId || !scanType) {
      return res.status(400).json({
        success: false,
        error: 'Missing studentId or scanType'
      });
    }
    
    if (!['in', 'out'].includes(scanType)) {
      return res.status(400).json({
        success: false,
        error: 'Scan type must be "in" or "out"'
      });
    }
    
    console.log(`📨 Semaphore SMS request: student ${studentId}, ${scanType}`);
    
    const result = await sendAttendanceSMS(studentId, scanType);
    
    res.json({
      success: result.success,
      provider: result.provider,
      cost: result.cost,
      demo: result.demo || false,
      skipped: result.skipped || false,
      message: result.message
    });
    
  } catch (error) {
    console.error('❌ SMS endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/test-semaphore-sms', async (req, res) => {
  try {
    const { phone, studentId } = req.body;
    let testPhone = phone;
    let studentName = 'Test Student';
    let guardianName = 'Test Guardian';
    
    if (studentId && !phone) {
      const { data: student } = await supabase
        .from('students')
        .select('guardian_phone_number, first_name, last_name, guardian_first_name')
        .eq('id', studentId)
        .single();
      
      if (student) {
        testPhone = student.guardian_phone_number;
        studentName = `${student.first_name} ${student.last_name}`;
        guardianName = student.guardian_first_name;
      }
    }
    
    if (!testPhone) {
      return res.status(400).json({ 
        success: false,
        error: 'No phone number provided',
        example: '09171234567'
      });
    }
    
    const now = new Date();
    const phTime = now.toLocaleTimeString('en-PH', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Manila'
    });
    
    const phDate = now.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
    
    const message = `🏫 [SEMAPHORE TEST] Magandang araw ${guardianName}! Ito ay test message mula sa Semaphore SMS. Oras: ${phTime}, Petsa: ${phDate}.`;
    
    res.json({
      success: true,
      phone: testPhone,
      formatted: formatPhoneForSemaphore(testPhone),
      studentName,
      guardianName,
      message_preview: message.substring(0, 60) + '...',
      provider: 'semaphore',
      cost: '₱0.60-₱0.80 per SMS',
      sender: process.env.SEMAPHORE_SENDER_NAME || 'Semaphore',
      instant: 'Works instantly in Philippines',
      free_credits: '50 free credits on signup',
      endpoint: 'POST https://api.semaphore.co/api/v4/messages'
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Simple webhook for testing
app.post('/api/webhooks/attendance', async (req, res) => {
  try {
    const { student_id, scan_type } = req.body;
    
    if (student_id && scan_type) {
      console.log(`🤖 Auto-SMS for student ${student_id}, ${scan_type}`);
      
      // Send async
      sendAttendanceSMS(student_id, scan_type)
        .then(result => {
          console.log(`🤖 Auto-SMS result: ${result.success ? '✅' : '❌'}`);
        })
        .catch(err => {
          console.error('🤖 Auto-SMS error:', err);
        });
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== DEBUG ENDPOINTS ==========

// Check specific teacher
app.get('/api/debug/teacher/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: error.message });
    }
    
    res.json({ teacher: data });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find teacher by any criteria
app.get('/api/debug/find-teacher', async (req, res) => {
  try {
    const { authUserId, email, employeeId } = req.query;
    
    let query = supabase.from('teachers').select('*');
    
    if (authUserId) {
      query = query.eq('auth_user_id', authUserId);
    } else if (email) {
      query = query.eq('email_address', email);
    } else if (employeeId) {
      query = query.eq('employee_id', employeeId);
    } else {
      return res.status(400).json({ error: 'Provide authUserId, email, or employeeId' });
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      return res.status(404).json({ 
        error: 'Teacher not found',
        details: error.message 
      });
    }
    
    res.json({ found: true, teacher: data });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`
  ============================================
  🚀 SERVER STARTED ON PORT ${port}
  ============================================
  
  ✅ AVAILABLE ENDPOINTS:
  
  TEACHER ATTENDANCE (NO ADVISER SECTIONS):
  GET  /api/teacher-invite/get-teacher-id-by-auth
  GET  /api/teacher-invite/get-teacher-id-by-email
  GET  /api/teacher-invite/teacher-classes/:teacherId
  
  SEMAPHORE SMS:
  GET  /                         - Server status
  GET  /api/health              - Health check
  GET  /api/semaphore/balance   - Check credits
  POST /api/attendance/sms      - Send attendance SMS
  POST /api/test-semaphore-sms  - Test SMS
  
  DEBUG:
  GET  /api/debug/teacher/:id   - Check teacher by ID
  GET  /api/debug/find-teacher  - Find teacher by criteria
  
  📱 SEMAPHORE SMS FEATURES:
  • Instant SMS delivery
  • Sender Name: ${process.env.SEMAPHORE_SENDER_NAME || 'Semaphore'}
  • Cost: ₱0.60-₱0.80 per SMS
  • 50 FREE credits on signup
  
  ============================================
  `);
  
  console.log('🔧 Configuration:');
  console.log('SEMAPHORE_API_KEY:', process.env.SEMAPHORE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('SENDER_NAME:', process.env.SEMAPHORE_SENDER_NAME || 'Semaphore (default)');
  console.log('SMS_ENABLED:', process.env.SMS_ENABLED === 'true' ? '✅ Yes' : '❌ No');
  console.log('Business Hours:', `${process.env.SMS_BUSINESS_HOURS_START || 6}:00-${process.env.SMS_BUSINESS_HOURS_END || 21}:00`);
  console.log('Rate Limit:', `${process.env.SMS_RATE_LIMIT_MINUTES || 30} minutes`);
});