import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, TextField, Button, List, ListItem, ListItemText, Typography, IconButton, Avatar, CircularProgress } from '@mui/material';
import { SmartToy as SmartToyIcon, Close as CloseIcon } from '@mui/icons-material';
import { API_BASE_URL } from '../Subject/utils/utils.js';

const ChatBot = ({ open, onClose, file, formType }) => {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I help you with your appraisal review today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async () => {
        if (input.trim()) {
            const userMessage = { sender: 'user', text: input };
            setMessages(prevMessages => [...prevMessages, userMessage]);
            setInput('');
            setLoading(true);

            if (!file) {
                setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: "Please upload a PDF file first so I can assist you." }]);
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('form_type', formType || '1004');
            formData.append('comment', userMessage.text);

            try {
                const res = await fetch(`${API_BASE_URL}/api/customquery/`, {
                    method: 'POST',
                    body: formData,
                });

                const text = await res.text();
                let botReply = '';

                try {
                    const data = JSON.parse(text);
                    if (data.summary) {
                        botReply = data.summary;
                    } else if (data.fields && data.fields.summary) {
                        botReply = data.fields.summary;
                    } else if (typeof data === 'object') {
                        botReply = JSON.stringify(data, null, 2);
                    } else {
                        botReply = String(data);
                    }
                } catch (e) {
                    botReply = text;
                }

                setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: botReply }]);
            } catch (error) {
                setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: "Sorry, I encountered an error processing your request." }]);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    if (!open) {
        return null;
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: 350,
                height: 500,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1300,
                borderRadius: '10px',
                overflow: 'hidden'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 1 }}>
                        <SmartToyIcon />
                    </Avatar>
                    <Typography variant="h6">DJRB Bot</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon sx={{ color: 'primary.contrastText' }} />
                </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                <List>
                    {messages.map((message, index) => (
                        <ListItem key={index} sx={{
                            display: 'flex',
                            justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 1,
                                    maxWidth: '80%',
                                    bgcolor: message.sender === 'user' ? 'secondary.light' : 'grey.200',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                <ListItemText primary={message.text} />
                            </Paper>
                        </ListItem>
                    ))}
                    {loading && (
                        <ListItem sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Paper elevation={1} sx={{ p: 1, bgcolor: 'grey.200' }}>
                                <CircularProgress size={20} />
                            </Paper>
                        </ListItem>
                    )}
                    <div ref={messagesEndRef} />
                </List>
            </Box>
            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                    />
                    <Button variant="contained" onClick={handleSend} disabled={loading}>Send</Button>
                </Box>
            </Box>
        </Paper>
    );
};

export default ChatBot;
