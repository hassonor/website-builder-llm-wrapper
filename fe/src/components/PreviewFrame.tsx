import React, {useEffect, useState, memo} from 'react';
import {WebContainer} from '@webcontainer/api';

interface PreviewFrameProps {
    files: any[];
    webContainer: WebContainer;
}

/**
 * Compiles and renders the preview by spawning "npm install"
 * and then "npm run dev". Waits for "server-ready" from the
 * WebContainer. Displays an iframe with the served URL.
 */
function PreviewFrameComponent({files, webContainer}: PreviewFrameProps) {
    const [url, setUrl] = useState('');

    useEffect(() => {
        async function main() {
            try {
                // Install dependencies
                const installProcess = await webContainer.spawn('npm', ['install']);
                installProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            // Uncomment for debugging if needed:
                            // console.log(data);
                        },
                    })
                );

                // Run dev server
                await webContainer.spawn('npm', ['run', 'dev']);

                // Listen for "server-ready" event
                webContainer.on('server-ready', (_port, serverUrl) => {
                    setUrl(serverUrl);
                });
            } catch (error) {
                console.error('Error starting the preview:', error);
            }
        }

        main();
        // We only want to run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webContainer]);

    return (
        <div className="h-full flex items-center justify-center text-gray-400">
            {!url && (
                <div className="text-center">
                    <p className="mb-2">Loading...</p>
                </div>
            )}
            {url && <iframe title="preview-frame" width="100%" height="100%" src={url}/>}
        </div>
    );
}

export const PreviewFrame = memo(PreviewFrameComponent);
