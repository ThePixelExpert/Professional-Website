function OriginalDocuments() {
  return (
    <section className="section" id="original-documents" aria-labelledby="original-documents-heading">
      <h2 className="main-section-title" id="original-documents-heading">Download Original Documents</h2>
      <p>You can download the original documents referenced in this assignment here:</p>
      <ul>
        <li>
          <a 
            href="https://raw.githubusercontent.com/ThePixelExpert/Professional-Website/main/docs/Technical%20Documentation.txt" 
            download
          >
            Technical Documentation (TXT)
          </a>
        </li>
        <li>
          <a 
            href="https://raw.githubusercontent.com/ThePixelExpert/Professional-Website/main/docs/Recomendation%20Report%20Updated.txt" 
            download
          >
            Microwave Recommendation Report (TXT)
          </a>
        </li>
      </ul>
      <p><small>Note: Some browsers may open raw GitHub links instead of downloading. If that happens, right-click and choose "Save link as…".</small></p>
    </section>
  );
}

export default OriginalDocuments;
