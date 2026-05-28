import { useRef, type ReactNode } from 'react';
import { Button } from '../ui/button.js';
import { Download, Upload, RotateCcw } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  onReset?: () => void;
  resetLabel?: string;
  /**
   * Receives the raw JSON text of a file the user picked. Generator decides
   * how to parse and validate. Triggered by the Import button.
   */
  onImport?: (jsonText: string) => void;
  /**
   * Triggered by the Export button. Generator decides what to export
   * (typically project JSON or full SVG).
   */
  onExport?: () => void;
  /** Tooltip for Import — defaults to a sensible message. */
  importTooltip?: string;
  /** Tooltip for Export. */
  exportTooltip?: string;
  banner?: ReactNode;
  settings: ReactNode;
  preview: ReactNode;
  sidebar: ReactNode;
}

/**
 * Universal three-column page layout used by every pattern generator.
 *
 *   ┌──────────┬──────────────────────────┬──────────┐
 *   │ Settings │      Pattern SVG         │  Legend  │
 *   │          │      (dominant)          │  Steps   │
 *   │          │                          │  Export  │
 *   └──────────┴──────────────────────────┴──────────┘
 *
 * On narrow viewports the three columns stack vertically (settings → preview →
 * sidebar). `banner` slot sits above the grid for validation/AK warnings.
 */
export function PatternPageShell({
  title,
  subtitle,
  onReset,
  resetLabel = 'Reset to defaults',
  onImport,
  onExport,
  importTooltip = 'Load a project from a previously-exported JSON file.',
  exportTooltip = 'Download this project as JSON.',
  banner,
  settings,
  preview,
  sidebar,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(reader.result as string);
      } catch (err) {
        alert(`Failed to import project: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow re-import of the same file
  }

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto px-4 py-4 w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onImport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="outline" size="sm" onClick={handleImportClick} title={importTooltip}>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
            </>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} title={exportTooltip}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset} title={resetLabel}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {banner}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px] gap-4 items-start">
        <aside className="space-y-2 min-w-0">{settings}</aside>
        <section className="min-w-0">{preview}</section>
        <aside className="space-y-3 min-w-0">{sidebar}</aside>
      </div>
    </div>
  );
}
