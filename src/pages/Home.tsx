import reactLogo from '../assets/react.svg'
import viteLogo from '../assets/vite.svg'
import heroImg from '../assets/hero.png'

export default function Home() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Welcome to Open Essex</h1>
          <p>A community for sharing knowledge and resources.</p>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <h2>Member Sections</h2>
          <p>Explore our exclusive content</p>
          <ul>
            <li>Check out the latest Documents.</li>
            <li>Follow our helpful Guides.</li>
            <li>Find your next read in Books.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
