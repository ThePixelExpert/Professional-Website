import Header from "./components/Header";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import References from "./components/References";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Header />
      <Skills />
      <Projects />
      <Experience />
      <References />
      <Footer />
    </div>
  );
}

export default App;
