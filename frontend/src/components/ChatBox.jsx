import React, { useState } from 'react';
import { IoMdSend } from "react-icons/io";
import ollama from 'ollama'
import logo from '../assets/swordlogo.jpg'

const ChatBox = () => {
    const [messages,setMessages]=useState([])

    const [value,setValue]=useState("")

    const [loading, setLoading] = useState(false);

    const [isStreaming, setIsStreaming] = useState(false);


    const sendMessage = async () => {
        if (!value.trim()) return;
    
        setValue("");
    
        // Send query request to FastAPI and save response.
        const response = await fetch("http://localhost:8000/chat/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: value }),
        });
    
        if (!response.ok) {
            console.error("Fetch failed with status:", response.status);
        }
    
        // Get context block from response.
        const data = await response.json();
        const context = data.context;
    
        // Display user input to chat.
        const newMessages = [...messages, { role: "user", content: value }];
        setMessages(newMessages);

        setLoading(true);
    
        // Construct prompt.
        const prompt = `You are a customer service representative for InnovativeTech. You are asked questions and you should answer them using the context given. If you do not know the answer and the context is irrelevant to the question, just say you do not know. 
        Question: \n${value} \nContext: \n ${context} \nAnswer: \n`;
    
        try {
            // Send prompt to LLM using Ollama.js
            const responseStream = await ollama.chat({
                model: "qwen2.5:1.5b",
                messages: [...messages, { role: "user", content: prompt }],
                stream: true
            });
    
            let assistantMessage = { role: "assistant", content: "" };
            setMessages((prev) => [...prev, assistantMessage]);

            setIsStreaming(true);
    
            // Handle stream of API responses smoothly.
            for await (const part of responseStream) {
                setMessages((prev) => {
                    return prev.map((msg, index) =>
                        index === prev.length - 1
                            ? { ...msg, content: msg.content + part.message.content }
                            : msg
                    );
                });
            }
        } catch (error) {
            console.error("Error fetching response:", error);
        } finally {
            setLoading(false);
            setIsStreaming(false);
        }
    };

    return (
        <>
            <div className="chat-box">
                <img src={logo} className="logo"></img>
                <div className="chat-innerbox">
                    <div className="messages">
                        {
                            messages?.map((msg,index)=>(
                                <div key={index} className={msg.role}>{msg.content}</div>
                            ))
                        }
                        {loading && !isStreaming && <div className="assistant loading-spinner">Thinking...</div>}
                    </div>
                    {messages.length == 0 && !loading && (
                        <div className="centered-title">Welcome to Sword Group!<br/>What can we help you with?</div>
                    )}  
                    <div className='input-box'>
                        <input 
                            type="text"
                            className='input-control' 
                            placeholder='Type Something'
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            disabled={loading}
                        />
                        <div className='send' onClick={sendMessage}>
                            <IoMdSend />
                        </div> 
                    </div>
                </div>
            </div>
        </>
    )
}
 
export default ChatBox;
