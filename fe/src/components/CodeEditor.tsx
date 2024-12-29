import React, {memo, useMemo} from 'react';
import Editor from '@monaco-editor/react';
import {FileItem} from '../types';

interface CodeEditorProps {
    file: FileItem | null;
}

const EDITOR_OPTIONS = {
    readOnly: true,
    minimap: {enabled: false},
    fontSize: 14,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
};

/**
 * Displays the file content in a Monaco Editor. If no file is selected, a placeholder is shown.
 */
function CodeEditorComponent({file}: CodeEditorProps) {
    if (!file) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                Select a file to view its contents
            </div>
        );
    }

    // Memoize the editor value to avoid unnecessary re-renders when file.content is unchanged.
    const editorValue = useMemo(() => file.content || '', [file.content]);

    return (
        <Editor
            height="100%"
            defaultLanguage="typescript"
            theme="vs-dark"
            value={editorValue}
            options={EDITOR_OPTIONS}
        />
    );
}

export const CodeEditor = memo(CodeEditorComponent);
