const fs = require('fs');
const path = require('path');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

// Options pour le parser XML
const parserOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name, jpath, isLeafNode, isAttribute) => {
        return false; // On ne veut pas de tableaux
    }
};

// Options pour le builder XML
const builderOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true
};

// Fonction pour collecter tous les fichiers _action.xml
function collectActionFiles(dirPath) {
    const actionFiles = [];
    
    function scanDirectory(currentPath) {
        const files = fs.readdirSync(currentPath);
        
        for (const file of files) {
            const fullPath = path.join(currentPath, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDirectory(fullPath);
            } else if (file.endsWith('_action.xml')) {
                actionFiles.push(fullPath);
            }
        }
    }
    
    scanDirectory(dirPath);
    return actionFiles;
}

// Fonction principale pour fusionner les actions
async function mergeActions(baseDir) {
    try {
        // Initialiser le parser et le builder
        const parser = new XMLParser(parserOptions);
        const builder = new XMLBuilder(builderOptions);
        
        // Chemin du fichier controller.xml
        const controllerPath = path.join(baseDir, 'controller.xml');
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(controllerPath)) {
            throw new Error(`Le fichier ${controllerPath} n'existe pas`);
        }

        // Lire et parser le fichier controller.xml
        const controllerContent = await fs.promises.readFile(controllerPath, 'utf8');
        const controllerObj = parser.parse(controllerContent);
        
        // Vérifier la structure du XML
        if (!controllerObj || !controllerObj.controller_mappings) {
            throw new Error('Structure XML invalide : balise controller_mappings manquante');
        }

        // S'assurer que la section actions existe
        if (!controllerObj.controller_mappings.actions) {
            controllerObj.controller_mappings.actions = {};
        }
        
        // Collecter tous les fichiers _action.xml
        const actionFiles = collectActionFiles(baseDir);
        console.log(`Trouvé ${actionFiles.length} fichiers d'actions à fusionner`);
        
        // Lire et fusionner chaque fichier _action.xml
        for (const actionFile of actionFiles) {
            try {
                const actionContent = await fs.promises.readFile(actionFile, 'utf8');
                const actionObj = parser.parse(actionContent);
                
                // Vérifier que l'objet action est valide
                if (!actionObj || Object.keys(actionObj).length === 0) {
                    console.warn(`Fichier d'action invalide ignoré : ${actionFile}`);
                    continue;
                }

                // Le nom de l'action est la clé racine
                const actionName = Object.keys(actionObj)[0];
                
                // Ajouter l'action au controller
                controllerObj.controller_mappings.actions[actionName] = actionObj[actionName];
                console.log(`Action ajoutée : ${actionName}`);
            } catch (error) {
                console.error(`Erreur lors du traitement de ${actionFile}:`, error);
            }
        }
        
        // Convertir l'objet en XML et écrire le fichier
        const xmlContent = builder.build(controllerObj);
        await fs.promises.writeFile(controllerPath, xmlContent, 'utf8');
        
        console.log(`Fusion terminée : ${actionFiles.length} actions ajoutées au controller.xml`);
    } catch (error) {
        console.error('Erreur lors de la fusion des actions:', error);
        process.exit(1);
    }
}

// Vérification des arguments
if (process.argv.length < 3) {
    console.error('Usage: node merge-actions.js <nom_du_sous_dossier>');
    process.exit(1);
}

const targetFolder = process.argv[2];
const rootDir = path.join(__dirname, targetFolder);

// Vérification que le dossier existe
if (!fs.existsSync(rootDir)) {
    console.error(`Le dossier ${targetFolder} n'existe pas`);
    process.exit(1);
}

console.log(`Fusion des actions dans le dossier: ${targetFolder}`);
mergeActions(rootDir); 