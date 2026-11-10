import React from 'react';
import { Play, Trash2, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '../constants/presets';

export default function BatchBar({
  queue,
  onConvertAll,
  onClearCompleted,
  isProcessingBatch,
}) {
  const pendingItems = queue.filter((i) => i.status === 'idle');
  const completedItems = queue.filter((i) => i.status === 'completed');

  const totalOriginalBytes = queue.reduce((sum, item) => sum + (item.size || 0), 0);

  return (
    <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-[#080b13]/95 backdrop-blur-md z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Summary Stats (Clean without render path, which is in Settings) */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
              В очереди: <strong className="text-accent">{pendingItems.length}</strong> из {queue.length} файлов
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Общий объём: {formatBytes(totalOriginalBytes)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {completedItems.length > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              title="Удалить выполненные из списка"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить готовые ({completedItems.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onConvertAll}
            disabled={pendingItems.length === 0 || isProcessingBatch}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              pendingItems.length === 0 || isProcessingBatch
                ? 'opacity-40 cursor-not-allowed bg-white/10 text-slate-400'
                : 'btn-accent transform hover:-translate-y-0.5'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isProcessingBatch ? 'Конвертируется...' : `Сжать всё (${pendingItems.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
