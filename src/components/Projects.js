import React from 'react';
import ProjectGrid from './ProjectGrid';
import Banner from './Banner';

function Projects() {
  return (
    <>
      <Banner />
      <section className="section projects-section" id="projects">
        <div className="container">
          <h2>Projects</h2>
          
          <ProjectGrid showAll={false} maxPerGroup={2} alternateImages={true} />

          <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
            <a className="show-all-btn" href="#/all-projects">Show all projects</a>
          </div>
        </div>
      </section>
    </>
  );
}

export default Projects;
