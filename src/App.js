import Banner from "./components/Banner";
import Header from "./components/Header";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import Contact from "./components/Contact";
import OriginalDocuments from "./components/OriginalDocuments";
import References from "./components/References";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Banner />
      <Header />
      <Skills />
      <Projects />
      <Experience />
      <Contact />
      <OriginalDocuments />
      <References />
      <Footer />
    </div>
  );
}

export default App;
