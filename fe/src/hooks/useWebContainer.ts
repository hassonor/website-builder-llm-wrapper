import {useEffect, useState} from 'react';
import {WebContainer} from '@webcontainer/api';

/**
 * Custom hook to boot up and provide a single WebContainer instance.
 */
export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState<WebContainer>();

    useEffect(() => {
        async function bootWebContainer() {
            try {
                const instance = await WebContainer.boot();
                setWebcontainer(instance);
            } catch (error) {
                console.error('Error booting WebContainer:', error);
            }
        }

        bootWebContainer();
    }, []);

    return webcontainer;
}
