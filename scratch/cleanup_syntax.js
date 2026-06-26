const fs = require('fs');
const path = require('path');

const rolesDir = 'c:/Users/adnra/OneDrive/Documentos/Adan_Cuatrimestres/Ingenieria/IDGS-92/ProyectoLaika/LaikaClubMobil92/src/roles';

function getTsxFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTsxFiles(fullPath));
    } else if (file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getTsxFiles(rolesDir);
files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Replace double commas
  content = content.replace(/,,/g, ',');
  // Replace double semicolons
  content = content.replace(/;;/g, ';');
  
  if (content !== original) {
    console.log(`Cleaned up double punctuation in: ${path.basename(filePath)}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('Cleanup completed!');
