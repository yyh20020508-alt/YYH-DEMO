import dynamic from 'next/dynamic';
import type {NextPage} from 'next';

const GooseGameContent = dynamic(() => Promise.resolve(GooseGameInner), {ssr: false});

import {useCallback, useEffect, useRef} from 'react';
import Head from 'next/head';
import {useNewAppTheme} from '@/hooks/useNewAppTheme';
import {useNewAppLog} from '@/hooks/useNewAppLog';
import {NewAppFooterButton} from '@/components/NewAppFooterButton';
import {NewAppTopBar} from '@/components/NewAppTopBar';
import styles from '@/styles/goose-game.module.css';
import pageData from '@/config/goose-game-data.json';
import skinDefs from '@/config/goose-game-skins.json';

function GooseGameInner() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useNewAppTheme();
    const {log} = useNewAppLog({pageName: 'new_agent_detail', agentName: pageData.page.agentName});
    const logRef = useRef(log);
    logRef.current = log;

    const handleGameOver = useCallback(() => {
        logRef.current('show', 'new_agent_result', {}, 'new_agent_detail');
    }, []);

    const handleRetry = useCallback(() => {
        logRef.current('click', 'new_agent', {action_type: 'retry'}, 'new_agent_detail');
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        let cleanup: (() => void) | undefined;

        import('@/lib/goose-game-engine').then(({initGooseGame}) => {
            cleanup = initGooseGame(canvas, skinDefs, handleGameOver, handleRetry);
        });

        return () => {
            cleanup?.();
        };
    }, [handleGameOver, handleRetry]);

    return (
        <>
            <Head>
                <title>{pageData.page.title}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
            </Head>
            <div className={styles.container}>
                <canvas ref={canvasRef} id="gameCanvas" className={styles.canvas} />
            </div>
        </>
    );
}

function GooseGame() {
    return <GooseGameContent />;
}

(GooseGame as NextPage & {noLayout?: boolean}).noLayout = true;

export default GooseGame;
