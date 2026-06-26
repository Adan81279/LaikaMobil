const fs = require('fs');
const path = require('path');

const rolesDir = 'c:/Users/adnra/OneDrive/Documentos/Adan_Cuatrimestres/Ingenieria/IDGS-92/ProyectoLaika/LaikaClubMobil92/src/roles';

function getTsxFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) {
    console.error(`Directory does not exist: ${dir}`);
    return results;
  }
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
console.log(`Found ${files.length} tsx files in src/roles.`);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const reactNativeImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]react-native['"]/s;
  const match = content.match(reactNativeImportRegex);
  
  if (match) {
    const importList = match[1];
    if (importList.includes('SafeAreaView')) {
      console.log(`Processing file: ${path.basename(filePath)}`);
      
      let cleanImportList = importList
        .replace(/\bSafeAreaView\b,?/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/\{\s*,/g, '{')
        .replace(/,\s*\}/g, '}')
        .trim();
      
      // Clean up any double commas or dangling trailing commas in the list
      if (cleanImportList.endsWith(',')) {
        cleanImportList = cleanImportList.slice(0, -1).trim();
      }
      
      const fullImport = match[0];
      const newFullImport = `import {\n  ${cleanImportList.split('\n').map(l => l.trim()).filter(Boolean).join(',\n  ')}\n} from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';`;
      
      content = content.replace(fullImport, newFullImport);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});

console.log('SafeAreaView updates completed successfully!');
