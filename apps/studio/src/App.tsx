import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerName } from '@mindforge/engine';
import { StudioController, type LayerFlags, type StudioState } from './studio-controller';
import { Toolbar } from './components/Toolbar';
import { Inspector } from './components/Inspector';

const INITIAL_STATE: StudioState = {
  time: 0,
  duration: 0,
  playing: false,
  speed: 1,
  activeTexts: [],
};

const INITIAL_LAYERS: LayerFlags = { text: true, camera: true, effects: true, anchors: false };

export function App(): JSX.Element {
  const [controller] = useState(() => new StudioController());
  const [state, setState] = useState<StudioState>(INITIAL_STATE);
  const [layers, setLayers] = useState<LayerFlags>(INITIAL_LAYERS);
  const [clean, setClean] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewRef.current) controller.mountPreview(previewRef.current);
    const unsubscribe = controller.subscribe(setState);
    const first = controller.episodes[0];
    if (first) controller.load(first.id);
    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  const catalog = useMemo(() => controller.getCatalog(), [controller]);

  const toggleLayer = (layer: LayerName, enabled: boolean): void => {
    controller.setLayer(layer, enabled);
    setLayers((prev) => ({ ...prev, [layer]: enabled }));
  };

  return (
    <div className={clean ? 'studio clean' : 'studio'}>
      <Toolbar
        episodes={controller.episodes}
        episodeId={state.episodeId}
        playing={state.playing}
        speed={state.speed}
        layers={layers}
        clean={clean}
        onSelect={(id) => controller.load(id)}
        onPlayPause={() => (state.playing ? controller.pause() : controller.play())}
        onRestart={() => controller.restart()}
        onSpeed={(speed) => controller.setSpeed(speed)}
        onToggleLayer={toggleLayer}
        onToggleClean={() => setClean((value) => !value)}
      />

      <main className="stage-row">
        <div className="preview-wrap">
          <div className="preview-frame" ref={previewRef} />
        </div>
        <Inspector
          episodeId={state.episodeId}
          error={state.error}
          activeTexts={state.activeTexts}
          catalog={catalog}
        />
      </main>

      <footer className="scrubber-row">
        <input
          className="scrubber"
          type="range"
          min={0}
          max={state.duration || 0}
          step={0.01}
          value={state.time}
          onChange={(event) => controller.seek(Number(event.target.value))}
        />
        <span className="time">
          {state.time.toFixed(1)}s / {state.duration.toFixed(1)}s
        </span>
      </footer>
    </div>
  );
}
