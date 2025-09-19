import React from 'react';
import './AllProjects.css';
import Autodesk from '../assets/autodesk-fusion-360-product-icon-social-400.png';
import Bigstock from '../assets/bigstock-Medical-doctor-working-with-he-89442005 1388x1050.jpg';
import FinalAssembled from '../assets/Final-Assembled-2 1388X1050.jpg';
import Kube from '../assets/Kube.png';
import ProfilePic from '../assets/ProfilePic.JPG';
import SSRG from '../assets/SSRG_Actuator_Mechanical_System_V2.jpg';

export default function AllProjects() {
  const projects = [
    { id: 1, title: 'Autodesk Work', img: Autodesk, desc: 'CAD & modeling samples' },
    { id: 2, title: 'Medical UX', img: Bigstock, desc: 'Healthcare UI mockups' },
    { id: 3, title: 'Final Assembled', img: FinalAssembled, desc: 'Final product photography' },
    { id: 4, title: 'Kubernetes Demo', img: Kube, desc: 'Kubernetes cluster examples' },
    { id: 5, title: 'Personal Site', img: ProfilePic, desc: 'Profile & personal projects' },
    { id: 6, title: 'SSRG Actuator', img: SSRG, desc: 'Mechanical system design' },
  ];

  return (
    <div className="all-projects-page">
      <div className="container">
        <h2>All Projects</h2>
        <div className="projects-grid">
          {projects.map(p => (
            <div key={p.id} className="project-card">
              <img src={p.img} alt={p.title} />
              <div className="card-body">
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="controls">
          <a className="back-link" href="#/">Back to site</a>
        </div>
      </div>
    </div>
  );
}
