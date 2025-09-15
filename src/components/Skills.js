import { FaReact,FaNodeJs } from "react-icons/fa";
import kubeLogo from "../assets/Kube.png";

function Skills() {
  return (
    <div className="skills-grid">
      {/* React (react-icon) */}
      <div className="skill">
        <FaReact size={40} color="#61DBFB" className="skill-icon" />
        <p>React</p>
      </div>

      {/* Node.js (react-icon) */}
      <div className="skill">
        <FaNodeJs size={40} color="green" className="skill-icon" />
        <p>Node.js</p>
      </div>

      {/* Kubernetes (custom image) */}
      <div className="skill">
        <img
          src={kubeLogo}
          alt="Kubernetes"
          style={{ width: "40px", height: "40px" }}
          className="skill-icon"
        />
        <p>Kubernetes</p>
      </div>
    </div>
  );
}


export default Skills;
