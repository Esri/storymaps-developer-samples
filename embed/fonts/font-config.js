
/*
  DISCLAIMER: This example code is provided for educational and demonstration purposes.
  It may not represent best practices for security and/or performance and is not intended for production use.
*/
function generateScriptConfig() {
  window.storyMapsEmbedConfig = {
    storyId: "749af21064e34f029bdd53946d9d941a",
    rootNode: ".storymaps-root",
      font: {
        title: {
          fontFamily: "Permanent Marker",
          weight: {
            normal: 400,
            bold: 400
          }
        },
        body: {
          fontFamily: "Kalam",
          weight: {
            normal: 400,
            bold: 700
          }
        }
      }
    }
  }


function createScriptedEmbed() {
    const script = document.createElement('script');
    script.id = 'embed-script';
    script.src =`https://storymaps.arcgis.com/embed/view`;
    document.body.appendChild(script);
  }


generateScriptConfig()
createScriptedEmbed()

