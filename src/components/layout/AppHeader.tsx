import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload, RotateCcw } from 'lucide-react'
import type { ToolRollLayout, ToolRollProject } from '../../generators/tool-roll/types.js'
import { exportFullSvg } from '../../export/exportSvg.js'
import { exportProjectJson } from '../../export/exportProjectJson.js'
import { parseProjectJson } from '../../export/importProjectJson.js'

interface AppHeaderProps {
  project?: ToolRollProject
  layout?: ToolRollLayout | null
  onImport?: (p: ToolRollProject) => void
  onReset?: () => void
}

export function AppHeader({ project, layout, onImport, onReset }: AppHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseProjectJson(reader.result as string)
        onImport?.(parsed)
      } catch (err) {
        alert(`Failed to import project: ${(err as Error).message}`)
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  function handleExport() {
    if (!project) return
    if (layout) {
      exportFullSvg(layout, project)
    } else {
      exportProjectJson(project)
    }
  }

  return (
    <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold tracking-tight">
        StitchSmith — Tool Roll Generator
      </h1>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="outline" size="sm" onClick={handleImportClick} title="Load a project from a previously-exported JSON file.">
          <Upload className="h-4 w-4 mr-1" />
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} title="Download the full pattern as a real-dimension SVG (1 mm = 1 unit, opens in Inkscape/Illustrator at the correct size).">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onReset} title="Replace the current project with the starter sample project (4 wrenches).">
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
    </header>
  )
}
