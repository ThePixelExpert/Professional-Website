// Centralized project data — add new projects here
import BigstockImg from '../assets/bigstock-Medical-doctor-working-with-he-89442005 1388x1050.jpg';
import SSRGImg from '../assets/SSRG_Actuator_Mechanical_System_V2.jpg';
import FinalAssemblyImg from '../assets/Final-Assembled-2 1388X1050.jpg';
import Kube from '../assets/Kube.png';
import Autodesk from '../assets/autodesk-fusion-360-product-icon-social-400.png';
import BlendySpectrumImg from '../assets/blendy_spectrum_pic.png';

const projects = [
  {
    id: 'nasa-digital-to-analog',
    title: 'Digital to Analog Transformation',
    group: 'NASA',
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
    group: 'NASA',
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
    group: 'NASA',
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
    highlights: [
      'Automates mixing of high‑viscosity screen printing ink in 5‑gallon buckets, replacing unreliable drill methods.',
      'Compact planetary gear system with multiple whisk attachments and a safety lid; variable‑speed controller.'
    ],
    links: [
      { label: 'Video', url: 'https://www.youtube.com/watch?v=vBS_07PjNZ4' }
    ]
  },
  {
    id: 'kube-demo',
    title: 'Kubernetes Demo',
    group: 'Other',
    img: Kube,
    highlights: ['Kubernetes cluster examples and demos']
  },
  {
    id: 'autodesk',
    title: 'Autodesk Work',
    group: 'Other',
    img: Autodesk,
    highlights: ['CAD & modeling samples']
  }
];

export default projects;
