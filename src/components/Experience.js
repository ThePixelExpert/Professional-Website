function Experience() {
  return (
    <section className="section" id="experience">
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Experience</h2>
      <div className="experience-grid">
        <div className="experience-card">
          <h3>Entrepreneurship and Technology Innovation Center</h3>
          <ul>
            <li style={{listStyleType: 'none'}}><strong>ETIC Project Manager (Promoted from ETIC Intern)</strong></li>
            <li>Nov 2024 - Present, Old Westbury, New York</li>
            <li>Contracted by NASA’s Technology Transfer Office to develop and deliver 4 high-end patented prototypes.</li>
            <li>Project managed 3 multidisciplinary engineers to create a patent-pending prototype. Responsible for setting timelines, delegating tasks, monitoring project progress, reporting progress updates to the client, and engineered required circuits for said prototype.</li>
            <li>Designed electrical circuits and PCB designs for 4 NASA patents.</li>
          </ul>
        </div>
        <div className="experience-card">
          <h3>Lavli Inc.</h3>
          <ul>
            <li style={{listStyleType: 'none'}}><strong>Electrical Engineer Contractor</strong></li>
            <li>Feb 2025 - Present, Port Washington, New York</li>
            <li>Designed circuits and PCB designs for multiple integrated systems, including power distribution, sensors and microcontrollers.</li>
            <li>Collaborated with mechanical engineers to ensure seamless integration of electrical components into product designs.</li>
            <li>Conducted testing and troubleshooting of prototypes to ensure functionality and reliability.</li>
            <li>Integrated CanBUS communication protocols into microcontroller system for improved communication and control between components.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default Experience;
