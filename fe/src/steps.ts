import {Step, StepType} from './types';

/**
 * Parse input XML and convert it into steps.
 * Example:
 *   <boltArtifact id="project-import" title="Project Files">
 *     <boltAction type="file" filePath="eslint.config.js">
 *       import js from '@eslint/js';\nimport globals from 'globals';\n
 *     </boltAction>
 *     <boltAction type="shell">
 *       node index.js
 *     </boltAction>
 *   </boltArtifact>
 *
 * Output steps array, e.g.:
 * [
 *   { title: "Project Files", type: StepType.CreateFolder },
 *   { title: "Create eslint.config.js", type: StepType.CreateFile, code: "...", path: "eslint.config.js" },
 *   { title: "Run command", type: StepType.RunScript, code: "node index.js" }
 * ]
 */
export function parseXml(response: string): Step[] {
    const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
    if (!xmlMatch) return [];

    const xmlContent = xmlMatch[1];
    const steps: Step[] = [];
    let stepId = 1;

    // Extract artifact title
    const titleMatch = response.match(/title="([^"]*)"/);
    const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';

    // Add initial artifact step (folder creation placeholder)
    steps.push({
        id: stepId++,
        title: artifactTitle,
        description: '',
        type: StepType.CreateFolder,
        status: 'pending',
    });

    // Regex to find boltAction elements
    const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
    let match: RegExpExecArray | null;

    while ((match = actionRegex.exec(xmlContent)) !== null) {
        const [, actionType, filePath, content] = match;

        if (actionType === 'file') {
            steps.push({
                id: stepId++,
                title: `Create ${filePath || 'file'}`,
                description: '',
                type: StepType.CreateFile,
                status: 'pending',
                code: content.trim(),
                path: filePath,
            });
        } else if (actionType === 'shell') {
            steps.push({
                id: stepId++,
                title: 'Run command',
                description: '',
                type: StepType.RunScript,
                status: 'pending',
                code: content.trim(),
            });
        }
    }

    return steps;
}
