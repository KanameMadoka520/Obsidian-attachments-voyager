import { useEffect, useState } from 'react'
import { open } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import { useLang } from '../App'
import MigratePlanTable from '../components/MigratePlanTable'
import OperationHistoryPanel from '../components/OperationHistoryPanel'
import WorkLogPanel from '../components/WorkLogPanel'
import type { ConflictPolicy, OperationTask, RuntimeLogLine } from '../types'

interface MigrateSummary {
  taskId: string
  movedNotes: number
  movedAssets: number
}

interface FlattenPlanItem {
  sourcePath: string
  targetPath: string
}

interface FlattenAttachmentsPlan {
  destinationDir: string
  sourceFolders: string[]
  items: FlattenPlanItem[]
}

interface FlattenAttachmentsSummary {
  taskId: string
  destinationDir: string
  movedFiles: number
  removedFolders: number
  skippedFiles: number
}

interface PageMessage {
  kind: 'success' | 'error' | 'info'
  text: string
}

function buildAttachmentsPreviewPath(rootDir: string) {
  const trimmed = rootDir.trim()
  if (!trimmed) return ''
  if (trimmed.endsWith('/') || trimmed.endsWith('\\')) {
    return `${trimmed}attachments`
  }
  const separator = trimmed.includes('\\') && !trimmed.includes('/') ? '\\' : '/'
  return `${trimmed}${separator}attachments`
}

interface MigratePageProps {
  conflictPolicy: ConflictPolicy
}

