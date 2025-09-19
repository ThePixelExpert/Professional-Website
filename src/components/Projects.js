import BigstockImg from '../assets/bigstock-Medical-doctor-working-with-he-89442005 1388x1050.jpg';
import SSRGImg from '../assets/SSRG_Actuator_Mechanical_System_V2.jpg';
import FinalAssemblyImg from '../assets/Final-Assembled-2 1388X1050.jpg';

function Projects() {
  return (
    <section className="section" id="projects">
      <h2 className="main-section-title">Projects</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', alignItems: 'center' }}>
        <div>
          <div className="project-group-label">NASA Projects</div>
          <div className="projects-grid">
            {/* 1st NASA project: image right */}
            <div className="project-card project-card-horizontal image-right">
              <div className="project-card-content">
                <h3>Digital to Analog Transformation</h3>
                <ul>
                  <li><strong>Patent:</strong> US10085662, NASA MSC-TOPS-67</li>
                  <li>Converts 12-lead ECG data between different manufacturers' machines using a custom circuit board and chip protocol.</li>
                  <li>Compact design integrates a Raspberry Pi and digital-to-analog converter for seamless data transformation.</li>
                </ul>
              </div>
              <img src={BigstockImg} alt="Digital to Analog Transformation" className="project-image-placeholder" style={{objectFit: 'cover'}} />
            </div>
            {/* 2nd NASA project: image left */}
            <div className="project-card project-card-horizontal image-left">
              <img src={SSRGImg} alt="Space Suit RoboGlove (SSRG)" className="project-image-placeholder" style={{objectFit: 'cover'}} />
              <div className="project-card-content">
                <h3>Space Suit RoboGlove (SSRG)</h3>
                <ul>
                  <li><strong>Patent:</strong> US11690775, NASA MSC-TOPS-80</li>
                  <li>Assists astronauts with hand movement and reduces injury risk during extravehicular tasks.</li>
                  <li>Miniaturized circuit board controls actuators and sensors, improving fit and function in zero gravity.</li>
                </ul>
              </div>
            </div>
            {/* 3rd NASA project: image right */}
            <div className="project-card project-card-horizontal image-right">
              <div className="project-card-content">
                <h3>Freeze-Resistant Hydration System</h3>
                <ul>
                  <li><strong>Patent:</strong> US9939996, NASA MSC-TOPS-21</li>
                  <li>Keeps water at 40°C and functional down to -40°C using induction heating and advanced power management.</li>
                  <li>Features battery/wall power options and PID-tuned temperature control for reliability in extreme environments.</li>
                </ul>
              </div>
              <img src={FinalAssemblyImg} alt="Freeze-Resistant Hydration System" className="project-image-placeholder" style={{objectFit: 'cover'}} />
            </div>
          </div>
        </div>
        <div>
          <div className="project-group-label">Other Projects</div>
          <div className="projects-grid">
            <div className="project-card">
              <h3>BlendBot Ink Mixer</h3>
              <ul>
                <li>Created for the NYSID CREATE competition in partnership with Spectrum Designs, a nonprofit supporting neurodiverse employment in custom apparel.</li>
                <li>Automates safe, thorough mixing of high-viscosity screen printing ink in 5-gallon buckets, replacing messy and unreliable drill methods.</li>
                <li>Features a planetary gear system, three whisking attachments, a secure lid with viewing window, and a user-friendly controller for variable speed and direction.</li>
                <li>Powered by an 18V battery and Raspberry Pi Pico, with built-in safety controls and an LCD display for real-time feedback.</li>
                <li><a href="https://www.youtube.com/watch?v=vBS_07PjNZ4" target="_blank" rel="noopener noreferrer">Watch the BlendBot Ink Mixer video</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Projects;
