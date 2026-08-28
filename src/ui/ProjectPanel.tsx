import { useEffect } from 'react'
import { useContent } from '../content/catalog.ts'
import { filled } from '../content/types.ts'
import { useI18n } from '../i18n/context.ts'
import { useAppState } from './AppState.tsx'

export function ProjectPanel() {
  const { selectedProjectId, setSelectedProjectId } = useAppState()
  const { t } = useI18n()
  const { projects } = useContent()
  const project = projects.items.find((item) => item.id === selectedProjectId)

  useEffect(() => {
    if (!project) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProjectId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [project, setSelectedProjectId])

  if (!project) return null

  return (
    <div className="overlay">
      <button
        aria-label={t('project.close_aria')}
        className="overlay__backdrop"
        onClick={() => setSelectedProjectId(null)}
        type="button"
      />
      <div
        aria-labelledby="project-panel-title"
        aria-modal="true"
        className="panel panel--modal"
        role="dialog"
      >
        <p className="eyebrow">PROJECT / {project.id}</p>
        <h2 id="project-panel-title">{project.title}</h2>
        {filled(project.year) ? <p className="meta">{project.year}</p> : null}
        {filled(project.summary) ? <p className="copy">{project.summary}</p> : (
          <p className="hint">{t('hint.summary')}</p>
        )}
        {project.tags.length > 0 ? (
          <ul className="tag-list">
            {project.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        <div className="panel__actions">
          {filled(project.href) ? (
            <a href={project.href} rel="noreferrer" target="_blank">
              {t('project.open')}
            </a>
          ) : null}
          <button onClick={() => setSelectedProjectId(null)} type="button">
            {t('project.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
