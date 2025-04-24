const fs = require('fs');
const path = require('path');
const VDF = require('vdf-parser');

let groupIdCounter = 0;

/**
 * Formate et sauvegarde un objet VDF dans un fichier
 * @param {Object} obj - L'objet à sauvegarder
 * @param {string} filePath - Chemin du fichier de sortie
 * @throws {Error} Si le fichier ne peut pas être écrit
 */
function saveVdfFile(obj, filePath) {
    const tab = '\t';
    let result = '';
    
    function writeProperty(key, value, indent) {
        if (Array.isArray(value)) {
            // Cas des tableaux : on écrit chaque élément avec la même clé
            value.forEach(item => {
                result += `${tab.repeat(indent)}"${key}"\n${tab.repeat(indent)}{\n`;
                
                // Cas spécial pour les groupes : on écrit l'id en premier
                if (key === 'group' && item.id !== undefined) {
                    result += `${tab.repeat(indent + 1)}"id"\t\t"${item.id}"\n`;
                    const { id, ...rest } = item;
                    formatVdf(rest, indent + 1);
                } else {
                    formatVdf(item, indent + 1);
                }
                
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
    
    function formatVdf(obj, indent = 0) {
        // Écrire les propriétés dans l'ordre spécifié
        const orderedProps = ['actions', 'action_layers', 'localization', 'group', 'preset', 'settings'];
        
        // Écrire d'abord les propriétés non ordonnées
        for (const [key, value] of Object.entries(obj)) {
            if (!orderedProps.includes(key)) {
                writeProperty(key, value, indent);
            }
        }
        
        // Écrire ensuite les propriétés ordonnées
        orderedProps.forEach(prop => {
            if (obj[prop] !== undefined) {
                writeProperty(prop, obj[prop], indent);
            }
        });
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
    // Si c'est un fichier _group.vdf, on ajoute l'en-tête "group"
    else if (relativePath.endsWith('_group.vdf')) {
        if (!content.trim().startsWith('"group"')) {
            content = '"group"\n' + content;
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
 * Traite tous les groupes d'un preset
 * @param {string} baseDir - Dossier de base
 * @param {string} presetDir - Dossier du preset
 * @returns {Object} Objet contenant les groupes et leurs bindings
 * @throws {Error} Si les groupes ne peuvent pas être traités
 */
function processGroups(baseDir, presetDir) {
    const groups = [];
    const groupBindings = {};

    // Lire tous les sous-dossiers de groupes
    const groupDirs = fs.readdirSync(presetDir)
        .filter(file => fs.statSync(path.join(presetDir, file)).isDirectory())
        .sort();

    groupDirs.forEach(groupType => {
        const groupPath = path.join(presetDir, groupType, '_group.vdf');
        if (!fs.existsSync(groupPath)) {
            throw new Error(`Fichier de groupe non trouvé : ${groupPath}`);
        }
        
        const groupData = loadVdfFile(baseDir, path.relative(baseDir, groupPath));
        
        // Ajouter l'ID au groupe
        const groupId = groupIdCounter.toString();
        groupData.group.id = groupId;
        
        // Ajouter le groupe à la liste
        groups.push(groupData.group);
        
        // Ajouter le binding dans le preset
        groupBindings[groupId] = groupType;
        
        groupIdCounter++;
    });

    return {
        groups,
        groupBindings
    };
}

/**
 * Traite tous les presets
 * @param {string} baseDir - Dossier de base
 * @returns {Object[]} Liste des presets avec leurs groupes
 * @throws {Error} Si les presets ne peuvent pas être traités
 */
function processPresets(baseDir) {
    const presetsDir = path.join(baseDir, 'presets');
    const presets = [];
    const allGroups = [];
    
    // Lire tous les dossiers de presets
    const presetDirs = fs.readdirSync(presetsDir)
        .filter(file => fs.statSync(path.join(presetsDir, file)).isDirectory())
        .sort(); // Trie naturellement les dossiers par numéro

    presetDirs.forEach(presetDir => {
        const presetPath = path.join(presetsDir, presetDir);
        const presetData = loadVdfFile(baseDir, path.join('presets', presetDir, '_preset.vdf'));
        
        // Traiter les groupes du preset
        const { groups, groupBindings } = processGroups(baseDir, presetPath);
        
        // Ajouter les groupes à la liste globale
        allGroups.push(...groups);
        
        // Ajouter les bindings au preset
        presetData.preset.group_source_bindings = groupBindings;
        
        presets.push(presetData.preset);
    });

    return {
        presets,
        groups: allGroups
    };
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
        
        // Traiter les presets et les groupes
        const { presets, groups } = processPresets(directoryPath);
        templateData.controller_mappings.preset = presets;
        templateData.controller_mappings.group = groups;
        
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