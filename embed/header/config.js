/*
  DISCLAIMER: This example code is provided for educational and demonstration 
  purposes. It may not represent best practices for security and/or performance 
  and is not intended for production use.
*/

function generateScriptConfig() {
  window.storyMapsEmbedConfig = {
      storyId: "1ba69ca9c31b4183b1ee486c36364198",
      rootNode: ".storymaps-root",
      topOffset: "3rem",
  };
}

function createScriptedEmbed() {
  const script = document.createElement('script');
  script.id = 'embed-script';
  script.src = `https://storymaps.arcgis.com/embed/view`;
  document.body.appendChild(script);
}

generateScriptConfig();
createScriptedEmbed();
