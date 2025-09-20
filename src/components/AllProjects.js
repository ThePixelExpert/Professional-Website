import React from 'react';
import projects from '../data/projects';
import ProjectGrid from './ProjectGrid';
import Banner from './Banner';
import './AllProjects.css';

export default function AllProjects() {
  const groups = Array.from(new Set(projects.map(p => p.group)));

  return (
    <div className="all-projects-page">
      <Banner sections={[]} categoryButtons={groups} showBack={true} backHref="#/" />
      <div className="container">
        <h2>All Projects</h2>
        
        <ProjectGrid showAll={true} />
      </div>
    </div>
  );
}
