const fs = require('fs');
const path = require('path');
const VDF = require('vdf-parser');

let groupIdCounter = 0;
let presetIdCounter = 0;
let labels = {};

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
                
                // Cas spécial pour les groupes et les presets : on écrit l'id en premier
                if ( (key === 'group' || key === 'preset') && item.id !== undefined) {
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
    // Si c'est un fichier d'input, on déduit le nom de l'input du nom du fichier
    else if (relativePath.endsWith('.vdf')) {
        const fileName = path.basename(relativePath);
        const inputName = fileName.includes(' - ') ? fileName.split(' - ')[0] : fileName.replace('.vdf', '');
        if (!content.trim().startsWith('"' + inputName + '"')) {
            content = `"${inputName}"\n${content}`;
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
 * @param {string} language - La langue à utiliser
 * @returns {Object} Données de localisation pour toutes les langues
 * @throws {Error} Si le dossier ne peut pas être traité
 */
function processLocalization(baseDir, localizationPath, language) {
    const localizationData = {};
    const fullLocalizationPath = path.join(baseDir, localizationPath);
    
    if (!fs.existsSync(fullLocalizationPath)) {
        return localizationData;
    }
    
	const langPath = path.join(localizationPath, language);
	labels = processLanguageFiles(baseDir, langPath);
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

		// Remplace les référence à #<une cle de traduciton> par la valeur
		const root = Object.values(actionData)[0];
		root.title = root.title.replace(/#(\w+)/g, (match, p1) => {
			return labels[p1] || match;
		});
		Object.assign(actionsData, actionData);
    });

    return actionsData;
}

/**
 * Traite tous les inputs d'un groupe
 * @param {string} baseDir - Dossier de base
 * @param {string} groupDir - Dossier du groupe
 * @returns {Object} Objet contenant les inputs comme sous-propriétés
 * @throws {Error} Si les inputs ne peuvent pas être traités
 */
function processInputs(baseDir, groupDir) {
    const inputs = {};
    
    // Lire tous les fichiers VDF du dossier
    const inputFiles = fs.readdirSync(groupDir)
        .filter(file => file.endsWith('.vdf') && file !== '_group.vdf')
        .sort();

    inputFiles.forEach(inputFile => {
        // Charger et parser le fichier
        const inputPath = path.join(groupDir, inputFile);
        const inputData = loadVdfFile(baseDir, path.relative(baseDir, inputPath));
        
        // Récupérer le premier (et unique) input de l'objet
        const inputName = Object.keys(inputData)[0];
        inputs[inputName] = inputData[inputName];
    });

    return inputs;
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
        
        // Traiter les inputs du groupe
        const inputs = processInputs(baseDir, path.join(presetDir, groupType));
        groupData.group.inputs = inputs;
        
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
        presetData.preset.id = presetIdCounter.toString();

        // Traiter les groupes du preset
        const { groups, groupBindings } = processGroups(baseDir, presetPath);
        
        // Ajouter les groupes à la liste globale
        allGroups.push(...groups);
        
        // Ajouter les bindings au preset
        presetData.preset.group_source_bindings = groupBindings;
        
        presets.push(presetData.preset);
		presetIdCounter++;
    });

    return {
        presets,
        groups: allGroups
    };
}

/**
 * Remplace les références %ID% dans les bindings par les IDs de groupes correspondants
 * @param {Object[]} group - Liste des groupes
 * @param {Object[]} preset - Liste des presets
 * @throws {Error} Si un groupe référencé n'est pas trouvé dans le preset
 */
function processBindings(group, preset) {
    // Créer un index des presets par ID de groupe
	// et un index des IDs de groupe par type pour chaque preset
    const presetByGroupId = {};
    const groupIdByTypeByPreset = {};
    preset.forEach(p => {
        groupIdByTypeByPreset[p.name] = {};
        Object.entries(p.group_source_bindings).forEach(([groupId, bindingValue]) => {
            presetByGroupId[groupId] = p;
            if( !bindingValue.endsWith('modeshift')) {
				return;
			}
			const groupType = bindingValue.split(' ')[0];
			if( groupIdByTypeByPreset[p.name][groupType] ) {
				throw new Error(`Groupe de type ${groupType} en mode_shift déjà défini dans le preset ${p.name}. On ne supporte pas cette configuration...`);
			}
            groupIdByTypeByPreset[p.name][groupType] = groupId;
        });
    });

    // Pour chaque groupe
    group.forEach(g  => {
        // Pour chaque input du groupe
        if (!g.inputs) return;
		
		Object.values(g.inputs).forEach(input => {
			if (!input.activators) return;

			// Pour chaque activateur de l'input (un même activateur peut apparaître plusieurs fois)
			Object.values(input.activators).forEach(activator => {
				const activators = Array.isArray(activator) ? activator : [activator];
				activators.forEach(a => {
					if (!a.bindings) return;

					// Pour chaque binding (on peut avoir plusieurs bindings pour un même activateur)
					Object.entries(a.bindings).forEach(([key, binding]) => {
						const bindings = Array.isArray(binding) ? binding : [binding];
						bindings.forEach((value, index) => {
							
							// Remplace les référence à #<une cle de traduciton> par la valeur
							newValue = value.replace(/#(\w+)/g, (match, p1) => {
								return labels[p1] || match;
							});

							if (newValue.startsWith('mode_shift ') && newValue.includes('%ID%')) {
							
								// On cherche le preset qui contient ce groupe
								const groupPreset = presetByGroupId[g.id];
								if (!groupPreset) return; // Ignorer les groupes qui ne sont dans aucun preset

								// On déduit le type de groupe vidé pour le changement de mode
								const groupType = newValue.split(' ')[1];
								
								// On cherche l'ID du groupe de type groupType dans ce preset
								const targetGroupId = groupIdByTypeByPreset[groupPreset.name][groupType];
								if (!targetGroupId) {
									throw new Error(`Groupe de type ${groupType} non trouvé dans le preset ${groupPreset.name}`);
								}
								newValue = newValue.replace(/%ID%/, targetGroupId);
							}
							
							// Remplacer %ID% par l'ID du groupe cible
							if (Array.isArray(binding)) {
								binding[index] = newValue;
							} else {
								a.bindings.binding = newValue;
							}
						});
					});
				});
			});
		});
    });
}

/**
 * Traite un dossier complet
 * @param {string} directoryPath - Chemin du dossier à traiter
 * @param {string} language - La langue à utiliser
 * @throws {Error} Si le dossier ne peut pas être traité
 */
function processDirectory(directoryPath, language) {
    try {
        // Charger le template
        const templateData = loadTemplate(directoryPath);
        
        // Charger les clés de localisation
        processLocalization(directoryPath, 'localization', language);
        
        // Traiter les actions
        templateData.controller_mappings.actions = processActions(directoryPath);
        
        // Traiter les presets et les groupes
        const { presets, groups } = processPresets(directoryPath);
        templateData.controller_mappings.preset = presets;
        templateData.controller_mappings.group = groups;
        
        // Traiter les bindings
        processBindings(
			templateData.controller_mappings.group, 
			templateData.controller_mappings.preset
		);

		templateData.controller_mappings.Timestamp = "" + Date.now();
        
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
if (process.argv.length < 4) {
    console.error('Veuillez spécifier un dossier et une langue en paramètre');
    process.exit(1);
}

const targetDirectory = process.argv[2];
const language = process.argv[3];
processDirectory(targetDirectory, language);