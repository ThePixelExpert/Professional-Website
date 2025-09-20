import React from 'react';
import projects from '../data/projects';
import ProjectCard from './ProjectCard';

/**
 * Unified ProjectGrid component - renders projects with optional alternating layout
 */
export default function ProjectGrid({ showAll = false, maxPerGroup = null, alternateImages = true }) {
  const groups = Array.from(new Set(projects.map(p => p.group)));

  return (
    <div className="projects-container">
      {groups.map(g => {
        const groupProjects = projects.filter(p => p.group === g);
        const displayProjects = maxPerGroup && !showAll 
          ? groupProjects.slice(0, maxPerGroup) 
          : groupProjects;

        return (
          <section key={g} id={`group-${g}`} className="project-group">
            <h3 className="project-group-label">{g} Projects</h3>
            <div className="projects-grid">
              {displayProjects.map((p, i) => (
                <ProjectCard 
                  key={p.id} 
                  project={p} 
                  imageLeft={alternateImages ? (i % 2 === 1) : false}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}