function MigratePage({ conflictPolicy }: MigratePageProps) {
  const tr = useLang()
  const [notePath, setNotePath] = useState('')
  const [targetDir, setTargetDir] = useState('')
  const [previewItems, setPreviewItems] = useState<string[]>([])
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [executing, setExecuting] = useState(false)
  const [flattenRootDir, setFlattenRootDir] = useState('')
  const [flattenPreviewItems, setFlattenPreviewItems] = useState<string[]>([])
  const [flattenMessage, setFlattenMessage] = useState<PageMessage | null>(null)
  const [flattenExecuting, setFlattenExecuting] = useState(false)
  const [flattenDestination, setFlattenDestination] = useState('')
  const [logs, setLogs] = useState<RuntimeLogLine[]>([])
  const [tasks, setTasks] = useState<OperationTask[]>([])

  const refreshOps = async () => {
    try {
      const [fetchedLogs, fetchedTasks] = await Promise.all([
        invoke<RuntimeLogLine[]>('get_runtime_logs', { limit: 200 }),
        invoke<OperationTask[]>('list_operation_history'),
      ])
      setLogs(fetchedLogs)
      setTasks(fetchedTasks.slice().reverse())
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshOps()
    const timer = setInterval(refreshOps, 3000)
    return () => clearInterval(timer)
  }, [])

  const invalidateMigrationPreview = () => {
    setPreviewItems([])
    setMessage(null)
  }

  const invalidateFlattenPreview = (nextRootDir = flattenRootDir) => {
    setFlattenPreviewItems([])
    setFlattenMessage(null)
    setFlattenDestination(buildAttachmentsPreviewPath(nextRootDir))
  }

  useEffect(() => {
    invalidateMigrationPreview()
    invalidateFlattenPreview(flattenRootDir)
  }, [conflictPolicy])

  const pickTargetDir = async () => {
    const selected = await open({ directory: true, multiple: false })
    if (typeof selected === 'string') {
      setTargetDir(selected)
      invalidateMigrationPreview()
    }
  }

  const pickFlattenRootDir = async () => {
    const selected = await open({ directory: true, multiple: false })
    if (typeof selected === 'string') {
      setFlattenRootDir(selected)
      invalidateFlattenPreview(selected)
    }
  }

  const previewPlan = () => {
    if (!notePath.trim() || !targetDir.trim()) {
      setPreviewItems([])
      setMessage({ kind: 'error', text: tr.migrateNoPathError })
      return
    }

    setPreviewItems([`${notePath.trim()} -> ${targetDir.trim()}`])
    setMessage({ kind: 'success', text: tr.migratePreviewGenerated })
  }

  const executeMigration = async (policy: ConflictPolicy = conflictPolicy) => {
    if (previewItems.length === 0) {
      setMessage({ kind: 'error', text: tr.migrateNoPreviewError })
      return
    }

    setExecuting(true)
    try {
      const summary = await invoke<MigrateSummary>('execute_migration', {
        notePath: notePath.trim(),
        targetDir: targetDir.trim(),
        policy,
      })
      setMessage({
        kind: 'success',
        text: tr.migrateComplete
          .replace('{taskId}', summary.taskId)
          .replace('{movedNotes}', String(summary.movedNotes))
          .replace('{movedAssets}', String(summary.movedAssets)),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('CONFLICT')) {
        const overwrite = window.confirm(tr.migrateConflictPrompt)
        await executeMigration(overwrite ? 'overwriteAll' : 'renameAll')
        return
      }
      setMessage({ kind: 'error', text: tr.migrateFailed.replace('{message}', msg) })
    } finally {
      setExecuting(false)
      await refreshOps()
    }
  }

  const previewFlattenPlan = async () => {
    if (!flattenRootDir.trim()) {
      setFlattenPreviewItems([])
      setFlattenDestination('')
      setFlattenMessage({ kind: 'error', text: tr.flattenNoRootError })
      return
    }

    try {
      const plan = await invoke<FlattenAttachmentsPlan>('preview_flatten_attachments', {
        rootDir: flattenRootDir.trim(),
        policy: conflictPolicy,
      })
      setFlattenDestination(plan.destinationDir)

      const planItems = [
        ...plan.items.map((item) => `[MOVE] ${item.sourcePath} -> ${item.targetPath}`),
        ...plan.sourceFolders.map((folder) => `[REMOVE EMPTY DIR] ${folder}`),
      ]
      setFlattenPreviewItems(planItems)

      if (plan.sourceFolders.length === 0) {
        setFlattenMessage({ kind: 'info', text: tr.flattenPreviewEmpty })
        return
      }

      setFlattenMessage({
        kind: 'success',
        text: tr.flattenPreviewGenerated
          .replace('{folders}', String(plan.sourceFolders.length))
          .replace('{files}', String(plan.items.length)),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setFlattenPreviewItems([])
      setFlattenDestination(buildAttachmentsPreviewPath(flattenRootDir))
      setFlattenMessage({ kind: 'error', text: tr.flattenPreviewFailed.replace('{message}', msg) })
    }
  }

  const executeFlatten = async (policy: ConflictPolicy = conflictPolicy) => {
    if (flattenPreviewItems.length === 0) {
      setFlattenMessage({ kind: 'error', text: tr.flattenNoPreviewError })
      return
    }

    setFlattenExecuting(true)
    try {
      const summary = await invoke<FlattenAttachmentsSummary>('flatten_attachments', {
        rootDir: flattenRootDir.trim(),
        policy,
      })
      setFlattenDestination(summary.destinationDir)
      setFlattenMessage({
        kind: 'success',
        text: tr.flattenComplete
          .replace('{taskId}', summary.taskId)
          .replace('{movedFiles}', String(summary.movedFiles))
          .replace('{removedFolders}', String(summary.removedFolders))
          .replace('{skippedFiles}', String(summary.skippedFiles)),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('CONFLICT')) {
        const overwrite = window.confirm(tr.flattenConflictPrompt)
        await executeFlatten(overwrite ? 'overwriteAll' : 'renameAll')
        return
      }
      setFlattenMessage({ kind: 'error', text: tr.flattenFailed.replace('{message}', msg) })
    } finally {
      setFlattenExecuting(false)
      await refreshOps()
    }
  }

  return (
    <div className="page-wrapper">
      <section className="card">
        <h2 className="card-title">{tr.migrateWorkspaceTitle}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          {tr.migrateOverviewGuide}
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
          {tr.migrateActionGuide}
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">{tr.migrateConfigTitle}</h2>

        <div className="input-group">
          <label htmlFor="note-path" className="input-label">{tr.migrateSelectNote}</label>
          <input
            id="note-path"
            className="input-field"
            value={notePath}
            onChange={(e) => {
              setNotePath(e.target.value)
              invalidateMigrationPreview()
            }}
            placeholder={tr.migrateNotePlaceholder}
          />
        </div>

        <div className="input-group">
          <label htmlFor="target-dir" className="input-label">{tr.migrateTargetDir}</label>
          <input
            id="target-dir"
            className="input-field"
            value={targetDir}
            onChange={(e) => {
              setTargetDir(e.target.value)
              invalidateMigrationPreview()
            }}
            placeholder={tr.migrateTargetPlaceholder}
          />
          <button type="button" className="btn btn-secondary" onClick={pickTargetDir}>
            {tr.migratePickDir}
          </button>
        </div>

        <div className="input-group" style={{ marginTop: '24px' }}>
          <button type="button" className="btn btn-secondary" onClick={previewPlan}>
            {tr.migratePreviewPlan}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => executeMigration()} disabled={executing}>
            {executing ? tr.migrateExecuting : tr.migrateExecute}
          </button>
        </div>

        {message && (
          <div className={`alert alert-${message.kind}`} role="status">
            {message.text}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">{tr.migrateExplainTitle}</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {tr.migrateExplainBody}
        </p>
      </section>

      <MigratePlanTable items={previewItems} />

      <section className="card">
        <h2 className="card-title">{tr.flattenTitle}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          {tr.flattenOverviewGuide}
        </p>
        <ol style={{ color: 'var(--text-muted)', margin: '0 0 16px 18px', lineHeight: 1.6 }}>
          <li>{tr.flattenStepPick}</li>
          <li>{tr.flattenStepCollect}</li>
          <li>{tr.flattenStepMerge}</li>
          <li>{tr.flattenStepCleanup}</li>
          <li>{tr.flattenStepNext}</li>
        </ol>

        <div className="input-group">
          <label htmlFor="flatten-root-dir" className="input-label">{tr.flattenSourceDir}</label>
          <input
            id="flatten-root-dir"
            className="input-field"
            value={flattenRootDir}
            onChange={(e) => {
              const value = e.target.value
              setFlattenRootDir(value)
              invalidateFlattenPreview(value)
            }}
            placeholder={tr.flattenSourcePlaceholder}
          />
          <button type="button" className="btn btn-secondary" onClick={pickFlattenRootDir}>
            {tr.flattenPickDir}
          </button>
        </div>

        <div className="input-group">
          <label htmlFor="flatten-dest-dir" className="input-label">{tr.flattenDestinationDir}</label>
          <input
            id="flatten-dest-dir"
            className="input-field"
            value={flattenDestination}
            readOnly
            placeholder={tr.flattenDestinationPlaceholder}
          />
        </div>

        <div className="input-group" style={{ marginTop: '24px' }}>
          <button type="button" className="btn btn-secondary" onClick={previewFlattenPlan}>
            {tr.flattenPreviewPlan}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => executeFlatten()} disabled={flattenExecuting}>
            {flattenExecuting ? tr.flattenExecuting : tr.flattenExecute}
          </button>
        </div>

        {flattenMessage && (
          <div className={`alert alert-${flattenMessage.kind}`} role="status">
            {flattenMessage.text}
          </div>
        )}
      </section>

      <MigratePlanTable
        items={flattenPreviewItems}
        title={tr.flattenPlanTitle}
        columnLabel={tr.flattenPlanColMapping}
        emptyText={tr.flattenPlanEmpty}
      />
      <WorkLogPanel logs={logs} />
      <OperationHistoryPanel tasks={tasks} />
    </div>
  )
}

export default MigratePage
