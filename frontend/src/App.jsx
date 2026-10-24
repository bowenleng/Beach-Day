import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [lang, setLang] = useState('en')
  const [msg, setMsg] = useState('');
  const [nextMsg, setNextMsg] = useState('');
  const [response, setResponse] = useState('');
  const [chatToggled, setChatToggled] = useState(false)
  const [aiToggled, setAiToggled] = useState(false)
  const [functioning, setFunctioning] = useState(true)

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
      }).then(res => res.json()).then(data => setResponse(data.response));
      setAiToggled(true);
      setFunctioning(true);
      setMsg(nextMsg);
      setNextMsg('');
    } catch (error) {
      console.log('Error sending message:', error);
      setFunctioning(false);
    }
  }

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Welcome to the Beach App!</h1>
          <p>TBA</p>
        </div>
        <button
          type="button"
          className="scroll-down"
          onClick=""
        >
          Checkout the beach planner
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          {aiButton}
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Contact Us</h2>
          <p>{contactNote}</p>
          <ul>
            <li>
              <a href="" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  {/* <use href="/icons.svg#wechat-icon"></use> */}
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
