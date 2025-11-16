import { 
  FaLinux, FaRaspberryPi, FaDocker, FaNetworkWired, FaBolt, FaReact, FaNodeJs 
} from "react-icons/fa";
import { SiKubernetes, SiProxmox, SiVirtualbox, SiTruenas, SiPfsense, SiArduino, SiEagle, SiEasyeda, SiOllama } from "react-icons/si";
import FusionLogo from "../assets/autodesk-fusion-360-product-icon-social-400.png";
const skills = [
  { name: "Linux", desc: "Operating System", icon: <FaLinux className="skill-icon" style={{color:'#333'}} /> },
  { name: "Raspberry Pi", desc: "Single Board Computer", icon: <FaRaspberryPi className="skill-icon" style={{color:'#c51a4a'}} /> },
  { name: "Arduino/ESP32", desc: "Microcontroller", icon: <SiArduino className="skill-icon" style={{color:'#00979D'}} /> },
  { name: "Fusion 360", desc: "3D CAD", icon: <img src={FusionLogo} alt="Fusion 360" className="skill-icon" style={{background:'#fff', borderRadius:'8px'}} /> },
  { name: "Eagle", desc: "PCB Designer", icon: <SiEagle className="skill-icon" style={{color:'#FF0000'}} /> },
  { name: "EasyEDA", desc: "PCB Designer", icon: <SiEasyeda className="skill-icon" style={{color:'#1E90FF'}} /> },
  { name: "Kubernetes", desc: "Orchestration", icon: <SiKubernetes className="skill-icon" style={{color:'#326CE5'}} /> },
  { name: "Proxmox", desc: "Hypervisor", icon: <SiProxmox className="skill-icon" style={{color:'#E57000'}} /> },
  { name: "VirtualBox", desc: "Virtual Machine", icon: <SiVirtualbox className="skill-icon" style={{color:'#183A61'}} /> },
  { name: "Docker", desc: "Containers", icon: <FaDocker className="skill-icon" style={{color:'#2496ED'}} /> },
  { name: "Ansible", desc: "Automation", icon: <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Ansible_logo.svg" alt="Ansible" className="skill-icon" style={{background:'#fff', borderRadius:'8px'}} /> },
  { name: "TrueNAS", desc: "Storage Server", icon: <SiTruenas className="skill-icon" style={{color:'#0095D5'}} /> },
  { name: "PfSense", desc: "Firewall", icon: <SiPfsense className="skill-icon" style={{color:'#212121'}} /> },
  { name: "Ollama", desc: "AI Inference", icon: <SiOllama className="skill-icon" style={{color:'#000'}} /> },
  { name: "CanBus", desc: "Electronic Networking", icon: <FaNetworkWired className="skill-icon" style={{color:'#0078D7'}} /> },
  { name: "LtSpice", desc: "Circuit Simulation", icon: <FaBolt className="skill-icon" style={{color:'#F7DF1E'}} /> },
  { name: "React", desc: "Frontend Library", icon: <FaReact className="skill-icon" style={{color:'#61DBFB'}} /> },
  { name: "Node.js", desc: "Backend Runtime", icon: <FaNodeJs className="skill-icon" style={{color:'green'}} /> },
];


function Skills() {
  return (
    <div className="skills-grid">
      <section className="section" id="skills">
        <h1 className="main-section-title">Skills</h1>
        <div className="skills-row" style={{flexWrap: 'wrap'}}>
          {skills.map((skill) => (
            <div className="skill" key={skill.name}>
              {skill.icon}
              <span className="skill-name">{skill.name}</span>
              <span className="skill-desc">{skill.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


export default Skills;
