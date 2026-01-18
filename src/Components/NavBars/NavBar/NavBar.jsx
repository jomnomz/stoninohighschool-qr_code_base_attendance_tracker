import styles from './NavBar.module.css'
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../Authentication/AuthProvider/AuthProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faChalkboardUser,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from 'react';

import DashboardIcon from '@mui/icons-material/Dashboard';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import MessageIcon from '@mui/icons-material/Message';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import TableChartIcon from '@mui/icons-material/TableChart';


function NavBar({ userType = 'admin', onCollapseChange }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { profile } = useAuth()

  const toggleNavbar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onCollapseChange) onCollapseChange(newState);
  };

  const isActive = (path) => {
    return location.pathname === `/${userType}${path}`;
  };

  const navItems = {
    admin: [
      { path: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard', type: 'mui' },
      { path: '/students', icon: faUsers, label: 'Students', type: 'fa' },
      { path: '/guardians', icon: <FamilyRestroomIcon />, label: 'Guardians', type: 'mui' },
      { path: '/messages', icon: <MessageIcon />, label: 'Notifications', type: 'mui' },
      { path: '/attendance', icon: <AssignmentTurnedInIcon />, label: 'Attendance', type: 'mui' },
      { path: '/masterData', icon: <TableChartIcon />, label: 'Master Data', type: 'mui' },
      { path: '/teachers', icon: faChalkboardUser, label: 'Teachers', type: 'fa' },
      // { path: '/reports', icon: <AssignmentIcon />, label: 'Reports', type: 'mui' },
      { path: '/settings', icon: <SettingsIcon />, label: 'Settings', type: 'mui' }
    ],
    teacher: [
      { path: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard', type: 'mui' },
      { path: '/attendance', icon: <AssignmentTurnedInIcon />, label: 'Attendance', type: 'mui' },
      { path: '/students', icon: faUsers, label: 'Students', type: 'fa' },
      { path: '/settings', icon: <SettingsIcon />, label: 'Settings', type: 'mui' }
    ]
  };

  const currentNavItems = navItems[userType] || navItems.admin;

  return (
    <nav className={`${styles.nav} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.admin}>
        <button className={styles.toggleHide} onClick={toggleNavbar}>
          <MenuIcon className={styles.toggleHideIcon}/>
        </button>
        {!isCollapsed && (
          <>
            <p>Welcome!</p>
             <p>
              {userType === 'admin' 
                ? `Admin ${profile?.last_name}`
                : `Teacher ${profile?.last_name}`
              }
            </p>
          </>
        )}
      </div>

      <div className={styles.sideBar}>
        {currentNavItems.map(item => (
          <Link 
            key={item.path}
            to={`/${userType}${item.path}`}
            className={`${styles.sideBarButtons} ${isActive(item.path) ? styles.active : ''}`}
            title={isCollapsed ? item.label : ''}
          >
            {item.type === 'fa' ? (
              <FontAwesomeIcon icon={item.icon} className={styles.sideBarButtonsIcons}/>
            ) : (
              <div className={styles.sideBarButtonsIcons}>
                {item.icon}
              </div>
            )}
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default NavBar;