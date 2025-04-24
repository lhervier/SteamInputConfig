const fs = require('fs');
const path = require('path');
const { parse } = require('vdf-parser');

// Fonction pour nettoyer les commentaires
function cleanComments(content) {
    return content.split('\n')
        .filter(line => {
            // Supprimer les lignes qui ne contiennent que des espaces/tabs suivis d'un #
            return !line.match(/^\s*#/);
        })
        .join('\n');
}

// Fonction pour convertir un objet en XML
function objectToXml(obj) {
    // La première clé de l'objet est le tag racine
    const rootTag = Object.keys(obj)[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n`;
    
    function processObject(obj, indent) {
        // On commence directement avec le contenu du premier niveau
        for (const [key, value] of Object.entries(obj[rootTag] || obj)) {
            if (typeof value === 'object' && value !== null) {
                xml += `${indent}<${key}>\n`;
                processObject(value, indent + '  ');
                xml += `${indent}</${key}>\n`;
            } else {
                xml += `${indent}<${key}>${value}</${key}>\n`;
            }
        }
    }
    
    processObject(obj, '  ');
    xml += `</${rootTag}>`;
    return xml;
}

// Fonction pour extraire le nom du sous-dossier direct dans localization
function getLocalizationName(filePath) {
    const dirs = filePath.split(path.sep);
    const localizationIndex = dirs.indexOf('localization');
    if (localizationIndex === -1) {
        throw new Error(`Le fichier ${filePath} n'est pas dans un dossier localization`);
    }
    if (dirs.length <= localizationIndex + 1) {
        throw new Error(`Le fichier ${filePath} n'a pas de sous-dossier de langue dans localization`);
    }
    return dirs[localizationIndex + 1];
}

// Fonction pour extraire le nom à gauche de " - "
function getGroupFileName(fileName) {
    const parts = fileName.split(' - ');
    return parts[0];
}

// Fonction pour extraire le nom du dossier parent
function getActionName(filePath) {
    const parentDir = path.basename(path.dirname(filePath));
    const match = parentDir.match(/^\d{2}-(.+)$/);
    return match ? match[1] : null;
}

// Fonction principale pour traiter un fichier
async function convertFile(filePath, baseDir) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        // Nettoyer les commentaires
        content = cleanComments(content);
        
        const fileName = path.basename(filePath);
        const dirPath = path.dirname(filePath);
        
        // Si c'est un fichier _group.vdf, on ajoute la ligne "group" au début
        if (fileName.includes('_group.vdf')) {
            content = '"group"\n' + content;
        }
        // Si c'est un fichier _preset.vdf, on ajoute la ligne "preset" au début
        else if (fileName.includes('_preset.vdf')) {
            content = '"preset"\n' + content;
        }
        // Si c'est un fichier _action.vdf, on ajoute le nom du dossier parent
        else if (fileName.includes('_action.vdf')) {
            const actionName = getActionName(filePath);
            if (actionName) {
                content = `"${actionName}"\n` + content;
            }
        }
        // Si c'est un fichier dans le dossier localization, on ajoute le nom du sous-dossier
        else if (filePath.includes('localization')) {
            const localizationName = getLocalizationName(filePath);
            content = `"${localizationName}"\n` + content;
        }
        // Si c'est un fichier au même niveau qu'un _group.vdf
        else {
            // Vérifier s'il y a un fichier _group.vdf dans le même dossier
            const files = fs.readdirSync(dirPath);
            const hasGroupFile = files.some(file => file.includes('_group.vdf'));
            
            if (hasGroupFile) {
                const groupFileName = getGroupFileName(fileName.replace('.vdf', ''));
                content = `"${groupFileName}"\n` + content;
            }
        }
        
        // Parser le contenu VDF
        const vdfData = parse(content);
        const xmlContent = objectToXml(vdfData);
        
        const outputPath = filePath.replace('.vdf', '.xml');
        fs.writeFileSync(outputPath, xmlContent);
        
        // Afficher le chemin relatif
        const relativePath = path.relative(baseDir, filePath);
        console.log(`Converti: ${relativePath} -> ${relativePath.replace('.vdf', '.xml')}`);
    } catch (error) {
        const relativePath = path.relative(baseDir, filePath);
        console.error(`Erreur lors de la conversion de ${relativePath}:`, error);
    }
}

// Fonction pour collecter tous les fichiers VDF
function collectVdfFiles(dirPath) {
    const vdfFiles = [];
    
    function scanDirectory(currentPath) {
        const files = fs.readdirSync(currentPath);
        
        for (const file of files) {
            const fullPath = path.join(currentPath, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDirectory(fullPath);
            } else if (file.endsWith('.vdf')) {
                vdfFiles.push(fullPath);
            }
        }
    }
    
    scanDirectory(dirPath);
    return vdfFiles;
}

// Fonction pour parcourir récursivement les dossiers
function processDirectory(dirPath) {
    // Collecter d'abord tous les fichiers VDF
    const vdfFiles = collectVdfFiles(dirPath);
    
    // Traiter ensuite chaque fichier
    for (const filePath of vdfFiles) {
        convertFile(filePath, dirPath);
    }
}

// Vérification des arguments
if (process.argv.length < 3) {
    console.error('Usage: node convert-vdf-to-xml.js <nom_du_sous_dossier>');
    process.exit(1);
}

const targetFolder = process.argv[2];
const rootDir = path.join(__dirname, targetFolder);

// Vérification que le dossier existe
if (!fs.existsSync(rootDir)) {
    console.error(`Le dossier ${targetFolder} n'existe pas`);
    process.exit(1);
}

console.log(`Traitement du dossier: ${targetFolder}`);
processDirectory(rootDir); 