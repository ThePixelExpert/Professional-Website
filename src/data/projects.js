// Centralized project data — add new projects here
import BigstockImg from '../assets/bigstock-Medical-doctor-working-with-he-89442005 1388x1050.jpg';
import SSRGImg from '../assets/SSRG_Actuator_Mechanical_System_V2.jpg';
import FinalAssemblyImg from '../assets/Final-Assembled-2 1388X1050.jpg';
import Kube from '../assets/Kube.png';
import BlendySpectrumImg from '../assets/blendy_spectrum_pic.png';

const projects = [
  {
    id: 'nasa-digital-to-analog',
    title: 'Digital to Analog Transformation',
    group: 'Produced NASA',
    img: BigstockImg,
    patent: 'US10085662, NASA MSC-TOPS-67',
    highlights: [
      'Converts 12-lead ECG data between different manufacturers\' machines using a custom circuit board and chip protocol.',
      'Compact design integrates a Raspberry Pi and digital-to-analog converter.'
    ]
  },
  {
    id: 'nasa-ssrg',
    title: 'Space Suit RoboGlove (SSRG)',
    group: 'Produced NASA',
    img: SSRGImg,
    patent: 'US11690775, NASA MSC-TOPS-80',
    highlights: [
      'Assists astronauts with hand movement and reduces injury risk during extravehicular tasks.',
      'Miniaturized circuit board controls actuators and sensors.'
    ]
  },
  {
    id: 'nasa-hydration',
    title: 'Freeze-Resistant Hydration System',
    group: 'Produced NASA',
    img: FinalAssemblyImg,
    patent: 'US9939996, NASA MSC-TOPS-21',
    highlights: [
      'Keeps water at 40°C and functional down to -40°C using induction heating and advanced power management.',
      'Battery/wall power options with PID-tuned temperature control.'
    ]
  },
 {
    id: 'blendbot',
    title: 'BlendBot Ink Mixer',
    group: 'Other',
    img: BlendySpectrumImg,
    forSale: false,
    highlights: [
      'Automates mixing of high‑viscosity screen printing ink in 5‑gallon buckets, replacing unreliable drill methods.',
      'Compact planetary gear system with multiple whisk attachments and a safety lid; variable‑speed controller.'
    ],
    links: [
      { label: 'Video', url: 'https://www.youtube.com/watch?v=vBS_07PjNZ4' }
    ]
  },
  {
    id: 'k3s-cluster',
    title: 'K3s Cluster Infrastructure & CI/CD',
    group: 'Infrastructure',
    img: Kube,
    highlights: [
      'Built production K3s Kubernetes cluster on 4 Raspberry Pi nodes with automated CI/CD pipeline.',
      'Implemented container registry, Ansible automation, and load balancing with MetalLB.',
      'Reduced deployment time from 30 minutes manual process to 6-minute automated deployment.',
      'Integrated Let\'s Encrypt SSL certificates and rolling updates for zero-downtime deployments.'
    ],
    technologies: ['Kubernetes', 'Docker', 'Ansible', 'Raspberry Pi', 'Linux', 'MetalLB', 'Let\'s Encrypt'],
    links: [
  { label: 'Live Site', url: 'https://edwardstech.dev' },
      { label: 'Documentation', url: '#/infrastructure-docs' },
      { label: 'GitHub Repo', url: 'https://github.com/ThePixelExpert/Professional-Website' }
    ]
  }
];

export default projects;
