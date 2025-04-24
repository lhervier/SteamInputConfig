const fs = require('fs');
const path = require('path');
const VDF = require('vdf-parser');

/**
 * Formate et sauvegarde un objet VDF dans un fichier
 * @param {Object} obj - L'objet à sauvegarder
 * @param {string} filePath - Chemin du fichier de sortie
 * @throws {Error} Si le fichier ne peut pas être écrit
 */
function saveVdfFile(obj, filePath) {
    const tab = '\t';
    let result = '';
    
    function formatVdf(obj, indent = 0) {
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                // Cas des tableaux : on écrit chaque élément avec la même clé
                value.forEach(item => {
                    result += `${tab.repeat(indent)}"${key}"\n${tab.repeat(indent)}{\n`;
                    formatVdf(item, indent + 1);
                    result += `${tab.repeat(indent)}}\n`;
                });
            } else if (typeof value === 'object' && value !== null) {
                result += `${tab.repeat(indent)}"${key}"\n${tab.repeat(indent)}{\n`;
                formatVdf(value, indent + 1);
                result += `${tab.repeat(indent)}}\n`;
            } else {
                result += `${tab.repeat(indent)}"${key}"\t\t"${value}"\n`;
            }
        }
    }
    
    formatVdf(obj);
    fs.writeFileSync(filePath, result);
}

/**
 * Charge, nettoie et parse un fichier VDF
 * @param {string} baseDir - Dossier de base
 * @param {string} relativePath - Chemin relatif du fichier depuis le dossier de base
 * @returns {Object} Objet parsé
 * @throws {Error} Si le fichier ne peut pas être chargé ou parsé
 */
function loadVdfFile(baseDir, relativePath) {
    const filePath = path.join(baseDir, relativePath);
    let content = fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(line => !line.trim().startsWith('#'))
        .join('\n');

    // Si c'est un fichier de localisation, on déduit la langue du chemin
    if (relativePath.includes('localization')) {
        const language = path.basename(path.dirname(relativePath));
        if (!content.trim().startsWith('"' + language + '"')) {
            content = `"${language}"\n${content}`;
        }
    }
    // Si c'est un fichier _action.vdf, on déduit le nom du preset du dossier parent
    else if (relativePath.endsWith('_action.vdf')) {
        const presetName = path.basename(path.dirname(relativePath)).split('-')[1];
        if (!content.trim().startsWith('"' + presetName + '"')) {
            content = `"${presetName}"\n${content}`;
        }
    }
    // Si c'est un fichier _preset.vdf, on ajoute l'en-tête "preset"
    else if (relativePath.endsWith('_preset.vdf')) {
        if (!content.trim().startsWith('"preset"')) {
            content = '"preset"\n' + content;
        }
    }

    try {
        return VDF.parse(content);
    } catch (error) {
        throw new Error(`Erreur lors du parsing de ${filePath}: ${error.message}`);
    }
}

/**
 * Traite tous les fichiers VDF d'une langue
 * @param {string} baseDir - Dossier de base
 * @param {string} langPath - Chemin relatif du dossier de la langue
 * @returns {Object} Données fusionnées pour la langue
 * @throws {Error} Si les fichiers ne peuvent pas être traités
 */
function processLanguageFiles(baseDir, langPath) {
    const fullLangPath = path.join(baseDir, langPath);
    const vdfFiles = fs.readdirSync(fullLangPath)
        .filter(file => file.endsWith('.vdf'));
    
    const languageData = {};
    const language = path.basename(langPath);
    
    vdfFiles.forEach(vdfFile => {
        const relativePath = path.join(langPath, vdfFile);
        const parsedContent = loadVdfFile(baseDir, relativePath);
        
        if (parsedContent && parsedContent[language]) {
            Object.assign(languageData, parsedContent[language]);
        }
    });
    
    return languageData;
}

/**
 * Traite le dossier de localisation
 * @param {string} baseDir - Dossier de base
 * @param {string} localizationPath - Chemin relatif du dossier de localisation
 * @returns {Object} Données de localisation pour toutes les langues
 * @throws {Error} Si le dossier ne peut pas être traité
 */
