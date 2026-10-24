import { useState } from 'react'
import './App.css'

function Chat() {
    const [msg, setMsg] = useState('');
    const [lang, setLang] = useState('en');
    const [chatHistory, setChatHistory] = useState([]);

    var heading = lang === 'en' ? 'Skymart AI Agent' : 'Skymart AI代理'
    var history = lang === 'en' ? 'Chat History' : '聊天记录'

    useEffect(async () => {
        await fetch(`http://127.0.0.1:8000/chat_history`)
            .then(response => response.json())
            .then(data => {
                setChatHistory(data);
            })
            .catch((error) => {
                console.error('Error fetching chat history:', error);
            });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { message: msg };
        try {
            const response = await fetch('http://127.0.0.1:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then(res => res.json())
                .then(data => alert(data.response));
            setFunctioning(true);
            navigate('/Chat', { state: { lang: lang } });
        } catch (error) {
            console.log('Error sending message:', error);
            setFunctioning(false);
        }
    }

    var section = chatHistory.map((entry, index) => (
        <div>
            <div key={index * 2} className="chat-entry">
                <strong>{lang === 'en' ? 'User' : '用户'}:</strong> {entry[0]}
            </div>
            <div key={index * 2 + 1} className="chat-entry">
                <strong>{lang === 'en' ? 'AI' : '人工智能'}:</strong> {entry[1]}
            </div>
        </div>
    ));

    return (
        <div>
            <h1>{heading}</h1>
            <h3>{history}</h3>
            <div className="chat-history">
                {section}
            </div>
            <form onSubmit={handleSubmit} className="section-button">
                <input name="question" type="text" placeholder={language === 'en' ? "Ask a question..." : "问一个问题..."} onChange={(e) => setQuestion(e.target.value)} />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}

export default Chat;