import React, {useEffect, useState, useCallback} from 'react';
import {useLocation} from 'react-router-dom';
import axios from 'axios';

import {StepsList} from '../components/StepsList';
import {FileExplorer} from '../components/FileExplorer';
import {TabView} from '../components/TabView';
import {CodeEditor} from '../components/CodeEditor';
import {PreviewFrame} from '../components/PreviewFrame';
import {Loader} from '../components/Loader';

import {useWebContainer} from '../hooks/useWebContainer';
import {parseXml} from '../steps';
import {BACKEND_URL} from '../config';

import {Step, StepType, FileItem} from '../types';

export function Builder() {
    const location = useLocation();
    const {prompt} = (location.state as { prompt: string }) || {prompt: ''};

    const [userPrompt, setUserPrompt] = useState('');
    const [llmMessages, setLlmMessages] = useState<
        { role: 'user' | 'assistant'; content: string }[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [templateSet, setTemplateSet] = useState(false);

    // Steps
    const [steps, setSteps] = useState<Step[]>([]);
    const [currentStep, setCurrentStep] = useState(1);

    // Files
    const [files, setFiles] = useState<FileItem[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

    // Tabs
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

    // WebContainer
    const webcontainer = useWebContainer();

    /**
     * Creates or updates files/folders in the in-memory `files` array
     * for any pending steps of type CreateFile.
     */
    useEffect(() => {
        let updatedFiles = [...files];
        let updateHappened = false;

        steps
            .filter(({status}) => status === 'pending')
            .forEach((step) => {
                if (step.type === StepType.CreateFile && step.path) {
                    updateHappened = true;

                    const parsedPath = step.path.split('/');
                    let currentStructure = updatedFiles;
                    let cumulativePath = '';

                    while (parsedPath.length) {
                        const segment = parsedPath.shift() as string;
                        cumulativePath = cumulativePath ? `${cumulativePath}/${segment}` : segment;

                        // If there are no more segments, this must be the file
                        if (parsedPath.length === 0) {
                            const existingFile = currentStructure.find((f) => f.path === cumulativePath);

                            if (existingFile) {
                                existingFile.content = step.code || '';
                            } else {
                                currentStructure.push({
                                    name: segment,
                                    type: 'file',
                                    path: cumulativePath,
                                    content: step.code || '',
                                });
                            }
                        } else {
                            // This is a folder
                            let folder = currentStructure.find((f) => f.path === cumulativePath);

                            if (!folder) {
                                folder = {
                                    name: segment,
                                    type: 'folder',
                                    path: cumulativePath,
                                    children: [],
                                };
                                currentStructure.push(folder);
                            }

                            // Move into children for nested traversal
                            if (folder.children) {
                                currentStructure = folder.children;
                            }
                        }
                    }
                }
            });

        if (updateHappened) {
            setFiles(updatedFiles);
            setSteps((prevSteps) =>
                prevSteps.map((s) => ({
                    ...s,
                    status: 'completed',
                }))
            );
        }
    }, [steps, files]);

    /**
     * Builds the mount structure that WebContainer expects,
     * then calls webcontainer.mount() to upload it.
     */
    useEffect(() => {
        if (!webcontainer) return;

        const createMountStructure = (fileList: FileItem[]): Record<string, any> => {
            const structure: Record<string, any> = {};

            fileList.forEach((file) => {
                if (file.type === 'folder') {
                    structure[file.name] = {
                        directory: createMountStructure(file.children || []),
                    };
                } else {
                    structure[file.name] = {
                        file: {
                            contents: file.content || '',
                        },
                    };
                }
            });

            return structure;
        };

        const mountStructure = createMountStructure(files);
        webcontainer.mount(mountStructure);
    }, [files, webcontainer]);

    /**
     * Initializes the template and steps from the backend.
     */
    const init = useCallback(async () => {
        if (!prompt.trim()) return;
        try {
            const response = await axios.post(`${BACKEND_URL}/template`, {
                prompt: prompt.trim(),
            });

            setTemplateSet(true);

            // Example: response.data = { prompts, uiPrompts }
            const {prompts, uiPrompts} = response.data;

            // Convert the first UI prompt to steps
            const initialParsedSteps = parseXml(uiPrompts[0]).map((st, idx) => ({
                ...st,
                id: idx + 1,
                status: 'pending' as const,
            }));
            setSteps(initialParsedSteps);

            setLoading(true);
            const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                messages: [...prompts, prompt].map((content: string) => ({
                    role: 'user' as const,
                    content,
                })),
            });
            setLoading(false);

            // Combine steps from second response
            const newSteps = parseXml(stepsResponse.data.response).map((st, i) => ({
                ...st,
                id: initialParsedSteps.length + i + 1,
                status: 'pending' as const,
            }));
            setSteps((prev) => [...prev, ...newSteps]);

            // Track messages
            const combinedMessages = [...prompts, prompt].map((content: string) => ({
                role: 'user' as const,
                content,
            }));
            setLlmMessages([
                ...combinedMessages,
                {role: 'assistant', content: stepsResponse.data.response},
            ]);
        } catch (error) {
            console.error('Error during init:', error);
        }
    }, [prompt]);

    useEffect(() => {
        init();
    }, [init]);

    /**
     * Sends a new user prompt to the backend to generate more steps.
     */
    const handleSend = useCallback(async () => {
        if (!userPrompt.trim()) return;

        setLoading(true);
        const newUserMessage = {role: 'user' as const, content: userPrompt};

        try {
            const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                messages: [...llmMessages, newUserMessage],
            });
            setLoading(false);

            // Update messages
            setLlmMessages((prev) => [
                ...prev,
                newUserMessage,
                {role: 'assistant', content: stepsResponse.data.response},
            ]);

            // Parse and add new steps
            const newParsedSteps = parseXml(stepsResponse.data.response).map((st, i) => ({
                ...st,
                id: steps.length + i + 1,
                status: 'pending' as const,
            }));
            setSteps((prev) => [...prev, ...newParsedSteps]);
        } catch (error) {
            setLoading(false);
            console.error('Error sending prompt:', error);
        }
    }, [userPrompt, llmMessages, steps]);

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-100">Website Builder</h1>
                <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
            </header>

            <div className="flex-1 overflow-hidden">
                <div className="h-full grid grid-cols-4 gap-6 p-6">
                    {/* Left Panel: Steps & Prompt Box */}
                    <div className="col-span-1 space-y-6 overflow-auto">
                        <div className="max-h-[75vh] overflow-scroll">
                            <StepsList steps={steps} currentStep={currentStep} onStepClick={setCurrentStep}/>
                        </div>

                        <div>
                            <div className="flex">
                                {(loading || !templateSet) && <Loader/>}
                                {!loading && templateSet && (
                                    <div className="flex flex-col w-full gap-2">
                    <textarea
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        className="p-2 w-full rounded bg-gray-800 text-gray-200 border border-gray-600"
                        placeholder="Ask more from the assistant..."
                    />
                                        <button
                                            onClick={handleSend}
                                            className="bg-purple-500 hover:bg-purple-600
                                 text-gray-100 px-4 py-2 rounded
                                 transition-colors"
                                        >
                                            Send
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Middle Panel: File Explorer */}
                    <div className="col-span-1">
                        <FileExplorer files={files} onFileSelect={setSelectedFile}/>
                    </div>

                    {/* Right Panel: Code / Preview */}
                    <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
                        <TabView activeTab={activeTab} onTabChange={setActiveTab}/>
                        <div className="h-[calc(100%-4rem)]">
                            {activeTab === 'code' ? (
                                <CodeEditor file={selectedFile}/>
                            ) : (
                                webcontainer && <PreviewFrame webContainer={webcontainer} files={files}/>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
