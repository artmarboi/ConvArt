import React from 'react';
import { Folder, FolderOpen, HardDrive, CheckSquare, Square } from 'lucide-react';

export default function RenderPathBar({
  outputDir,
  onChangeOutputDir,
  onOpenOutputDir,
  saveSameFolder,
  onToggleSaveSameFolder,
}) {
  return (
    <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left: Current path */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-accent-subtle border border-accent text-accent shrink-0 glow-accent">
          <Folder className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Куда сохранять (Путь рендера):
          </div>
          <div className="text-xs font-mono text-white truncate max-w-sm md:max-w-xl" title={outputDir}>
            {saveSameFolder ? '📁 В ту же папку, где лежит исходный файл' : outputDir}
          </div>
        </div>
      </div>

      {/* Right: Path actions & Same-Folder toggle */}
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        {/* Toggle save next to original */}
        <button
          type="button"
          onClick={onToggleSaveSameFolder}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
            saveSameFolder
              ? 'bg-accent-subtle border-accent text-accent'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
          }`}
          title="Сохранять сжатый файл в ту же директорию, где находится исходник"
        >
          {saveSameFolder ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          <span>Рядом с оригиналом</span>
        </button>

        {!saveSameFolder && (
          <>
            <button
              type="button"
              onClick={onChangeOutputDir}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-accent-subtle hover:border-accent hover:text-accent border border-white/10 text-slate-200 transition cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Выбрать папку</span>
            </button>

            <button
              type="button"
              onClick={onOpenOutputDir}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Открыть в проводнике"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
