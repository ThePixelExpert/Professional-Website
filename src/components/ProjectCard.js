import React from 'react';
import './ProjectCard.css';

export default function ProjectCard({ project, imageLeft = false }) {
  return (
    <div className={`project-card ${imageLeft ? 'image-left' : 'image-right'}`}>
      <div className="project-card-content">
        <h3>{project.title}</h3>
        {project.patent && <p><strong>Patent:</strong> {project.patent}</p>}
        {project.highlights && (
          <ul>
            {project.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
        {project.links && (
          <p>
            {project.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
            ))}
          </p>
        )}
      </div>
      {project.img && (
        <div className="project-image-placeholder">
          <img src={project.img} alt={project.title} />
        </div>
      )}
    </div>
  );
}
