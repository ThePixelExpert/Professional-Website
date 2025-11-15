// Centralized project data — add new projects here
import BigstockImg from '../assets/bigstock-Medical-doctor-working-with-he-89442005 1388x1050.jpg';
import SSRGImg from '../assets/SSRG_Actuator_Mechanical_System_V2.jpg';
import FinalAssemblyImg from '../assets/Final-Assembled-2 1388X1050.jpg';
import Kube from '../assets/Kube.png';
import BlendySpectrumImg from '../assets/blendy_spectrum_pic.png';
import FootPedals from '../assets/Foot-pedals-stock.png';

const projects = [
  {
    id: 'nasa-digital-to-analog',
    title: 'Digital to Analog Transformation',
    group: 'Produced NASA',
    img: BigstockImg,
    patent: 'US10085662, NASA MSC-TOPS-67',
    highlights: [
      'Converts 12-lead ECG data between different manufacturers\' machines using a custom circuit board and chip protocol.',
      'Compact design integrates a Raspberry Pi and digital-to-analog converter.',
      'Developed a Electrical Circuit and PCB Design that converts digital ECG data to analog signals for compatibility with legacy systems.',
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
      'Miniaturized circuit board controls actuators and sensors.',
      'Integrated String Potentiometers to accurately measure finger positions as well as three linear actuators to assist with finger movement.',
      'Designed and developed the electrical circuits and PCB layouts, including the LED interface integrated into the glove and the main control board system.',
      'Programmed comprehensive software to interface with all system components—computer, sensors, actuators, LEDs, LCD display, and control buttons—while implementing intelligent algorithms that dynamically control actuator responses based on real-time sensor feedback.',
    ]
  },
  {
    id: 'nasa-foot-pedal-controller',
    title: 'Foot Pedal Controller',
    group: 'Produced NASA',
    img: FootPedals,
    patent: 'US1018099, NASA MSC-TOPS-52',
    highlights: [
      'Developed a foot pedal interface system for controlling movement in three-dimensional space, eliminating the need for hand-operated controls.',
      'Enables precise motion control across six degrees of freedom using intuitive foot pedal inputs, freeing operators\' hands for simultaneous task execution.',
      'Designed and developed the electrical circuits and proprietary sensor interface architecture for seamless foot pedal system integration.',
      'Implemented a modular sensor interface and electronics platform ensuring consistent accuracy and long-term reliability in demanding operational environments.'
    ]
  },
  {
    id: 'nasa-hydration',
    title: 'Freeze-Resistant Hydration System',
    group: 'Produced NASA',
    img: FinalAssemblyImg,
    patent: 'US9939996, NASA MSC-TOPS-21',
    highlights: [
      'Keeps water at 40°C and functional down to -40°C using convection heating and advanced power management.',
      'Battery/wall power options with PID-tuned temperature control allowing for precise temperature regulation in extreme conditions.',
      'Developed custom electrical circuitry and PCB design to manage power distribution, heating elements, and temperature sensors for reliable operation in harsh environments.'

    ]
  },
 {
    id: 'blendbot',
    title: 'BlendBot Ink Mixer',
    group: 'Other',
    img: BlendySpectrumImg,
    forSale: false,
    highlights: [
      'Automates mixing of high-viscosity screen printing ink in 5-gallon buckets, replacing unreliable drill methods.',
      'Features a compact planetary gear system with multiple whisk attachments, safety lid, and variable-speed controller.',
      'Replaces industrial mixers costing $5,000+ with an affordable, efficient solution for small businesses and hobbyists.',
      'Reduces mess and simplifies cleanup through enclosed design with transparent monitoring window.',
      'Lowers barrier to entry for professional ink mixing, making high-quality results accessible to smaller operations.'
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
