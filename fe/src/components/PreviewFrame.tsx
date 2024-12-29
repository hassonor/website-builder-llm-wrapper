import React, {useEffect, useState, memo} from 'react';
import {WebContainer} from '@webcontainer/api';
import {Loader} from './Loader'; // <-- Your existing Loader or any spinner

interface PreviewFrameProps {
    files: any[];
    webContainer: WebContainer;
}

/**
 * Possible phases of the WebContainer setup process.
 */
type SetupPhase = 'idle' | 'installing' | 'starting' | 'launching' | 'ready';

function PreviewFrameComponent({files, webContainer}: PreviewFrameProps) {
    const [url, setUrl] = useState('');
    const [phase, setPhase] = useState<SetupPhase>('idle');

    useEffect(() => {
        async function main() {
            try {
                // PHASE 1: Installing dependencies
                setPhase('installing');
                console.log('[PreviewFrame] Installing dependencies...');
                const installProcess = await webContainer.spawn('npm', ['install']);
                installProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            // For debugging
                            console.log('[npm install output]:', data);
                        },
                    })
                );
                // Wait for install to finish (exit code 0)
                const installExitCode = await installProcess.exit;
                if (installExitCode !== 0) {
                    throw new Error(`npm install failed with exit code ${installExitCode}`);
                }

                // PHASE 2: Starting dev server
                setPhase('starting');
                console.log('[PreviewFrame] Starting dev server...');
                const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
                devProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            console.log('[npm run dev output]:', data);
                        },
                    })
                );

                // PHASE 3: Launching preview
                setPhase('launching');
                console.log('[PreviewFrame] Launching preview (waiting for server-ready)');

                // Listen for server-ready event
                webContainer.on('server-ready', (port, serverUrl) => {
                    console.log('[PreviewFrame] Server is ready on port', port, 'URL:', serverUrl);
                    setUrl(serverUrl);
                    // PHASE 4: Ready
                    setPhase('ready');
                });
            } catch (error) {
                console.error('Error starting the preview:', error);
                // If an error occurs, you can decide how to handle the UI
                setPhase('idle');
            }
        }

        main();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webContainer]);

    /**
     * Helper to display a user-friendly label depending on the phase.
     */
    function getPhaseMessage(p: SetupPhase) {
        switch (p) {
            case 'installing':
                return 'Installing dependencies...';
            case 'starting':
                return 'Starting dev server...';
            case 'launching':
                return 'Launching preview...';
            default:
                return '';
        }
    }

    /**
     * Render logic:
     * 1) If phase is 'ready' and url is set, show the iframe.
     * 2) Otherwise, show a Loader with a message about the current phase.
     */
    if (phase !== 'ready' || !url) {
        // Show a loader or placeholder while the environment is being prepared
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Loader/>
                <p className="mt-2">{getPhaseMessage(phase)}</p>
            </div>
        );
    }

    // PHASE = 'ready' and we have a URL
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
