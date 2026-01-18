  import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './Components/Layouts/AdminLayout/AdminLayout.jsx';
import TeacherLayout from './Components/Layouts/TeacherLayout/TeacherLayout.jsx';
import LoginPage from './Pages/LoginPage/LoginPage.jsx';
import ProtectedRoute from './Components/Authentication/ProtectedRoutes/ProtectedRoute.jsx';
import { AuthProvider } from './Components/Authentication/AuthProvider/AuthProvider.jsx';
import AdminDashboard from './Pages/AdminPages/AdminDashboard/AdminDashboard.jsx';
import AdminStudents from './Pages/AdminPages/AdminStudents/AdminStudents.jsx';
import AdminGuardians from './Pages/AdminPages/AdminGuardians/AdminGuardians.jsx';
import AdminMessages from './Pages/AdminPages/AdminMessages/AdminMessages.jsx';
import AdminAttendance from './Pages/AdminPages/AdminAttendace/AdminAttendance.jsx';
import AdminMasterData from './Pages/AdminPages/AdminMasterData/AdminMasterData.jsx';
import AdminReports from './Pages/AdminPages/AdminReports/AdminReports.jsx';
import AdminTeachers from './Pages/AdminPages/AdminTeachers/AdminTeachers.jsx';
import AdminSettings from './Pages/AdminPages/AdminSettings/AdminSettings.jsx';

import TeacherDashboard from './Pages/TeacherPages/TeacherDashboard/TeacherDashboard.jsx';
import TeacherReports from './Pages/TeacherPages/TeacherReports/TeacherReports.jsx';
import TeacherSettings from './Pages/TeacherPages/TeacherSettings/TeacherSettings.jsx';
import TeacherStudents from './Pages/TeacherPages/TeacherStudents/TeacherStudents.jsx';
import TeacherAttendance from './Pages/TeacherPages/TeacherAtendace/TeacherAttendance.jsx';

import ConfirmInvitation from './Pages/ConfirmInvitation/ConfirmInvitation.jsx';

import { ToastProvider } from './Components/Toast/ToastContext/ToastContext.jsx';

function App() {
  return (
    <ToastProvider>
    <Router>
      <AuthProvider>       
        <main>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route path="/auth/confirm-invitation" element={<ConfirmInvitation />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="guardians" element={<AdminGuardians />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="masterData" element={<AdminMasterData />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="teachers" element={<AdminTeachers />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route
              path="/teacher"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="reports" element={<TeacherReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Routes>
        </main>
      </AuthProvider>
    </Router>
    </ToastProvider>
  );
}

export default App;