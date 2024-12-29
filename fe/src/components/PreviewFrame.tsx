import React, {useEffect, useState, memo} from 'react';
import {WebContainer} from '@webcontainer/api';
import {Loader} from './Loader'; // import your existing Loader or create a new one

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
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function main() {
            try {
                // Start the loading indicator
                setIsLoading(true);

                // 1) Install dependencies
                const installProcess = await webContainer.spawn('npm', ['install']);
                installProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            console.log('[npm install output]:', data);
                        },
                    })
                );

                // 2) Run dev server
                const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
                devProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            console.log('[npm run dev output]:', data);
                        },
                    })
                );

                // 3) Listen for "server-ready" event
                webContainer.on('server-ready', (port, serverUrl) => {
                    console.log('Server is ready on port', port, 'URL:', serverUrl);
                    setUrl(serverUrl);
                    setIsLoading(false); // stop the loader once we have a URL
                });
            } catch (error) {
                console.error('Error starting the preview:', error);
                setIsLoading(false); // stop the loader in case of error
            }
        }

        main();
        // We only want to run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webContainer]);

    /**
     * If we're still loading (installing/running dev), show a loading spinner.
     * If loading is done but no URL is available, show a "Loading..." text or fallback UI.
     * If we have a URL, render the iframe.
     */
    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Loader/>
                <p className="mt-2">Setting up your preview, please wait...</p>
            </div>
        );
    }

    if (!url) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <iframe
            title="preview-frame"
            className="w-full h-full"
            src={url}
            style={{border: 'none'}}
        />
    );
}

export const PreviewFrame = memo(PreviewFrameComponent);
