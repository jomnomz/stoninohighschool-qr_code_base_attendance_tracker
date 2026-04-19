import { useState } from 'react';
import styles from './AdminSettings.module.css';
import PageLabel from "../../../Components/UI/Labels/PageLabel/PageLabel.jsx";
import ChangePasswordForm from '../../../Components/Forms/ChangePasswordForm/ChangePasswordForm.jsx';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../../../Components/Authentication/AuthProvider/AuthProvider.jsx';
import { useToast } from '../../../Components/Toast/ToastContext/ToastContext.jsx';
import Chatbot from '../../../Components/Forms/Chatbot/Chatbot.jsx';

function AdminSettings() {
  const { user } = useAuth();
  const { success } = useToast();
  
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (currentPassword, newPassword) => {
    setChangingPassword(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/teacher-invite/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        success('Password changed successfully! You can continue using your session.');
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
        return true; // Success
      } else {
        // Return error message for form display
        return { error: data.error || 'Failed to change password. Please check your current password.' };
      }
    } catch (error) {
      console.error('Password change error:', error);
      return { error: 'Connection error. Please try again.' };
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main className={styles.main}>
      <PageLabel 
        icon={<SettingsIcon sx={{ fontSize: 50, mb: -0.7 }}  />}  
        label="Settings"
      />
      
      <div className={styles.contentWrapper}>
        <div className={styles.settingsColumn}>
          <div className={styles.section}>
            <h3>Change Password</h3>
            <ChangePasswordForm 
              onChangePassword={handlePasswordChange}
              loading={changingPassword}
            />
          </div>
        </div>
        
        <div className={styles.chatbotColumn}>
          <div className={styles.section}>
            <h3>AI Assistant</h3>
            <Chatbot />
          </div>
        </div>
      </div>
    </main>
  );
}

export default AdminSettings;