import { useState, useRef, useEffect } from 'react';
import styles from './Chatbot.module.css';
import SendIcon from '@mui/icons-material/Send';
import { GoogleGenerativeAI } from '@google/generative-ai';

function Chatbot() {
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your AI assistant for the QR Code Attendance Tracking System. How can I help you today?", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText;
    setInputText('');
    
    // Add user message
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    
    setIsLoading(true);

    try {
      
      const apiKey = "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; //
      
      // Quick validation
      if (!apiKey || apiKey === "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx") {
        throw new Error('Please replace the placeholder API key with your actual Gemini API key');
      }
      
      if (!apiKey.startsWith('AIza')) {
        throw new Error('Invalid API key format. Gemini keys should start with "AIza"');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });

      // Prepare conversation history (last 4 messages)
      const recentMessages = messages.slice(-4).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // SYSTEM PROMPT WITH SPECIFIC CONTEXT ABOUT YOUR ATTENDANCE SYSTEM
      const systemPrompt = `You are an AI assistant for a QR Code Attendance Tracking System used in educational institutions.

IMPORTANT SYSTEM CONTEXT:
1. SYSTEM NAME: QR Code Attendance Tracking System
2. USER ROLES: Admin, Teacher, Student
3. KEY FEATURES:
   - QR Code generation for classes/sessions
   - Real-time attendance tracking
   - Student check-in via QR code scanning
   - Attendance reports and analytics
   - Admin dashboard for management
   - Teacher portal for class management

4. COMMON ADMIN TASKS:
   - Generate QR codes for classes
   - Manage user accounts (teachers only)
   - Reset passwords
   - Create and upload Students/Teacher/MasterData excel files

5. COMMON TEACHER TASKS:
   - View student attendance that they hold
   - View Stats and trends of students that they hold

6. FREQUENTLY ASKED QUESTIONS:
   Q: How do I add teachers, students, or masterdata into the website?
   A: Go to their respective page and you will see a add student/teacher/masterdata class that will prompt you to add an excel file or a csv file.

   Q: How do students check-in?
   A: Students have their own QR code → Tap "Scan QR" → Automatic check-in or check-out.

   Q: What if a student forgets to scan?
   A: Teachers can manually edit attendance in the Class attendance section and wait for the admin to approve it.

   Q: How many times can you scan a students QR Code?
   A: Only 2 per day.

RESPONSE GUIDELINES:
- Be specific to THIS attendance tracking system
- Provide step-by-step instructions when asked
- If unsure about a feature, say "I'm not sure about that specific feature"
- Refer to actual tabs/sections in the system
- Keep answers concise but helpful
- Don't make up features that don't exist

Current user is likely an administrator or teacher in the Settings section.`;

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          },
          {
            role: "model",
            parts: [{ text: "Understood. I'm the AI assistant for the QR Code Attendance Tracking System. I'll provide accurate information about QR code generation, attendance tracking, user management, reports, and all system features. I'll refer to the actual interface tabs and functionalities." }]
          },
          ...recentMessages
        ],
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.3,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const botMessage = response.text();

      // Add bot response
      setMessages(prev => [...prev, { text: botMessage, sender: 'bot' }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      
      let errorMessage = "Sorry, I'm having trouble connecting. ";
      
      if (error.message.includes('Please replace')) {
        errorMessage += "Please replace the placeholder API key on line 48 with your actual Gemini API key from Google AI Studio.";
      } else if (error.message.includes('Invalid API key')) {
        errorMessage += "Invalid API key format. Make sure you copied the entire key correctly.";
      } else if (error.message.includes('API key not valid') || error.message.includes('quota')) {
        errorMessage += "API key issue. Check if your Gemini API key is valid and has quota remaining.";
      } else if (error.message.includes('Network Error')) {
        errorMessage += "Network error. Check your internet connection.";
      } else {
        errorMessage += error.message;
      }
      
      setMessages(prev => [...prev, { 
        text: errorMessage, 
        sender: 'bot' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatbotSection}>
      <div className={styles.messagesContainer}>
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`${styles.message} ${msg.sender === 'user' ? styles.userMessage : styles.botMessage}`}
          >
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className={styles.loadingMessage}>
            <div className={styles.loadingDots}>
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={styles.inputContainer}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about QR Code Attendance System..."
          className={styles.input}
          disabled={isLoading}
        />
        <button 
          className={styles.sendButton} 
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
        >
          <SendIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
}

export default Chatbot;