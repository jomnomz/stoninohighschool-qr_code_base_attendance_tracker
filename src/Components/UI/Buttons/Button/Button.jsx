import { useState } from 'react';
import styles from './Button.module.css';

function Button(props) {
    const { 
        label, 
        icon, 
        iconPosition = 'left', 
        type = "button",
        height = 'md', 
        width = 'full', 
        color = 'primary', 
        onClick, 
        disabled = false,
        pill = false,
        pillLeft = false,
        pillRight = false,
        tabBottom = false,
        line = false,
        active = false,
        backgroundNone = false, 
    } = props;

    const [isHovered, setIsHovered] = useState(false);

    const heightMap = {
        'exit': { fontSize: '20px', height: '20px'},
        xxss: { padding: '0px', fontSize: '25px', height: '40px' },
        xxs: { padding: '8px 16px', fontSize: '12px', height: '28px' },
        xs: { padding: '8px 16px', fontSize: '14px', height: '32px' },
        sm: { padding: '10px 20px', fontSize: '16px', height: '36px' },
        md: { padding: '12px 24px', fontSize: '18px', height: '40px' },
        lg: { padding: '14px 28px', fontSize: '20px', height: '48px' },
        xl: { padding: '16px 32px', fontSize: '22px', height: '56px' },
    };

    const widthMap = {
        auto: { width: 'auto', minWidth: 'fit-content' },
        '95': { width: '95%' },
        'modal': { width: '70px' },
        full: { width: '100%' },
        'exit': { width: '20px'},
        xxss: { width: '40px'},
        xxs: { width: '60px' },
        xs: { width: '80px' },
        'xs-sm': { width: '100px' },
        sm: { width: '120px' },
        md: { width: '160px' },
        lg: { width: '200px' },
        xl: { width: '240px' },
        xxl: { width: '350px' },
    };

    const colorMap = {
        primary: { 
            backgroundColor: '#1e293b', 
            activeBackground: '#059669',
            hoverBackground: '#334155',
            color: '#f8fafc', 
            border: '1px solid #334155',
        },
        secondary: { 
            backgroundColor: '#475569', 
            activeBackground: '#0d9488', 
            hoverBackground: '#64748b', 
            color: '#ffffff', 
            border: 'none',
        },
        success: { 
            backgroundColor: '#016C3F', 
            activeBackground: '#059669', 
            hoverBackground: '#075640ff', 
            color: '#ffffff', 
            border: 'none',
        },
        warning: { 
            backgroundColor: '#d97706', 
            activeBackground: '#b45309', 
            hoverBackground: '#f59e0b', 
            color: '#ffffff', 
            border: 'none',
        },
        danger: { 
            backgroundColor: '#dc2626', 
            activeBackground: '#b91c1c', 
            hoverBackground: '#ef4444', 
            color: '#ffffff', 
            border: 'none',
        },
        grades: { 
            backgroundColor: "#A6A6A5",
            activeBackground: "#112F15",
            hoverBackground: "#d0d0d0",
            color: '#ffffff', 
            border: 'none',
        },
    };

    const getBorderRadius = (pill, pillLeft, pillRight) => {
        if (pillLeft) return '50px 0px 0px 50px';
        if (pillRight) return '0px 50px 50px 0px';
        if (tabBottom) return '25px 25px 0px 0px';
        if (pill) return '50px';
        return '6px'; 
    };

    const heightStyle = heightMap[height] || heightMap.md;
    const widthStyle = widthMap[width] || widthMap.auto;
    const colorStyle = colorMap[color] || colorMap.primary;

    const getBackgroundColor = () => {
        if (line) {
            return 'transparent';
        }

        if (backgroundNone) {
            return 'transparent';
        }
        
        if (active) {
            return colorStyle.activeBackground || colorStyle.backgroundColor;
        }
        
        if (isHovered) {
            return colorStyle.hoverBackground || colorStyle.backgroundColor;
        }
        
        return colorStyle.backgroundColor;
    };

    const getTextColor = () => {
        if (line) {
            if (active) return '#0f6b58';
            if (isHovered) return '#0f6b58';
            return '#1f2937';
        }

        if (backgroundNone) {
            return color === 'primary' ? '#1e293b' : 
                   color === 'secondary' ? '#475569' :
                   color === 'success' ? '#065f46' :
                   color === 'warning' ? '#d97706' :
                   color === 'danger' ? '#dc2626' :
                   color === 'grades' ? '#475569' : '#1e293b';
        }
        return colorStyle.color;
    };

    const getBorder = () => {
        if (line) {
            return 'none';
        }

        if (backgroundNone) {
            return 'none';
        }
        return colorStyle.border;
    };

    const backgroundColor = getBackgroundColor();
    const textColor = getTextColor();
    const border = getBorder();

    const buttonStyle = {
        ...heightStyle,
        ...widthStyle,
        backgroundColor: backgroundColor,
        color: textColor, 
        border: border,
        borderRadius: line ? '0px' : getBorderRadius(pill, pillLeft, pillRight),
        borderBottom: line
            ? (active ? '2px solid #0f6b58' : (isHovered ? '2px solid rgba(15, 107, 88, 0.55)' : '2px solid transparent'))
            : undefined,
        boxShadow: line ? 'none' : (backgroundNone ? 'none' : (active ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)')),
        transition: 'all 0.2s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
    };

    const adjustedStyle = icon && !label ? {
        ...buttonStyle,
        padding: '8px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    } : buttonStyle;

    return (
        <button 
            style={adjustedStyle} 
            type={type}
            className={`${styles.button} ${line ? styles.lineButton : ''} ${line && active ? styles.lineActive : ''}`}
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className={`${styles.content} ${iconPosition === 'right' ? styles.reverse : ''}`}>
                {icon && <span className={styles.icon}>{icon}</span>}
                {label && <span className={styles.label}>{label}</span>}
            </span>
        </button>
    );
}

export default Button;