function processLocalization(baseDir, localizationPath) {
    const localizationData = {};
    const fullLocalizationPath = path.join(baseDir, localizationPath);
    
    if (!fs.existsSync(fullLocalizationPath)) {
        return localizationData;
    }
    
    const languages = fs.readdirSync(fullLocalizationPath)
        .filter(file => fs.statSync(path.join(fullLocalizationPath, file)).isDirectory());
    
    languages.forEach(language => {
        const langPath = path.join(localizationPath, language);
        localizationData[language] = processLanguageFiles(baseDir, langPath);
    });
    
    return localizationData;
}

/**
 * Charge le template de base
 * @param {string} baseDir - Dossier de base
 * @returns {Object} Données du template
 * @throws {Error} Si le template ne peut pas être chargé
 */
function loadTemplate(baseDir) {
    return loadVdfFile(baseDir, 'controller_mappings.vdf');
}

/**
 * Traite tous les fichiers d'actions
 * @param {string} baseDir - Dossier de base
 * @returns {Object} Données des actions fusionnées
 * @throws {Error} Si les actions ne peuvent pas être traitées
 */
function processActions(baseDir) {
    const presetsDir = path.join(baseDir, 'presets');
    const actionsData = {};
    
    // Lire tous les dossiers de presets
    const presetDirs = fs.readdirSync(presetsDir)
        .filter(file => fs.statSync(path.join(presetsDir, file)).isDirectory())
        .sort(); // Trie naturellement les dossiers par numéro

    presetDirs.forEach(presetDir => {
        const relativePath = path.join('presets', presetDir, '_action.vdf');
        const actionData = loadVdfFile(baseDir, relativePath);
        Object.assign(actionsData, actionData);
    });

    return actionsData;
}

/**
 * Traite tous les presets
 * @param {string} baseDir - Dossier de base
 * @returns {Object[]} Liste des presets
 * @throws {Error} Si les presets ne peuvent pas être traités
 */
function processPresets(baseDir) {
    const presetsDir = path.join(baseDir, 'presets');
    const presets = [];
    
    // Lire tous les dossiers de presets
    const presetDirs = fs.readdirSync(presetsDir)
        .filter(file => fs.statSync(path.join(presetsDir, file)).isDirectory())
        .sort(); // Trie naturellement les dossiers par numéro

    presetDirs.forEach(presetDir => {
        const relativePath = path.join('presets', presetDir, '_preset.vdf');
        const presetData = loadVdfFile(baseDir, relativePath);
        presets.push(presetData.preset);
    });

    return presets;
}

/**
 * Traite un dossier complet
 * @param {string} directoryPath - Chemin du dossier à traiter
 * @throws {Error} Si le dossier ne peut pas être traité
 */
function processDirectory(directoryPath) {
    try {
        // Charger le template
        const templateData = loadTemplate(directoryPath);
        
        // Traiter la localisation
        templateData.controller_mappings.localization = processLocalization(directoryPath, 'localization');
        
        // Traiter les actions
        templateData.controller_mappings.actions = processActions(directoryPath);
        
        // Traiter les presets
        const presets = processPresets(directoryPath);
        templateData.controller_mappings.preset = presets;
        
        // Écrire le fichier résultant
        const dirName = path.basename(directoryPath);
        const outputPath = path.join(path.dirname(directoryPath), `${dirName}.vdf`);
        saveVdfFile(templateData, outputPath);
        
        console.log(`Fichier créé avec succès : ${outputPath}`);
    } catch (error) {
        console.error(`Erreur lors du traitement du dossier ${directoryPath}: ${error.message}`);
        process.exit(1);
    }
}

// Point d'entrée du script
if (process.argv.length < 3) {
    console.error('Veuillez spécifier un dossier en paramètre');
    process.exit(1);
}

const targetDirectory = process.argv[2];
processDirectory(targetDirectory);