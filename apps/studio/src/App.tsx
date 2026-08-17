import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerName } from '@mindforge/engine';
import { DEFAULT_AUDIO_MIXER_VOLUMES } from '@mindforge/audio';
import { DEFAULT_THEME_ID } from '@mindforge/themes';
import { StudioController, type LayerFlags, type StudioState } from './studio-controller';
import { Toolbar } from './components/Toolbar';
import { Inspector } from './components/Inspector';
import { ShotTrack } from './components/ShotTrack';
import { CreatorExportPanel } from './components/CreatorExportPanel';
import { createDefaultStudioCreatorExportOptions } from './creator-export';

const INITIAL_STATE: StudioState = {
  themeId: DEFAULT_THEME_ID,
  time: 0,
  duration: 0,
  playing: false,
  speed: 1,
  activeTexts: [],
  audioMuted: false,
  masterVolume: DEFAULT_AUDIO_MIXER_VOLUMES.master,
  voiceVolume: DEFAULT_AUDIO_MIXER_VOLUMES.voice,
  musicVolume: DEFAULT_AUDIO_MIXER_VOLUMES.music,
  sfxVolume: DEFAULT_AUDIO_MIXER_VOLUMES.sfx,
  ambienceVolume: DEFAULT_AUDIO_MIXER_VOLUMES.ambience,
  exporting: false,
  exportProgress: 0,
};

const INITIAL_LAYERS: LayerFlags = { text: true, camera: true, effects: true, anchors: false };

export function App(): JSX.Element {
  const [controller] = useState(() => new StudioController());
  const [state, setState] = useState<StudioState>(INITIAL_STATE);
  const [layers, setLayers] = useState<LayerFlags>(INITIAL_LAYERS);
  const [clean, setClean] = useState(false);
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState(() => createDefaultStudioCreatorExportOptions(DEFAULT_THEME_ID));
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


  useEffect(() => {
    if (!exportPanelOpen) {
      setExportOptions((current) => ({ ...current, themeId: state.themeId }));
    }
  }, [state.themeId, exportPanelOpen]);

  useEffect(() => {
    if (state.duration <= 0) return;
    setExportOptions((current) => ({ ...current, customStart: 0, customEnd: state.duration }));
  }, [state.episodeId, state.duration]);

  const catalog = useMemo(() => controller.getCatalog(), [controller, state.themeId]);
  const production = useMemo(() => controller.getProduction(state.episodeId), [controller, state.episodeId]);

  const toggleLayer = (layer: LayerName, enabled: boolean): void => {
    controller.setLayer(layer, enabled);
    setLayers((prev) => ({ ...prev, [layer]: enabled }));
  };

  return (
    <div className={clean ? 'studio clean' : 'studio'}>
      <Toolbar
        episodes={controller.episodes}
        episodeId={state.episodeId}
        themes={controller.themes}
        themeId={state.themeId}
        playing={state.playing}
        speed={state.speed}
        audioMuted={state.audioMuted}
        masterVolume={state.masterVolume}
        voiceVolume={state.voiceVolume}
        musicVolume={state.musicVolume}
        sfxVolume={state.sfxVolume}
        ambienceVolume={state.ambienceVolume}
        exporting={state.exporting}
        exportProgress={state.exportProgress}
        exportCancelable={state.exporting && state.exportPhase !== 'finalizing'}
        layers={layers}
        clean={clean}
        onSelect={(id) => controller.load(id)}
        onSelectTheme={(id) => controller.setTheme(id)}
        onPlayPause={() => (state.playing ? controller.pause() : controller.play())}
        onRestart={() => controller.restart()}
        onSpeed={(speed) => controller.setSpeed(speed)}
        onToggleAudio={() => controller.setAudioMuted(!state.audioMuted)}
        onMasterVolume={(volume) => controller.setMasterVolume(volume)}
        onVoiceVolume={(volume) => controller.setVoiceVolume(volume)}
        onMusicVolume={(volume) => controller.setMusicVolume(volume)}
        onSfxVolume={(volume) => controller.setSfxVolume(volume)}
        onAmbienceVolume={(volume) => controller.setAmbienceVolume(volume)}
        onExport={() => setExportPanelOpen(true)}
        onCancelExport={() => controller.cancelExport()}
        onToggleLayer={toggleLayer}
        onToggleClean={() => setClean((value) => !value)}
      />

      <CreatorExportPanel
        open={exportPanelOpen}
        options={exportOptions}
        themes={controller.themes}
        duration={state.duration}
        time={state.time}
        production={production}
        exporting={state.exporting}
        exportProgress={state.exportProgress}
        exportPhase={state.exportPhase}
        exportReadyFilename={state.exportReadyFilename}
        exportReadyBytes={state.exportReadyBytes}
        exportResolvedFormat={state.exportResolvedFormat}
        exportDiagnostics={state.exportDiagnostics}
        onOptionsChange={setExportOptions}
        onClose={() => setExportPanelOpen(false)}
        onExport={() => void controller.exportCurrentEpisode(exportOptions)}
        onCancel={() => controller.cancelExport()}
        onDownload={() => controller.downloadLastExport()}
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
          production={production}
          time={state.time}
          onSeek={(time) => controller.seek(time)}
        />
      </main>

      <footer className="scrubber-row">
        <div className="timeline-stack">
          <ShotTrack
            production={production}
            duration={state.duration}
            time={state.time}
            disabled={state.exporting}
            onSeek={(time) => controller.seek(time)}
          />
          <input
            className="scrubber"
            type="range"
            min={0}
            max={state.duration || 0}
            step={0.01}
            value={state.time}
            disabled={state.exporting}
            onChange={(event) => controller.seek(Number(event.target.value))}
          />
        </div>
        <span className="time">
          {state.time.toFixed(1)}s / {state.duration.toFixed(1)}s
        </span>
      </footer>
    </div>
  );
}
