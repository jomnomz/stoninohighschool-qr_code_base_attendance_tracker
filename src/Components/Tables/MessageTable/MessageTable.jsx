import React, { useState, useEffect } from 'react';
import Button from '../../UI/Buttons/Button/Button';
import styles from './MessageTable.module.css';

const MessageTable = () => {
  const [currentClass, setCurrentClass] = useState('7');
  const [expandedRow, setExpandedRow] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const mockMessage = [
      {
        recipient: 'Christian Quijote (09109876352)',
        message: 'Flord Quijote entered the school at 7:41:13 am',
        date_time: '01/15/2026 7:41:17',
      }
    ];
    setMessages(mockMessage);
    setLoading(false);
  }, [currentClass]);

  const handleClassChange = (className) => {
    setCurrentClass(className);
    setExpandedRow(null);
  };

  const toggleCard = (messageId) => {
    if (expandedRow === messageId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(messageId);
    }
  };

  const grades = ['7', '8', '9', '10'];

  return (
    <div className={styles.messageTableContainer}>
      <div className={styles.messageTable}>
        <div className={styles.classContainers}>
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

          <div className={styles.tableInfo}>
              <p>Showing {messages.length} Guardian/s in Grade {currentClass}</p>
          </div>
        </div>

        <table className={styles.messagesTable}>
          <thead>
            <tr>
              <th>RECIPIENT</th>
              <th>MESSAGE</th>
              <th>DATE AND TIME</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan="3" className={styles.noMessage}>
                  No Message found
                </td>
              </tr>
            ) : (
              messages.map(message => (
                <React.Fragment key={message.id}>
                  <tr 
                    className={`${styles.studentRow} ${expandedRow === message.id ? styles.hiddenRow : ''}`}
                    onClick={() => toggleCard(message.id)}
                  >
                    <td>{message.recipient}</td>
                    <td>{message.message}</td>
                    <td>{message.date_time}</td>
                  </tr>
                  
                  {expandedRow === message.id && (
                    <tr 
                      className={styles.expandRow}
                      onClick={() => toggleCard(message.id)}
                    >
                      <td colSpan="3">
                        <div className={`${styles.messageCard} ${styles.expand} ${styles.show}`}>
                          <div className={styles.messageHeader}>
                            Message Details
                          </div>
                          <div className={styles.messageInfo}>Recipient: {message.recipient}</div>
                          <div className={styles.messageInfo}>Message: {message.message}</div>
                          <div className={styles.messageInfo}>Date and Time: {message.date_time}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MessageTable;